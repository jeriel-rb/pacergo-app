-- AI Training: one active plan per user, recorded set performance, and Home
-- progress that follows the same active plan.
--
-- Active plan   user_onboarding.active_plan_id. A newly saved plan becomes
--               active (save_training_plan); the user can switch it from My
--               Plans (set_active_training_plan). active_training_plan_id()
--               resolves it, falling back to the newest saved plan when the
--               pointer is empty (plans saved before this migration, or the
--               active one was deleted) — so a user with any plan always has
--               an active one and only a user with none needs recovery.
-- Set logs      workout_exercise_logs: actual weight × reps per set (+ simple
--               effort feedback) for one exercise on one day. One row per
--               calendar day (Asia/Taipei), so repeating a plan week keeps the
--               earlier history instead of overwriting it.
-- Sessions      workout_sessions: a plan day the user finished. Feeds Home's
--               weekly progress.
--
-- Both new tables are RPC-only (RLS on, no policies), like every other write
-- path here — reads go through the security-definer functions below, so no
-- policy changes are needed in 0002_policies.sql.

-- ─── Active plan ────────────────────────────────────────────────────────────

alter table user_onboarding
  add column if not exists active_plan_id uuid references user_training_plans (id) on delete set null;

create or replace function active_training_plan_id()
returns uuid
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select o.active_plan_id
       from user_onboarding o
       join user_training_plans p on p.id = o.active_plan_id
      where o.user_id = auth.uid()),
    (select p.id from user_training_plans p
      where p.user_id = auth.uid()
      order by p.created_at desc
      limit 1)
  );
$$;

-- Same signature as 0001's version; now also makes the new plan active.
create or replace function save_training_plan(
  p_label text,
  p_plan jsonb,
  p_onboarding_snapshot jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_label, '')) = 0 or char_length(p_label) > 120 then
    raise exception 'invalid label';
  end if;
  if p_plan is null then raise exception 'missing plan'; end if;

  insert into user_training_plans (user_id, label, plan, onboarding_snapshot, goal)
  values (
    auth.uid(), p_label, p_plan, coalesce(p_onboarding_snapshot, '{}'::jsonb),
    p_onboarding_snapshot -> 'answers' ->> 'goal'
  )
  returning id into v_id;

  insert into user_onboarding (user_id, active_plan_id)
  values (auth.uid(), v_id)
  on conflict (user_id) do update set active_plan_id = excluded.active_plan_id;

  return v_id;
end $$;

create or replace function set_active_training_plan(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;

  insert into user_onboarding (user_id, active_plan_id)
  values (auth.uid(), p_id)
  on conflict (user_id) do update set active_plan_id = excluded.active_plan_id;
end $$;

-- ─── Workout performance ────────────────────────────────────────────────────

create table if not exists workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references user_training_plans (id) on delete set null,
  week int not null check (week between 1 and 52),
  day_index int not null check (day_index between 0 and 6),
  exercise_slug text not null check (char_length(exercise_slug) between 1 and 120),
  performed_on date not null,
  -- [{ "weightKg": number | null, "reps": int | null }, …] in set order.
  sets jsonb not null default '[]'::jsonb,
  effort text check (effort in ('too_light', 'just_right', 'too_heavy')),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, plan_id, week, day_index, exercise_slug, performed_on)
);

create index if not exists workout_exercise_logs_history_idx
  on workout_exercise_logs (user_id, exercise_slug, performed_on desc);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references user_training_plans (id) on delete set null,
  week int not null check (week between 1 and 52),
  day_index int not null check (day_index between 0 and 6),
  performed_on date not null,
  completed_at timestamptz not null default now(),
  unique nulls not distinct (user_id, plan_id, week, day_index, performed_on)
);

create index if not exists workout_sessions_user_idx on workout_sessions (user_id, performed_on desc);

alter table workout_exercise_logs enable row level security;
alter table workout_sessions enable row level security;

-- "Today" for workouts is the app's timezone (see packages/shared time helpers).
create or replace function app_today() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Taipei')::date;
$$;

/** Saves (replaces) today's sets for one exercise of one plan day. */
create or replace function log_exercise_sets(
  p_plan_id uuid,
  p_week int,
  p_day_index int,
  p_slug text,
  p_sets jsonb,
  p_effort text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_set jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) > 12 then
    raise exception 'invalid sets';
  end if;
  for v_set in select * from jsonb_array_elements(p_sets) loop
    if jsonb_typeof(v_set) <> 'object'
      or coalesce((v_set ->> 'weightKg')::numeric, 0) not between 0 and 1000
      or coalesce((v_set ->> 'reps')::int, 0) not between 0 and 500 then
      raise exception 'invalid set';
    end if;
  end loop;
  if p_effort is not null and p_effort not in ('too_light', 'just_right', 'too_heavy') then
    raise exception 'invalid effort';
  end if;

  insert into workout_exercise_logs (user_id, plan_id, week, day_index, exercise_slug, performed_on, sets, effort)
  values (auth.uid(), p_plan_id, p_week, p_day_index, p_slug, app_today(), p_sets, p_effort)
  on conflict (user_id, plan_id, week, day_index, exercise_slug, performed_on) do update set
    sets = excluded.sets,
    effort = excluded.effort,
    updated_at = now();
end $$;

/** Today's logged sets for every exercise of one plan day (restores the
 *  workout after a refresh, another device, or logging back in). */
create or replace function workout_day_logs(p_plan_id uuid, p_week int, p_day_index int)
returns table (exercise_slug text, sets jsonb, effort text)
language sql security definer set search_path = public stable as $$
  select l.exercise_slug, l.sets, l.effort
  from workout_exercise_logs l
  where l.user_id = auth.uid()
    and l.plan_id = p_plan_id and l.week = p_week and l.day_index = p_day_index
    and l.performed_on = app_today();
$$;

/** The most recent earlier performances of an exercise (any plan) — the
 *  calibration input for the next recommendation. */
create or replace function exercise_history(p_slug text, p_limit int default 3)
returns table (performed_on date, sets jsonb, effort text)
language sql security definer set search_path = public stable as $$
  select l.performed_on, l.sets, l.effort
  from workout_exercise_logs l
  where l.user_id = auth.uid() and l.exercise_slug = p_slug and l.performed_on < app_today()
    and jsonb_array_length(l.sets) > 0
  order by l.performed_on desc, l.updated_at desc
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
$$;

/** Marks a plan day finished (idempotent per day). */
create or replace function complete_workout(p_plan_id uuid, p_week int, p_day_index int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;
  insert into workout_sessions (user_id, plan_id, week, day_index, performed_on)
  values (auth.uid(), p_plan_id, p_week, p_day_index, app_today())
  on conflict (user_id, plan_id, week, day_index, performed_on) do nothing;
end $$;

-- ─── Home weekly progress follows the active plan ───────────────────────────

-- Same signature as 0001's version. With an active plan: target = the plan's
-- training days per week, done = that plan's workouts finished this week
-- (Mon–Sun, Asia/Taipei). Without one: the previous manual target +
-- completed bookings.
create or replace function weekly_progress()
returns jsonb
language sql security definer set search_path = public stable as $$
  with active as (
    select p.id, p.plan
    from user_training_plans p
    where p.id = active_training_plan_id()
  )
  select case
    when exists (select 1 from active) then (
      select jsonb_build_object(
        'source', 'plan',
        'planId', a.id,
        'target', (
          select count(*)
          from jsonb_array_elements(a.plan -> 'weeks' -> 0 -> 'days') d
          where coalesce((d ->> 'isRestDay')::boolean, false) = false
        ),
        'done', (
          select count(*)
          from workout_sessions s
          where s.user_id = auth.uid() and s.plan_id = a.id
            and s.performed_on >= date_trunc('week', app_today())::date
        )
      )
      from active a
    )
    else jsonb_build_object(
      'source', 'manual',
      'target', coalesce((select weekly_target from users where id = auth.uid()), 5),
      'done', (
        select count(*)
        from bookings
        where (seeker_id = auth.uid() or companion_id = auth.uid())
          and status = 'completed'
          and completed_at >= date_trunc('week', now())
      )
    )
  end;
$$;

revoke all on function active_training_plan_id() from public, anon, authenticated;
revoke all on function set_active_training_plan(uuid) from public, anon, authenticated;
revoke all on function log_exercise_sets(uuid, int, int, text, jsonb, text) from public, anon, authenticated;
revoke all on function workout_day_logs(uuid, int, int) from public, anon, authenticated;
revoke all on function exercise_history(text, int) from public, anon, authenticated;
revoke all on function complete_workout(uuid, int, int) from public, anon, authenticated;
revoke all on function app_today() from public, anon;

grant execute on function active_training_plan_id() to authenticated;
grant execute on function set_active_training_plan(uuid) to authenticated;
grant execute on function log_exercise_sets(uuid, int, int, text, jsonb, text) to authenticated;
grant execute on function workout_day_logs(uuid, int, int) to authenticated;
grant execute on function exercise_history(text, int) to authenticated;
grant execute on function complete_workout(uuid, int, int) to authenticated;
grant execute on function app_today() to authenticated;
grant execute on function weekly_progress() to authenticated;

-- ─── Exercise catalog: machines split out of broader equipment entries ──────
-- The generated seed (backend/seeds/03_ai_plan_exercises.sql) already has
-- these; the seed only loads on `db reset`, so update the live rows here.
update exercises set equipment = array['lateral_raise_machine'] where slug = 'machine-lateral-raise';
update exercises set equipment = array['chest_supported_row_machine'] where slug = 'chest-supported-row';
update exercises set equipment = array['lying_leg_curl_machine'] where slug = 'lying-leg-curl';
