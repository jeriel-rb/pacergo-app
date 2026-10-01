-- Gender lives in the Shared Fitness Profile (user_onboarding.about_you ->>
-- 'gender'), not in account settings. The web app no longer edits or reads
-- users.gender.
--
-- 1. Backfill: anyone who set a male/female gender on their account but has no
--    answer in their fitness profile gets it copied over, so nothing they told
--    us earlier is lost. (Users with no fitness-profile row yet are left
--    alone — they'll be asked in the wizard.)
-- 2. update_my_profile no longer clears or changes gender when it isn't given
--    (the web account form stopped sending it). A non-null value still works,
--    for the mobile app, which still edits it there.
--
-- save_onboarding_answers keeps mirroring the fitness profile's gender onto
-- users.gender one-way (fitness profile → account), so the mobile app's copy
-- follows the web.

update user_onboarding o
set about_you = o.about_you || jsonb_build_object('gender', u.gender)
from users u
where u.id = o.user_id
  and u.gender in ('male', 'female')
  and coalesce(o.about_you ->> 'gender', '') not in ('male', 'female');

create or replace function update_my_profile(
  p_display_name text,
  p_bio text,
  p_experience_level experience_level,
  p_home_area text,
  p_gender text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_display_name, '')) > 80 then raise exception 'display name too long'; end if;
  if char_length(coalesce(p_bio, '')) > 2000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_home_area, '')) > 120 then raise exception 'home area too long'; end if;
  if char_length(coalesce(p_gender, '')) > 40 then raise exception 'gender too long'; end if;

  update users set
    display_name = coalesce(p_display_name, display_name),
    bio = p_bio,
    experience_level = p_experience_level,
    home_area = p_home_area,
    gender = coalesce(p_gender, gender)
  where id = auth.uid();
end $$;
