-- Mobile ⇄ web alignment: close the RPC gaps so the Expo app can drop its
-- remaining direct table reads/writes (RPC-only data access, same as web).

-- ---------------------------------------------------------------------------
-- get_my_profile: add the fields mobile needs for routing/home (onboarding
-- flag, weekly target, admin flag). Restated in full per repo convention.
-- ---------------------------------------------------------------------------
create or replace function get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t) from (
    select display_name, photo_url, banner_url, bio, experience_level, home_area, gender,
           is_companion, onboarding_completed, weekly_target,
           coalesce(is_admin, false) as is_admin
    from users
    where id = auth.uid()
  ) t;
$$;
grant execute on function get_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- complete_onboarding: profile basics + chosen activities in one call
-- (replaces mobile's users UPDATE + raw user_activities INSERT).
-- ---------------------------------------------------------------------------
create or replace function complete_onboarding(
  p_display_name text,
  p_experience_level experience_level,
  p_home_area text,
  p_activity_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  update users set
    display_name = coalesce(nullif(p_display_name, ''), display_name),
    experience_level = coalesce(p_experience_level, experience_level),
    home_area = p_home_area,
    onboarding_completed = true
  where id = v_uid;

  delete from user_activities where user_id = v_uid;
  insert into user_activities (user_id, activity_id)
  select v_uid, unnest(p_activity_ids)
  on conflict do nothing;
end;
$$;
grant execute on function complete_onboarding(text, experience_level, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- set_my_availability: replace-all semantics (mobile edits the whole set).
-- p_slots: [{"weekday":1,"start_minute":1080,"end_minute":1200}, …]
-- ---------------------------------------------------------------------------
create or replace function set_my_availability(p_slots jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  delete from availability where user_id = v_uid;
  insert into availability (user_id, weekday, start_minute, end_minute)
  select v_uid,
         least(greatest((s->>'weekday')::int, 0), 6),
         greatest((s->>'start_minute')::int, 0),
         least((s->>'end_minute')::int, 1440)
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
  where (s->>'end_minute')::int > (s->>'start_minute')::int;
end;
$$;
grant execute on function set_my_availability(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Safety: blocks + reports via RPCs.
-- ---------------------------------------------------------------------------
create or replace function my_blocked_ids()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(blocked_id), '[]'::jsonb)
  from blocks
  where blocker_id = auth.uid();
$$;
grant execute on function my_blocked_ids() to authenticated;

create or replace function block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_user_id then raise exception 'cannot block yourself'; end if;
  insert into blocks (blocker_id, blocked_id)
  values (auth.uid(), p_user_id)
  on conflict do nothing;
end;
$$;
grant execute on function block_user(uuid) to authenticated;

create or replace function unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
$$;
grant execute on function unblock_user(uuid) to authenticated;

create or replace function report_user(
  p_reported_id uuid,
  p_reason text,
  p_details text,
  p_booking_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into reports (reporter_id, reported_id, reason, details, booking_id)
  values (auth.uid(), p_reported_id, p_reason, nullif(p_details, ''), p_booking_id)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists get_companion(uuid);
create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;
