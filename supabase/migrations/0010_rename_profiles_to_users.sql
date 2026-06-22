-- Rename the public.profiles table to public.users.
--
-- FK constraints, indexes, RLS policies, and triggers attached to the table
-- follow the rename automatically. Functions reference the table BY NAME in
-- their bodies, so they must be recreated. (FK *column* names like profile_id
-- are intentionally kept; only the table name changes.)
--
-- Note: this coexists with auth.users (different schema) — public.users holds
-- app profile data, 1:1 with auth.users via the handle_new_user trigger.

alter table profiles rename to users;

-- Tidy the auto-followed object names.
alter trigger profiles_set_updated_at on users rename to users_set_updated_at;
alter policy "profiles owner can read" on users rename to "users owner can read";
alter policy "profiles owner can update" on users rename to "users owner can update";
alter policy "profiles owner can insert" on users rename to "users owner can insert";

-- Recreate the functions that referenced "profiles" by name. -----------------

-- New auth user -> create matching public.users row.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Nearby companions (authenticated discovery, with block filtering).
create or replace function nearby_companions(
  center_lat double precision,
  center_lng double precision,
  radius_m double precision default 20000,
  filter_activity text default null,
  filter_tier tier_level default null,
  max_price int default null
)
returns table (
  companion_id uuid,
  display_name text,
  photo_url text,
  experience_level experience_level,
  home_area text,
  tier tier_level,
  activity_slug text,
  price_ntd int,
  is_free boolean,
  distance_m double precision
)
language sql security definer set search_path = public as $$
  select
    p.id, p.display_name, p.photo_url, p.experience_level, p.home_area,
    o.tier, a.slug, o.price_ntd, o.is_free,
    round(ST_Distance(p.location, ST_MakePoint(center_lng, center_lat)::geography)) as distance_m
  from companion_listings l
  join users p on p.id = l.profile_id
  join listing_offerings o on o.listing_id = l.id
  join activities a on a.id = o.activity_id
  where l.status = 'active'
    and p.location is not null
    and ST_DWithin(p.location, ST_MakePoint(center_lng, center_lat)::geography, radius_m)
    and (filter_activity is null or a.slug = filter_activity)
    and (filter_tier is null or o.tier = filter_tier)
    and (max_price is null or o.price_ntd <= max_price)
    and not exists (
      select 1 from blocks bl
      where (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
         or (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
    )
  order by distance_m asc
  limit 100;
$$;
grant execute on function nearby_companions to authenticated;

-- Public companion detail (authenticated).
create or replace function get_companion(p_id uuid)
returns table (
  companion_id uuid,
  display_name text,
  photo_url text,
  bio text,
  experience_level experience_level,
  home_area text,
  rating_avg numeric,
  rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.bio, p.experience_level, p.home_area,
         coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.profile_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;

-- Web recommended feed (anon). Headline offering = best tier, then HIGHEST
-- price (the trainer's primary/headline service, matching the card designs).
create or replace function recommended_companions(
  p_activity text default null,
  p_limit int default 24
)
returns jsonb
language sql security definer set search_path = public stable as $$
  with headline as (
    select distinct on (o.listing_id)
      o.listing_id, o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ),
  acts as (
    select o.listing_id, array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    group by o.listing_id
  )
  select coalesce(
    jsonb_agg(r.obj order by r.rating_avg desc, r.rating_count desc),
    '[]'::jsonb
  )
  from (
    select
      jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'photo_url', p.photo_url,
        'tier', h.tier,
        'activities', to_jsonb(acts.activities),
        'home_area', coalesce(p.home_area, l.served_area, ''),
        'price_ntd', h.price_ntd,
        'is_free', h.is_free,
        'rating_avg', l.rating_avg,
        'rating_count', l.rating_count,
        'experience_level', p.experience_level
      ) as obj,
      l.rating_avg,
      l.rating_count
    from companion_listings l
    join users p on p.id = l.profile_id
    join headline h on h.listing_id = l.id
    join acts on acts.listing_id = l.id
    where l.status = 'active'
      and (p_activity is null or p_activity = any (acts.activities))
    order by l.rating_avg desc, l.rating_count desc
    limit p_limit
  ) r;
$$;
grant execute on function recommended_companions to anon, authenticated;

-- Web public profile (anon).
create or replace function companion_profile(p_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'photo_url', p.photo_url,
    'tier', h.tier,
    'activities', to_jsonb(coalesce(acts.activities, array[]::text[])),
    'home_area', coalesce(p.home_area, l.served_area, ''),
    'price_ntd', coalesce(h.price_ntd, 0),
    'is_free', coalesce(h.is_free, false),
    'rating_avg', coalesce(l.rating_avg, 0),
    'rating_count', coalesce(l.rating_count, 0),
    'experience_level', p.experience_level,
    'bio', coalesce(p.bio, l.bio_long, ''),
    'certifications', '[]'::jsonb,
    'offerings', coalesce(off.offerings, '[]'::jsonb),
    'gym_memberships', '[]'::jsonb,
    'availability', coalesce(av.slots, '[]'::jsonb),
    'reviews', '[]'::jsonb,
    'manager', null,
    'is_bidding', false
  ) end
  from users p
  left join companion_listings l on l.profile_id = p.id
  left join lateral (
    select distinct on (o.listing_id) o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    where o.listing_id = l.id
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ) h on true
  left join lateral (
    select array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) acts on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'activity', a.slug, 'tier', o.tier, 'price_ntd', o.price_ntd,
      'is_free', o.is_free, 'session_minutes', o.session_minutes
    ) order by o.tier asc) as offerings
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) off on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'weekday', av.weekday, 'start_minute', av.start_minute, 'end_minute', av.end_minute
    ) order by av.weekday, av.start_minute) as slots
    from availability av
    where av.profile_id = p.id
  ) av on true
  where p.id = p_id and (l.status = 'active' or l.id is null);
$$;
grant execute on function companion_profile to anon, authenticated;
