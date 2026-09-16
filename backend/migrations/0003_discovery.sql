-- Companion listing (1:1 with a companion profile)
create table if not exists companion_listings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  headline text,
  bio_long text,
  served_area text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists companion_listings_set_updated_at on companion_listings;
create trigger companion_listings_set_updated_at
  before update on companion_listings
  for each row execute function set_updated_at();

-- Offerings: an activity at a tier and price within a listing
create table if not exists listing_offerings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references companion_listings (id) on delete cascade,
  activity_id uuid not null references activities (id),
  tier tier_level not null,
  price_ntd int not null default 0,
  is_free boolean not null default false,
  session_minutes int not null default 60,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists listing_offerings_listing_idx on listing_offerings (listing_id);

-- Saved companions (bookmark)
create table if not exists saved_companions (
  seeker_id uuid not null references profiles (id) on delete cascade,
  companion_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seeker_id, companion_id)
);

-- RLS
alter table companion_listings enable row level security;
alter table listing_offerings enable row level security;
alter table saved_companions enable row level security;

drop policy if exists "listings active readable" on companion_listings;
create policy "listings active readable"
  on companion_listings for select to authenticated
  using (status = 'active' or profile_id = auth.uid());

drop policy if exists "listings owner manage" on companion_listings;
create policy "listings owner manage"
  on companion_listings for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "offerings readable for active listings" on listing_offerings;
create policy "offerings readable for active listings"
  on listing_offerings for select to authenticated
  using (
    exists (
      select 1 from companion_listings l
      where l.id = listing_id and (l.status = 'active' or l.profile_id = auth.uid())
    )
  );

drop policy if exists "offerings owner manage" on listing_offerings;
create policy "offerings owner manage"
  on listing_offerings for all to authenticated
  using (
    exists (select 1 from companion_listings l where l.id = listing_id and l.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from companion_listings l where l.id = listing_id and l.profile_id = auth.uid())
  );

drop policy if exists "saved owner manage" on saved_companions;
create policy "saved owner manage"
  on saved_companions for all to authenticated
  using (seeker_id = auth.uid()) with check (seeker_id = auth.uid());

-- Nearby companions: returns SAFE columns + rounded distance only. No raw
-- coordinates, no PII. SECURITY DEFINER so it can read other users' rows
-- while the base profiles table stays owner-only.
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
  join profiles p on p.id = l.profile_id
  join listing_offerings o on o.listing_id = l.id
  join activities a on a.id = o.activity_id
  where l.status = 'active'
    and p.location is not null
    and ST_DWithin(p.location, ST_MakePoint(center_lng, center_lat)::geography, radius_m)
    and (filter_activity is null or a.slug = filter_activity)
    and (filter_tier is null or o.tier = filter_tier)
    and (max_price is null or o.price_ntd <= max_price)
  order by distance_m asc
  limit 100;
$$;

grant execute on function nearby_companions to authenticated;

-- Public companion detail: safe columns only.
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
  from profiles p
  left join companion_listings l on l.profile_id = p.id
  where p.id = p_id;
$$;

grant execute on function get_companion to authenticated;
