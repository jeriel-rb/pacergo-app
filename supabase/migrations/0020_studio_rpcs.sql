-- Trainer backend (陪練師後台): manage your own listing, offerings, availability.

-- The caller's listing bundle (listing + offerings + availability + flag).
create or replace function my_listing()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'is_companion', (select is_companion from users where id = auth.uid()),
    'listing', (
      select to_jsonb(l) from (
        select id, headline, bio_long, served_area, status, rating_avg, rating_count
        from companion_listings where user_id = auth.uid()
      ) l
    ),
    'offerings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'activity', a.slug, 'tier', o.tier,
        'price_ntd', o.price_ntd, 'is_free', o.is_free,
        'session_minutes', o.session_minutes
      ) order by o.tier, o.price_ntd), '[]'::jsonb)
      from listing_offerings o
      join activities a on a.id = o.activity_id
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = auth.uid()
    ),
    'availability', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', av.id, 'weekday', av.weekday,
        'start_minute', av.start_minute, 'end_minute', av.end_minute
      ) order by av.weekday, av.start_minute), '[]'::jsonb)
      from availability av where av.user_id = auth.uid()
    )
  );
$$;

-- Create or update the caller's listing (marks them a companion).
create or replace function upsert_my_listing(
  p_headline text,
  p_bio_long text,
  p_served_area text,
  p_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_status not in ('draft', 'active', 'paused') then
    raise exception 'invalid status';
  end if;

  update users set is_companion = true where id = v_uid;

  insert into companion_listings (user_id, headline, bio_long, served_area, status)
  values (v_uid, p_headline, p_bio_long, p_served_area, p_status)
  on conflict (user_id) do update set
    headline = excluded.headline,
    bio_long = excluded.bio_long,
    served_area = excluded.served_area,
    status = excluded.status
  returning id into v_id;

  return v_id;
end;
$$;

-- Add an offering to the caller's listing.
create or replace function add_offering(
  p_activity_slug text,
  p_tier tier_level,
  p_price_ntd int,
  p_is_free boolean,
  p_session_minutes int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing uuid;
  v_activity uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_listing from companion_listings where user_id = v_uid;
  if not found then raise exception 'create your listing first'; end if;
  select id into v_activity from activities where slug = p_activity_slug;
  if not found then raise exception 'unknown activity'; end if;

  insert into listing_offerings (listing_id, activity_id, tier, price_ntd, is_free, session_minutes)
  values (
    v_listing, v_activity, p_tier,
    greatest(0, coalesce(p_price_ntd, 0)),
    coalesce(p_is_free, false),
    coalesce(p_session_minutes, 60)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Remove one of the caller's offerings.
create or replace function remove_offering(p_offering_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from listing_offerings o
  using companion_listings cl
  where o.id = p_offering_id
    and o.listing_id = cl.id
    and cl.user_id = auth.uid();
$$;

-- Add a weekly availability slot for the caller.
create or replace function add_availability(
  p_weekday int,
  p_start_minute int,
  p_end_minute int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_weekday < 0 or p_weekday > 6 then raise exception 'invalid weekday'; end if;
  if p_end_minute <= p_start_minute then raise exception 'invalid time range'; end if;

  insert into availability (user_id, weekday, start_minute, end_minute)
  values (v_uid, p_weekday, p_start_minute, p_end_minute)
  returning id into v_id;
  return v_id;
end;
$$;

-- Remove one of the caller's availability slots.
create or replace function remove_availability(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from availability where id = p_id and user_id = auth.uid();
$$;

grant execute on function my_listing() to authenticated;
grant execute on function upsert_my_listing(text, text, text, text) to authenticated;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
grant execute on function remove_offering(uuid) to authenticated;
grant execute on function add_availability(int, int, int) to authenticated;
grant execute on function remove_availability(uuid) to authenticated;
