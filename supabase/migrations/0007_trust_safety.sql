create table if not exists blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  reported_id uuid not null references profiles (id) on delete cascade,
  booking_id uuid references bookings (id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'harassment', 'spam', 'safety', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table blocks enable row level security;
alter table reports enable row level security;

drop policy if exists "blocks owner manage" on blocks;
create policy "blocks owner manage" on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Reports: a user may file (reporter = caller); only admins (service role) read.
drop policy if exists "reports reporter insert" on reports;
create policy "reports reporter insert" on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- Replace nearby_companions to exclude blocked pairs (either direction).
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
    and not exists (
      select 1 from blocks bl
      where (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
         or (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
    )
  order by distance_m asc
  limit 100;
$$;

grant execute on function nearby_companions to authenticated;

-- Account deletion: removes the auth user; FKs cascade to profile + all data.
create or replace function delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function delete_account to authenticated;
