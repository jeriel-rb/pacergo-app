-- Relocate PostGIS from `public` into `extensions`.
-- Requires a role that can update pg_extension (Supabase Support on hosted).
-- Docs: https://supabase.com/docs/guides/database/extensions/postgis
--
-- Adjust the UPDATE TO version to match `select extversion from pg_extension
-- where extname = 'postgis'` on the target database.

BEGIN;
  UPDATE pg_extension
    SET extrelocatable = true
  WHERE extname = 'postgis';

  ALTER EXTENSION postgis SET SCHEMA extensions;

  ALTER EXTENSION postgis UPDATE TO '3.3.7next';
  ALTER EXTENSION postgis UPDATE;

  UPDATE pg_extension
    SET extrelocatable = false
  WHERE extname = 'postgis';
COMMIT;
