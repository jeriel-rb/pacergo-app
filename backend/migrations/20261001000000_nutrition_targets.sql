-- AI Nutrition on the Shared Fitness Profile.
--
-- `user_onboarding` is the one-per-user fitness profile (about_you holds
-- gender/age/height/weight/activityLevel; training_preferences and
-- gym_equipment the training side). AI Training and AI Nutrition both read
-- and write this one row — neither keeps its own copy.
--
-- nutrition         The saved nutrition result (daily calories, protein,
--                   guidance), computed client-side by @pacergo/shared's
--                   calculateNutrition() and saved in the same call as the
--                   answers it came from, so it can never drift from them.
-- nutrition_status  null = never offered/answered, 'built' = the user built a
--                   nutrition plan, 'skipped' = they chose Skip on the intro.
--                   A result is only stored (and kept up to date on every
--                   later profile save) once the plan is 'built'.
--
-- save_onboarding_answers now returns the row's new `updated_at`: the web
-- wizard keeps a local draft and compares against it to tell whether the
-- profile changed elsewhere since the draft was taken. It also keeps
-- `users.gender` in step with the fitness profile's male/female answer
-- (unless the user chose "other" in profile settings — that's left alone).
--
-- No new policies: the existing "user_onboarding owner can read" select
-- policy (0002_policies.sql) already covers the new columns, and writes stay
-- RPC-only.

alter table user_onboarding add column if not exists nutrition jsonb;
alter table user_onboarding add column if not exists nutrition_status text
  check (nutrition_status in ('built', 'skipped'));

-- Replace the 5-arg version (rather than overload it) so PostgREST never has
-- two candidates for the same named-argument call.
drop function if exists save_onboarding_answers(text, text, jsonb, jsonb, jsonb);

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
    about_you = excluded.about_you,
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

  return v_updated_at;
end $$;

-- "Skip" on the nutrition intro: remember the choice so it isn't offered
-- again automatically (the user can still build a plan from the Nutrition
-- page later). Never downgrades a plan that was already built.
create or replace function skip_nutrition_plan() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  insert into user_onboarding (user_id, nutrition_status)
  values (auth.uid(), 'skipped')
  on conflict (user_id) do update set
    nutrition_status = coalesce(user_onboarding.nutrition_status, 'skipped');
end $$;

revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
revoke all on function skip_nutrition_plan() from public, anon, authenticated;
grant execute on function skip_nutrition_plan() to authenticated;
