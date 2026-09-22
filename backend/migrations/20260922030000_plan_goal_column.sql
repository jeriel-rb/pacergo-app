-- "My Plans" / plan overview show a plan's title as a plain string frozen at
-- save time in whatever locale was active then — switching the UI language
-- afterward never re-translates it (e.g. "Build Muscle" stays English even
-- when viewing in zh). Fix: promote `goal` out of `onboarding_snapshot`
-- (JSONB) into its own column — same pattern `user_onboarding.goal` already
-- uses — so the client can look up a live-translated label from the goal
-- key instead of trusting the stored text. `label` itself stays as the
-- fallback for older rows or an unrecognized/missing goal.
--
-- Already applied on remote (MCP). Folded into 0001_init.sql CREATE TABLE +
-- RPCs for fresh resets; this file stays idempotent for existing DBs.

alter table user_training_plans add column if not exists goal text;

update user_training_plans
set goal = onboarding_snapshot -> 'answers' ->> 'goal'
where goal is null;

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

  return v_id;
end $$;

create or replace function update_training_plan(
  p_id uuid,
  p_label text,
  p_plan jsonb,
  p_onboarding_snapshot jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_label, '')) = 0 or char_length(p_label) > 120 then
    raise exception 'invalid label';
  end if;
  if p_plan is null then raise exception 'missing plan'; end if;

  update user_training_plans set
    label = p_label,
    plan = p_plan,
    onboarding_snapshot = coalesce(p_onboarding_snapshot, '{}'::jsonb),
    goal = p_onboarding_snapshot -> 'answers' ->> 'goal'
  where id = p_id and user_id = auth.uid();

  if not found then raise exception 'plan not found'; end if;
end $$;
