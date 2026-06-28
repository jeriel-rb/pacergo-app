-- Expose is_companion on the profile read so the UI can show a
-- "Become a trainer" entry for seekers and "Trainer Studio" for companions.
create or replace function get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t) from (
    select display_name, photo_url, bio, experience_level, home_area, gender,
           is_companion
    from users
    where id = auth.uid()
  ) t;
$$;
