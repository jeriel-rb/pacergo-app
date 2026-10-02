-- One answer, one place: the Home Profile Setup dialog writes into the
-- Shared Fitness Profile (user_onboarding) instead of its own columns, so the
-- fitness onboarding never asks the same question again.
--
--   level (Beginner / Basic / Intermediate / Advanced)
--       -> user_onboarding.training_preferences.experience, stored on the
--          fitness profile's scale: no_experience | beginner | intermediate |
--          advanced. The dialog's labels map 1:1 (Beginner = no_experience,
--          Basic = beginner, ...), and the app now uses those same labels
--          everywhere.
--   main activity (Gym / Running / Hiking / Other)
--       -> user_onboarding.about_you.primaryActivity
--   city
--       -> users.home_area (already existed; unchanged)
--   status (completed / skipped) and its timestamp
--       -> users.profile_setup_status / profile_setup_at (UI state, not an answer)
--
-- users.primary_activity and users.fitness_level (added a day ago) are removed
-- once their rows are copied over. users.experience_level — the old account
-- field the trainer cards read — stays, but is now a one-way copy of the
-- fitness profile's level (3-value scale: no_experience -> beginner), exactly
-- like users.gender: nobody is asked twice and the two can't disagree.

-- 1. Move any Profile Setup answers already given into the fitness profile.
--    If the fitness profile already has an answer, that one wins.
insert into user_onboarding (user_id, about_you, training_preferences)
select u.id,
       jsonb_strip_nulls(jsonb_build_object('primaryActivity', u.primary_activity)),
       jsonb_strip_nulls(jsonb_build_object(
         'experience',
         case u.fitness_level
           when 'beginner' then 'no_experience'
           when 'basic' then 'beginner'
           else u.fitness_level
         end
       ))
from users u
where u.primary_activity is not null or u.fitness_level is not null
on conflict (user_id) do update set
  about_you = excluded.about_you || user_onboarding.about_you,
  training_preferences = excluded.training_preferences || user_onboarding.training_preferences;

-- 2. People who set a level only in account settings: carry it into the
--    fitness profile so it isn't lost (fitness answer still wins when present).
insert into user_onboarding (user_id, training_preferences)
select u.id, jsonb_build_object('experience', u.experience_level::text)
from users u
where u.experience_level is not null
on conflict (user_id) do update set
  training_preferences = excluded.training_preferences || user_onboarding.training_preferences;

-- 3. The columns that duplicated fitness-profile data.
alter table users drop column if exists primary_activity;
alter table users drop column if exists fitness_level;

-- 4. Profile Setup RPCs, now writing to the fitness profile. The parameter was
--    renamed (p_fitness_level -> p_experience), which `create or replace`
--    can't do, so the function is dropped and recreated.
drop function if exists save_profile_setup(text, text, text);

create function save_profile_setup(
  p_primary_activity text,
  p_experience text,
  p_city text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_city, '')) > 120 then raise exception 'city too long'; end if;
  if p_primary_activity is not null and p_primary_activity not in ('gym', 'running', 'hiking', 'other') then
    raise exception 'invalid activity';
  end if;
  if p_experience is not null and p_experience not in ('no_experience', 'beginner', 'intermediate', 'advanced') then
    raise exception 'invalid experience';
  end if;

  insert into user_onboarding (user_id, about_you, training_preferences)
  values (
    auth.uid(),
    jsonb_strip_nulls(jsonb_build_object('primaryActivity', p_primary_activity)),
    jsonb_strip_nulls(jsonb_build_object('experience', p_experience))
  )
  on conflict (user_id) do update set
    about_you = user_onboarding.about_you || jsonb_strip_nulls(jsonb_build_object('primaryActivity', p_primary_activity)),
    training_preferences = user_onboarding.training_preferences || jsonb_strip_nulls(jsonb_build_object('experience', p_experience));

  update users set
    home_area = coalesce(nullif(btrim(p_city), ''), home_area),
    experience_level = coalesce(
      (case p_experience when 'no_experience' then 'beginner' else p_experience end)::experience_level,
      experience_level
    ),
    profile_setup_status = 'completed',
    profile_setup_at = now()
  where id = auth.uid();
end $$;

create or replace function my_profile_setup() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'status', u.profile_setup_status,
    'primaryActivity', o.about_you ->> 'primaryActivity',
    'experience', o.training_preferences ->> 'experience',
    'city', u.home_area
  )
  from users u
  left join user_onboarding o on o.user_id = u.id
  where u.id = auth.uid();
$$;

revoke all on function save_profile_setup(text, text, text) from public, anon, authenticated;
grant execute on function save_profile_setup(text, text, text) to authenticated;

-- 5. Saving the fitness profile keeps the main activity when the caller didn't
--    send it (an older cached client), and mirrors the level onto
--    users.experience_level. Otherwise identical to the previous version.
create or replace function save_onboarding_answers(
  p_goal text,
  p_gym_type text,
  p_about_you jsonb,
  p_training_preferences jsonb,
  p_gym_equipment jsonb,
  p_nutrition jsonb default null,
  p_nutrition_status text default null
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_updated_at timestamptz;
  v_gender text := p_about_you ->> 'gender';
  v_experience text := p_training_preferences ->> 'experience';
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_nutrition is not null and jsonb_typeof(p_nutrition) <> 'object' then
    raise exception 'invalid nutrition';
  end if;
  if p_nutrition_status is not null and p_nutrition_status not in ('built', 'skipped') then
    raise exception 'invalid nutrition status';
  end if;

  insert into user_onboarding (
    user_id, goal, gym_type, about_you, training_preferences, gym_equipment,
    nutrition, nutrition_status
  )
  values (
    auth.uid(), p_goal, p_gym_type, coalesce(p_about_you, '{}'::jsonb),
    coalesce(p_training_preferences, '{}'::jsonb), coalesce(p_gym_equipment, '{}'::jsonb),
    case when p_nutrition_status = 'built' then p_nutrition end,
    p_nutrition_status
  )
  on conflict (user_id) do update set
    goal = excluded.goal,
    gym_type = excluded.gym_type,
    -- the incoming answers win; a missing primaryActivity keeps the stored one
    about_you = jsonb_strip_nulls(
      jsonb_build_object('primaryActivity', user_onboarding.about_you -> 'primaryActivity')
    ) || excluded.about_you,
    training_preferences = excluded.training_preferences,
    gym_equipment = excluded.gym_equipment,
    nutrition_status = coalesce(p_nutrition_status, user_onboarding.nutrition_status),
    nutrition = case
      when coalesce(p_nutrition_status, user_onboarding.nutrition_status) = 'built' then p_nutrition
      else user_onboarding.nutrition
    end
  returning updated_at into v_updated_at;

  if v_gender in ('male', 'female') then
    update users set gender = v_gender
    where id = auth.uid() and (gender is null or gender in ('male', 'female'))
      and gender is distinct from v_gender;
  end if;

  if v_experience in ('no_experience', 'beginner', 'intermediate', 'advanced') then
    update users set
      experience_level = (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level
    where id = auth.uid()
      and experience_level is distinct from
        (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level;
  end if;

  return v_updated_at;
end $$;

-- 6. The account form no longer asks for a level (it's the fitness profile's
--    answer now), so a null must leave users.experience_level alone instead of
--    wiping the copy. The mobile app, which still sends one, is unaffected.
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
    experience_level = coalesce(p_experience_level, experience_level),
    home_area = p_home_area,
    gender = coalesce(p_gender, gender)
  where id = auth.uid();
end $$;
