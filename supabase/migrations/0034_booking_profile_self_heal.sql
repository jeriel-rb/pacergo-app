create or replace function ensure_user_profile_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, photo_url)
  select
    au.id,
    left(
      coalesce(
        au.raw_user_meta_data ->> 'full_name',
        au.raw_user_meta_data ->> 'name',
        split_part(au.email, '@', 1),
        'User'
      ),
      80
    ),
    au.raw_user_meta_data ->> 'avatar_url'
  from auth.users au
  where au.id = p_user_id
  on conflict (id) do nothing;
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

  perform ensure_user_profile_row(v_seeker);

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

grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
