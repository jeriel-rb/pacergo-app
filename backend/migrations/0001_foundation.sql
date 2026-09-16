-- Extensions
create extension if not exists postgis;

-- Enums
do $$ begin
  create type tier_level as enum ('A', 'B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  bio text,
  gender text,
  birthdate date,
  locale text not null default 'en',
  experience_level experience_level,
  location geography(Point, 4326),
  home_area text,
  is_companion boolean not null default false,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- activities taxonomy
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh text not null,
  icon text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- seeker activity interests
create table if not exists profile_activities (
  profile_id uuid not null references profiles (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  primary key (profile_id, activity_id)
);

-- Seed activities: Gym active, others inactive (enabled later)
insert into activities (slug, name_en, name_zh, icon, is_active) values
  ('gym',        'Gym / Strength', '健身 / 重訓', 'dumbbell', true),
  ('running',    'Running',        '跑步',        'footprints', false),
  ('hiking',     'Hiking',         '登山健行',     'mountain', false),
  ('cycling',    'Cycling',        '騎車',        'bike', false),
  ('yoga',       'Yoga',           '瑜珈',        'flower', false),
  ('swimming',   'Swimming',       '游泳',        'waves', false),
  ('boxing',     'Boxing / Martial Arts', '拳擊 / 武術', 'shield', false),
  ('basketball', 'Basketball',     '籃球',        'circle', false)
on conflict (slug) do nothing;

-- handle new auth user -> create profile row
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table activities enable row level security;
alter table profile_activities enable row level security;

-- profiles: owner can read/write their own row ONLY.
-- Privacy note: profiles holds sensitive data (exact `location`, `birthdate`,
-- `gender`, `push_token`). We deliberately do NOT make the base table
-- world-readable. Public discovery of OTHER users' limited fields is added in
-- M2 (Discovery) via a `public_profiles` view that exposes only safe columns
-- (display_name, photo_url, bio, experience_level, home_area, is_companion)
-- plus a `nearby_companions` SECURITY DEFINER RPC that returns distance bands
-- computed server-side — never raw coordinates or PII.
drop policy if exists "profiles readable by authenticated" on profiles;
drop policy if exists "profiles owner can read" on profiles;
create policy "profiles owner can read"
  on profiles for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles owner can update" on profiles;
create policy "profiles owner can update"
  on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles owner can insert" on profiles;
create policy "profiles owner can insert"
  on profiles for insert to authenticated with check (auth.uid() = id);

-- activities: readable by everyone authenticated; no client writes
drop policy if exists "activities readable" on activities;
create policy "activities readable"
  on activities for select to authenticated using (true);

-- profile_activities: owner manages own rows
drop policy if exists "profile_activities owner read" on profile_activities;
create policy "profile_activities owner read"
  on profile_activities for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "profile_activities owner write" on profile_activities;
create policy "profile_activities owner write"
  on profile_activities for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
