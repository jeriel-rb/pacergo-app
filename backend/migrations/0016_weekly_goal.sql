-- Weekly training target + progress (counts completed sessions this week).

alter table users add column if not exists weekly_target int not null default 5;

-- Set the caller's weekly training target (clamped 1–21).
create or replace function set_weekly_target(p_target int)
returns void
language sql
security definer
set search_path = public
as $$
  update users
  set weekly_target = greatest(1, least(coalesce(p_target, 5), 21))
  where id = auth.uid();
$$;

-- The caller's weekly target and how many sessions they've completed this week.
create or replace function weekly_progress()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'target', coalesce((select weekly_target from users where id = auth.uid()), 5),
    'done', (
      select count(*)
      from bookings
      where (seeker_id = auth.uid() or companion_id = auth.uid())
        and status = 'completed'
        and completed_at >= date_trunc('week', now())
    )
  );
$$;

grant execute on function set_weekly_target(int) to authenticated;
grant execute on function weekly_progress() to authenticated;
