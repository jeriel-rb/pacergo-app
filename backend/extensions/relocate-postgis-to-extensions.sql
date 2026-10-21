-- Move PostGIS from `public` into `extensions` on a hosted project.
--
-- Why: PostGIS created in `public` puts `public.spatial_ref_sys` on the Data API
-- without RLS, owned by supabase_admin, with full anon/authenticated DML (advisor
-- `rls_disabled_in_public`). `postgres` cannot enable RLS on it, revoke those grants,
-- or `ALTER EXTENSION ... SET SCHEMA` (postgis is not relocatable). It can drop and
-- recreate the extension, because postgis is a supautils privileged extension.
--
-- DROP ... CASCADE also drops `public.users.location` and `users_location_gix`, so
-- this only runs while that column is empty; otherwise it aborts and changes nothing.
-- No-op once PostGIS is already in `extensions`.
--
-- Run: supabase db query --linked -f backend/extensions/relocate-postgis-to-extensions.sql
-- Applied to kezkrcyfnjlugkrcbwmy on 2026-10-21.

do $$
begin
  if not exists (
    select 1 from pg_extension
    where extname = 'postgis' and extnamespace = 'public'::regnamespace
  ) then
    raise notice 'PostGIS is not in public; nothing to do';
    return;
  end if;

  if exists (select 1 from public.users where location is not null) then
    raise exception 'public.users.location has data; copy it out before moving PostGIS';
  end if;

  drop extension postgis cascade;
  create extension postgis with schema extensions;

  alter table public.users add column location extensions.geography(Point, 4326);
  create index users_location_gix on public.users using gist (location)
    where location is not null;
end $$;
