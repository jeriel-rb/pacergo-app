do $$ begin
  create type payment_status as enum
    ('created', 'redirected', 'processing', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  provider text not null default 'newebpay',
  merchant_order_no text not null,
  provider_trade_no text,
  amount int not null check (amount > 0),
  currency text not null default 'TWD',
  status payment_status not null default 'created',
  provider_status text,
  payment_method text,
  response_code text,
  response_message text,
  payment_instructions jsonb not null default '{}'::jsonb,
  initiated_at timestamptz not null default now(),
  returned_at timestamptz,
  notified_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_order_no),
  check (provider = 'newebpay'),
  check (currency = 'TWD')
);

create index if not exists payments_booking_idx on payments (booking_id, created_at desc);
create index if not exists payments_user_idx on payments (user_id, created_at desc);
create index if not exists payments_provider_trade_no_idx on payments (provider_trade_no);
create index if not exists payments_status_idx on payments (status);

create unique index if not exists payments_one_paid_per_booking_idx
  on payments (booking_id)
  where status = 'paid';

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

drop policy if exists "payments owner read" on payments;
create policy "payments owner read"
  on payments for select to authenticated
  using (user_id = auth.uid());

create or replace function payment_review(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(b)
  from (
    select id, seeker_id, companion_id, offering_id, activity_slug, tier, status,
           scheduled_start, duration_min, location_name, agreed_price, is_free,
           seeker_name, companion_name, created_at
    from bookings
    where id = p_booking_id and seeker_id = auth.uid()
  ) b;
$$;

create or replace function payment_detail(p_payment_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'merchant_order_no', p.merchant_order_no,
    'provider_trade_no', p.provider_trade_no,
    'amount', p.amount,
    'currency', p.currency,
    'status', p.status,
    'provider_status', p.provider_status,
    'payment_method', p.payment_method,
    'payment_instructions', p.payment_instructions,
    'initiated_at', p.initiated_at,
    'returned_at', p.returned_at,
    'notified_at', p.notified_at,
    'paid_at', p.paid_at,
    'failed_at', p.failed_at,
    'expired_at', p.expired_at,
    'booking', jsonb_build_object(
      'id', b.id,
      'status', b.status,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name
    )
  )
  from payments p
  join bookings b on b.id = p.booking_id
  where p.id = p_payment_id and p.user_id = auth.uid();
$$;

create or replace function create_newebpay_payment_attempt(
  p_booking_id uuid,
  p_merchant_order_no text,
  p_amount int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  existing record;
  inserted payments%rowtype;
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into b
  from bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'payment_booking_not_found'; end if;
  if b.seeker_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if b.is_free or b.agreed_price <= 0 then raise exception 'payment_invalid_amount'; end if;
  if b.agreed_price <> p_amount then raise exception 'payment_amount_mismatch'; end if;
  if b.status in ('cancelled', 'completed', 'expired', 'declined') then
    raise exception 'payment_booking_not_payable';
  end if;
  if exists (
    select 1 from payments
    where booking_id = p_booking_id and status = 'paid'
  ) then
    raise exception 'payment_already_paid';
  end if;

  select * into existing
  from payments
  where booking_id = p_booking_id
    and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at > now() - interval '30 minutes'
  order by created_at desc
  limit 1
  for update;

  if found then raise exception 'payment_attempt_in_progress'; end if;

  insert into payments (
    booking_id, user_id, provider, merchant_order_no, amount, currency, status
  ) values (
    p_booking_id, v_uid, 'newebpay', p_merchant_order_no, p_amount, 'TWD', 'created'
  )
  returning * into inserted;

  update bookings
  set status = 'payment_processing'
  where id = p_booking_id
    and status not in ('cancelled', 'completed', 'expired', 'declined');

  return jsonb_build_object(
    'id', inserted.id,
    'booking_id', inserted.booking_id,
    'merchant_order_no', inserted.merchant_order_no,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'status', inserted.status,
    'booking', jsonb_build_object(
      'id', b.id,
      'seeker_id', b.seeker_id,
      'companion_id', b.companion_id,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name
    )
  );
end $$;

create or replace function mark_newebpay_payment_redirected(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
  set status = 'redirected'
  where id = p_payment_id
    and user_id = auth.uid()
    and status = 'created';

  if not found then raise exception 'payment_redirect_not_allowed'; end if;
end $$;

create or replace function observe_newebpay_return(
  p_merchant_order_no text,
  p_provider_trade_no text,
  p_provider_status text,
  p_payment_method text,
  p_response_code text,
  p_response_message text,
  p_instructions jsonb,
  p_observed_status payment_status
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments%rowtype;
begin
  select * into p
  from payments
  where merchant_order_no = p_merchant_order_no
  for update;

  if not found then raise exception 'payment_order_not_found'; end if;

  update payments
  set returned_at = coalesce(returned_at, now()),
      provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
      provider_status = coalesce(nullif(p_provider_status, ''), provider_status),
      payment_method = coalesce(nullif(p_payment_method, ''), payment_method),
      response_code = coalesce(nullif(p_response_code, ''), response_code),
      response_message = left(coalesce(nullif(p_response_message, ''), response_message, ''), 200),
      payment_instructions = case when p_instructions = '{}'::jsonb then payment_instructions else p_instructions end,
      status = case
        when status = 'paid' then status
        when p_observed_status in ('failed', 'cancelled', 'expired') then p_observed_status
        when p_observed_status = 'awaiting_payment' then 'awaiting_payment'
        else 'processing'
      end,
      failed_at = case when p_observed_status in ('failed', 'cancelled') then coalesce(failed_at, now()) else failed_at end,
      expired_at = case when p_observed_status = 'expired' then coalesce(expired_at, now()) else expired_at end
  where id = p.id;

  update bookings
  set status = case
    when status in ('cancelled', 'completed') then status
    when p_observed_status in ('failed', 'cancelled', 'expired') then 'pending_payment'
    else 'payment_processing'
  end
  where id = p.booking_id;

  return p.id;
end $$;

create or replace function apply_newebpay_notification(
  p_merchant_order_no text,
  p_amount int,
  p_provider_trade_no text,
  p_provider_status text,
  p_payment_method text,
  p_response_code text,
  p_response_message text,
  p_instructions jsonb,
  p_next_status payment_status
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments%rowtype;
begin
  select * into p
  from payments
  where merchant_order_no = p_merchant_order_no
  for update;

  if not found then raise exception 'payment_order_not_found'; end if;
  if p.amount <> p_amount then raise exception 'payment_amount_mismatch'; end if;

  if p.status = 'paid' then
    update payments
    set notified_at = coalesce(notified_at, now()),
        provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
        provider_status = coalesce(nullif(p_provider_status, ''), provider_status)
    where id = p.id;
    return p.id;
  end if;

  update payments
  set notified_at = coalesce(notified_at, now()),
      provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
      provider_status = coalesce(nullif(p_provider_status, ''), provider_status),
      payment_method = coalesce(nullif(p_payment_method, ''), payment_method),
      response_code = coalesce(nullif(p_response_code, ''), response_code),
      response_message = left(coalesce(nullif(p_response_message, ''), response_message, ''), 200),
      payment_instructions = case when p_instructions = '{}'::jsonb then payment_instructions else p_instructions end,
      status = p_next_status,
      paid_at = case when p_next_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      failed_at = case when p_next_status in ('failed', 'cancelled') then coalesce(failed_at, now()) else failed_at end,
      expired_at = case when p_next_status = 'expired' then coalesce(expired_at, now()) else expired_at end
  where id = p.id;

  update bookings
  set status = case
    when status in ('cancelled', 'completed') then status
    when p_next_status = 'paid' then 'accepted'
    when p_next_status in ('failed', 'cancelled', 'expired') then 'pending_payment'
    else 'payment_processing'
  end
  where id = p.booking_id;

  return p.id;
end $$;

create or replace function create_booking(
  p_companion_id uuid,
  p_offering_id uuid,
  p_scheduled_start timestamptz,
  p_duration_min int,
  p_location_name text,
  p_seeker_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeker uuid := auth.uid();
  v_id uuid;
  o record;
  seeker_u record;
  comp_u record;
begin
  if v_seeker is null then raise exception 'not authenticated'; end if;
  if v_seeker = p_companion_id then raise exception 'cannot book yourself'; end if;
  if char_length(coalesce(p_seeker_note, '')) > 2000 then raise exception 'note too long'; end if;
  if char_length(coalesce(p_location_name, '')) > 200 then raise exception 'location too long'; end if;
  if p_scheduled_start is not null and p_scheduled_start < now() - interval '1 hour' then
    raise exception 'cannot book a time in the past';
  end if;
  if exists (
    select 1 from blocks
    where (blocker_id = v_seeker and blocked_id = p_companion_id)
       or (blocker_id = p_companion_id and blocked_id = v_seeker)
  ) then
    raise exception 'booking not available';
  end if;
  if exists (
    select 1 from bookings
    where seeker_id = v_seeker
      and companion_id = p_companion_id
      and status in ('requested', 'pending_payment', 'payment_processing', 'payment_failed')
  ) then
    raise exception 'you already have an open booking with this companion';
  end if;

  select lo.tier, lo.price_ntd, lo.is_free, lo.session_minutes, a.slug as activity_slug
    into o
  from listing_offerings lo
  join companion_listings cl on cl.id = lo.listing_id
  join activities a on a.id = lo.activity_id
  where lo.id = p_offering_id
    and cl.user_id = p_companion_id
    and cl.status = 'active';
  if not found then raise exception 'offering not available'; end if;

  select display_name, photo_url into seeker_u from users where id = v_seeker;
  select display_name, photo_url into comp_u from users where id = p_companion_id;

  insert into bookings (
    seeker_id, companion_id, offering_id, activity_slug, tier, status,
    scheduled_start, duration_min, location_name, agreed_price, is_free,
    seeker_note, seeker_name, seeker_photo, companion_name, companion_photo
  ) values (
    v_seeker,
    p_companion_id,
    p_offering_id,
    o.activity_slug,
    o.tier,
    case when o.is_free or o.price_ntd <= 0 then 'requested'::booking_status else 'pending_payment'::booking_status end,
    p_scheduled_start,
    least(greatest(coalesce(p_duration_min, o.session_minutes), 15), 480),
    p_location_name,
    o.price_ntd,
    o.is_free,
    p_seeker_note,
    seeker_u.display_name,
    seeker_u.photo_url,
    comp_u.display_name,
    comp_u.photo_url
  )
  returning id into v_id;

  return v_id;
end $$;

create or replace function cancel_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update bookings
  set status = 'cancelled', cancelled_by = auth.uid()
  where id = p_id
    and (seeker_id = auth.uid() or companion_id = auth.uid())
    and status in ('requested', 'pending_payment', 'payment_failed', 'accepted');

  if not found then raise exception 'cancel not allowed'; end if;
end $$;

grant execute on function payment_review(uuid) to authenticated;
grant execute on function payment_detail(uuid) to authenticated;
grant execute on function create_newebpay_payment_attempt(uuid, text, int) to authenticated;
grant execute on function mark_newebpay_payment_redirected(uuid) to authenticated;
grant execute on function observe_newebpay_return(text, text, text, text, text, text, jsonb, payment_status) to service_role;
grant execute on function apply_newebpay_notification(text, int, text, text, text, text, text, jsonb, payment_status) to service_role;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;
