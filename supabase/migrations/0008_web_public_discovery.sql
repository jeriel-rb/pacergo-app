-- Public, read-only discovery for the web app.
--
-- The base tables are authenticated-only (RLS), and the existing discovery RPCs
-- require a logged-in user + geolocation. The web app browses trainers publicly
-- (login is only needed to book), so these SECURITY DEFINER functions expose a
-- SAFE, curated subset (no raw coordinates, no contact info, no PII beyond the
-- public profile fields) and are granted to `anon`. The base tables stay locked.

-- Recommended trainers feed (rating-ordered, no geolocation needed).
-- Returns a JSON array shaped exactly like @pacergo/shared TrainerSummary.
create or replace function recommended_companions(
  p_activity text default null,
  p_limit int default 24
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with headline as (
    -- one "headline" offering per listing: best tier, then cheapest
    select distinct on (o.listing_id)
      o.listing_id, o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    order by o.listing_id, o.tier asc, o.price_ntd asc
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
    join profiles p on p.id = l.profile_id
    join headline h on h.listing_id = l.id
    join acts on acts.listing_id = l.id
    where l.status = 'active'
      and (p_activity is null or p_activity = any (acts.activities))
    order by l.rating_avg desc, l.rating_count desc
    limit p_limit
  ) r;
$$;

grant execute on function recommended_companions to anon, authenticated;

-- Full public profile for the trainer detail page.
-- Returns a JSON object shaped like @pacergo/shared TrainerProfile, or null.
-- Fields with no column in this schema (certifications, gym memberships,
-- manager, bidding) come back empty so the UI degrades gracefully.
create or replace function companion_profile(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
  from profiles p
  left join companion_listings l on l.profile_id = p.id
  left join lateral (
    select distinct on (o.listing_id) o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    where o.listing_id = l.id
    order by o.listing_id, o.tier asc, o.price_ntd asc
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
