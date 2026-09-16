-- Repair auth ↔ public.users drift and backfill display names.
--
-- Root cause (live DB audit): handle_new_user() still inserted into the legacy
-- public.profiles table, while the app + CSV export read public.users. Sign-up
-- is atomic (auth.users INSERT + AFTER INSERT trigger share one transaction),
-- but the trigger targeted the wrong table, leaving auth accounts without a
-- public.users row.
--
-- This migration:
--  1. Backfills missing display_name on public.users from auth metadata/email.
--  2. Deletes stale public.profiles rows with no matching public.users row.
--  3. Deletes auth.users accounts that still have no public.users row and no
--     app activity (bookings, listings, payments, notifications).
--  4. Re-points handle_new_user() at public.users with an email-prefix fallback.
--  5. Restricts admin_export_users() to auth-linked profiles only.

-- Shared display-name derivation (matches ensure_user_profile_row intent).
create or replace function derive_display_name_from_auth(
  p_full_name text,
  p_name text,
  p_email text
)
returns text
language sql
immutable
as $$
  select left(
    coalesce(
      nullif(btrim(p_full_name), ''),
      nullif(btrim(p_name), ''),
      nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
      'User'
    ),
    80
  );
$$;

-- 1) Backfill missing names on existing app profiles.
update public.users u
set display_name = derive_display_name_from_auth(
  au.raw_user_meta_data ->> 'full_name',
  au.raw_user_meta_data ->> 'name',
  au.email
)
from auth.users au
where au.id = u.id
  and (u.display_name is null or btrim(u.display_name) = '');

-- 2) Drop legacy profile stubs that never made it into public.users.
delete from public.profiles p
where not exists (
  select 1 from public.users u where u.id = p.id
);

-- 3) Remove auth accounts with no public.users row and no app history.
delete from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
  and not exists (
    select 1 from public.bookings b
    where b.seeker_id = au.id or b.companion_id = au.id
  )
  and not exists (
    select 1 from public.companion_listings l where l.user_id = au.id
  )
  and not exists (
    select 1 from public.payments p where p.user_id = au.id
  )
  and not exists (
    select 1 from public.notifications n where n.user_id = au.id
  );

-- 4) Atomic sign-up hook: always create public.users (not legacy profiles).
-- Sign-up is one transaction: auth.users INSERT + this AFTER INSERT trigger.
-- If this raises, the auth row rolls back too. When 0036_consent_pages.sql is
-- already applied it owns handle_new_user() (with consent + email fallback);
-- only patch the trigger on databases still stuck on the legacy profiles insert.
do $do$
begin
  if to_regclass('public.consent_records') is null then
    execute $fn$
      create or replace function handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        insert into public.users (id, display_name, photo_url)
        values (
          new.id,
          derive_display_name_from_auth(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            new.email
          ),
          new.raw_user_meta_data ->> 'avatar_url'
        )
        on conflict (id) do nothing;

        return new;
      end;
      $body$;
    $fn$;
  end if;
end;
$do$;

-- Keep lazy profile repair aligned with sign-up.
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
    derive_display_name_from_auth(
      au.raw_user_meta_data ->> 'full_name',
      au.raw_user_meta_data ->> 'name',
      au.email
    ),
    au.raw_user_meta_data ->> 'avatar_url'
  from auth.users au
  where au.id = p_user_id
  on conflict (id) do nothing;
end $$;

-- 5) CSV export: only auth-linked app profiles.
create or replace function admin_export_users()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb)
  into v
  from (
    select
      u.created_at,
      u.id,
      jsonb_build_object(
        'id', u.id,
        'display_name', u.display_name,
        'home_area', u.home_area,
        'experience_level', u.experience_level,
        'is_companion', u.is_companion,
        'is_admin', u.is_admin,
        'created_at', u.created_at
      ) as obj
    from public.users u
    inner join auth.users au on au.id = u.id
  ) s;

  return v;
end $$;
