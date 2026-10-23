-- Booking + payment + chat policy
--
-- A client sends a request; the companion has 24 hours to accept it.  A paid
-- booking cannot be created until that acceptance has moved it to
-- pending_payment.  Messaging is available only while that accepted booking
-- is active (including its payment window), and stops on cancellation/expiry.

create or replace function create_booking(
  p_companion_id uuid,
  p_offering_id uuid,
  p_scheduled_start timestamptz,
  p_duration_min int,
  p_location_name text,
  p_seeker_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_seeker uuid := auth.uid(); v_id uuid; o record; seeker_u record; comp_u record; v_constraint text;
begin
  if v_seeker is null then raise exception 'not authenticated'; end if;
  perform ensure_user_profile_row(v_seeker);
  if v_seeker = p_companion_id then raise exception 'cannot book yourself'; end if;
  if char_length(coalesce(p_seeker_note, '')) > 2000 then raise exception 'note too long'; end if;
  if char_length(coalesce(p_location_name, '')) > 200 then raise exception 'location too long'; end if;
  if p_scheduled_start is not null and p_scheduled_start < now() - interval '1 hour' then raise exception 'cannot book a time in the past'; end if;
  if exists (select 1 from blocks where (blocker_id = v_seeker and blocked_id = p_companion_id) or (blocker_id = p_companion_id and blocked_id = v_seeker)) then raise exception 'booking not available'; end if;
  select lo.tier, lo.price_ntd, lo.is_free, lo.session_minutes, a.slug as activity_slug into o
  from listing_offerings lo join companion_listings cl on cl.id = lo.listing_id join activities a on a.id = lo.activity_id
  where lo.id = p_offering_id and cl.user_id = p_companion_id and cl.status = 'active';
  if not found then raise exception 'offering not available'; end if;
  select display_name, photo_url into seeker_u from users where id = v_seeker;
  select display_name, photo_url into comp_u from users where id = p_companion_id;
  begin
    insert into bookings (seeker_id, companion_id, offering_id, activity_slug, tier, status, scheduled_start, duration_min, location_name, agreed_price, is_free, seeker_note, seeker_name, seeker_photo, companion_name, companion_photo)
    values (v_seeker, p_companion_id, p_offering_id, o.activity_slug, o.tier, 'requested', p_scheduled_start,
      least(greatest(coalesce(o.session_minutes, 60), 15), 480), p_location_name, o.price_ntd, o.is_free,
      p_seeker_note, seeker_u.display_name, seeker_u.photo_url, comp_u.display_name, comp_u.photo_url)
    returning id into v_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'bookings_one_open_per_pair_idx' then raise exception 'you already have an open booking with this companion'; end if;
    raise;
  end;
  return v_id;
end $$;

create or replace function accept_booking(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings
  set status = case when is_free or agreed_price <= 0 then 'accepted'::booking_status else 'pending_payment'::booking_status end
  where id = p_id and companion_id = auth.uid() and status = 'requested';
  if not found then raise exception 'accept not allowed'; end if;
end $$;

create or replace function expire_stale_booking_requests()
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'expired'
  where status = 'requested' and created_at <= now() - interval '24 hours';
end $$;

select cron.schedule('expire-stale-booking-requests', '*/15 * * * *',
  $$select expire_stale_booking_requests()$$);

-- Defence in depth: checkout RPCs cannot create a payment attempt before the
-- companion has accepted the request. This covers NewebPay and simulated flows.
create or replace function require_accepted_booking_for_payment()
returns trigger language plpgsql set search_path = public as $$
declare v_status booking_status;
begin
  if new.status = 'created' then
    select status into v_status from bookings where id = new.booking_id for key share;
    if v_status <> 'pending_payment' then raise exception 'payment_booking_not_payable'; end if;
  end if;
  return new;
end $$;

drop trigger if exists payments_require_accepted_booking on payments;
create trigger payments_require_accepted_booking
  before insert on payments for each row execute function require_accepted_booking_for_payment();

create or replace function has_booking_with(p_other_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from bookings
    where ((seeker_id = auth.uid() and companion_id = p_other_id)
        or (seeker_id = p_other_id and companion_id = auth.uid()))
      and status in ('pending_payment', 'payment_processing', 'payment_failed', 'accepted')
  );
$$;

create or replace function send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_other uuid; v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty message'; end if;
  if char_length(p_body) > 4000 then raise exception 'message too long'; end if;
  select case when participant_a = v_uid then participant_b else participant_a end into v_other
  from conversations where id = p_conversation_id and (participant_a = v_uid or participant_b = v_uid);
  if v_other is null then raise exception 'not a participant'; end if;
  if not has_booking_with(v_other) then raise exception 'messaging unavailable'; end if;
  if exists (select 1 from blocks where (blocker_id = v_uid and blocked_id = v_other) or (blocker_id = v_other and blocked_id = v_uid)) then raise exception 'messaging unavailable'; end if;
  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, v_uid, btrim(p_body)) returning id into v_id;
  return v_id;
end $$;

create or replace function conversation_header(p_conversation_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'id', cv.id,
    'other_id', case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end,
    'other_name', case when cv.participant_a = auth.uid() then cv.b_name else cv.a_name end,
    'other_photo', case when cv.participant_a = auth.uid() then cv.b_photo else cv.a_photo end,
    'can_message', has_booking_with(case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end)
  ) from conversations cv
  where cv.id = p_conversation_id and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid());
$$;

revoke all on function require_accepted_booking_for_payment() from public, anon, authenticated;
revoke all on function expire_stale_booking_requests() from public, anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text), accept_booking(uuid), has_booking_with(uuid), send_message(uuid, text), conversation_header(uuid) to authenticated;

-- Record a successful NewebPay refund initiated by the server.  The payment
-- gateway call deliberately happens in the web server, never in SQL: its keys
-- must not be exposed to a client or stored in the database.
create or replace function record_newebpay_refund(
  p_payment_id uuid,
  p_provider_trade_no text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay payments%rowtype;
begin
  select * into pay
  from payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'payment_order_not_found'; end if;
  if pay.provider <> 'newebpay'
     or pay.status <> 'paid'
     or pay.refund_status <> 'refund_requested'
     or nullif(pay.provider_trade_no, '') is distinct from nullif(p_provider_trade_no, '') then
    raise exception 'payment_refund_not_recordable';
  end if;

  update payments
  set refund_status = 'refunded',
      settlement_eligibility_status = 'ineligible'
  where id = pay.id;

  insert into payment_status_events
    (payment_id, event_type, from_value, to_value, reason_note, actor_id)
  values
    (pay.id, 'newebpay_refund_completed', 'refund_requested', 'refunded',
     'Automatic refund after companion cancellation', null);
end $$;

revoke all on function record_newebpay_refund(uuid, text) from public, anon, authenticated;
grant execute on function record_newebpay_refund(uuid, text) to service_role;
