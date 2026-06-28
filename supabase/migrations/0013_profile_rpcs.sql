-- Self-service profile read/write via RPCs.
-- Data access goes through functions (not client-side table queries): the web
-- app calls these instead of supabase.from('users').select/update().

-- Update the caller's own editable profile fields.
create or replace function update_my_profile(
  p_display_name text,
  p_bio text,
  p_experience_level experience_level,
  p_home_area text,
  p_gender text
) returns void
language sql
security definer
set search_path = public
as $$
  update users set
    display_name = coalesce(p_display_name, display_name),
    bio = p_bio,
    experience_level = p_experience_level,
    home_area = p_home_area,
    gender = p_gender
  where id = auth.uid();
$$;

-- Set or clear the caller's avatar URL (null clears it).
create or replace function set_my_photo_url(p_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update users set photo_url = p_url where id = auth.uid();
$$;

-- Return the caller's full editable profile as JSON.
create or replace function get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t) from (
    select display_name, photo_url, bio, experience_level, home_area, gender
    from users
    where id = auth.uid()
  ) t;
$$;

grant execute on function update_my_profile(text, text, experience_level, text, text) to authenticated;
grant execute on function set_my_photo_url(text) to authenticated;
grant execute on function get_my_profile() to authenticated;
