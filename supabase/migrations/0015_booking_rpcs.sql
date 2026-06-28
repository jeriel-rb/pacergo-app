-- Booking creation + reads via RPCs (web). The FSM transitions
-- (accept/decline/cancel/complete) already exist from 0004.

-- Offerings for a companion (with ids) so the booking form can pick one.
create or replace function companion_offerings(p_companion_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lo.id,
        'activity', a.slug,
        'tier', lo.tier,
        'price_ntd', lo.price_ntd,
        'is_free', lo.is_free,
        'session_minutes', lo.session_minutes
      )
      order by lo.tier asc, lo.price_ntd asc
    ),
    '[]'::jsonb
  )
  from listing_offerings lo
  join companion_listings cl on cl.id = lo.listing_id
  join activities a on a.id = lo.activity_id
  where cl.user_id = p_companion_id and cl.status = 'active';
$$;

-- Create a booking request as the signed-in seeker. Denormalizes the
-- activity/tier/price from the offering and names/photos from both users.
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
    v_seeker, p_companion_id, p_offering_id, o.activity_slug, o.tier, 'requested',
    p_scheduled_start, coalesce(p_duration_min, o.session_minutes), p_location_name,
    o.price_ntd, o.is_free, p_seeker_note,
    seeker_u.display_name, seeker_u.photo_url,
    comp_u.display_name, comp_u.photo_url
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- All bookings the caller is part of (as seeker or companion), newest first.
create or replace function my_bookings()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc), '[]'::jsonb)
  from (
    select id, seeker_id, companion_id, offering_id, activity_slug, tier, status,
           scheduled_start, duration_min, location_name, agreed_price, is_free,
           seeker_note, seeker_name, seeker_photo, companion_name, companion_photo,
           completed_at, created_at
    from bookings
    where seeker_id = auth.uid() or companion_id = auth.uid()
  ) b;
$$;

-- A single booking the caller is part of.
create or replace function booking_detail(p_id uuid)
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
           seeker_note, seeker_name, seeker_photo, companion_name, companion_photo,
           completed_at, created_at
    from bookings
    where id = p_id and (seeker_id = auth.uid() or companion_id = auth.uid())
  ) b;
$$;

grant execute on function companion_offerings(uuid) to anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function my_bookings() to authenticated;
grant execute on function booking_detail(uuid) to authenticated;
