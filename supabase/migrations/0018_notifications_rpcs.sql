-- Notifications reads via RPCs. Rows are created by the notify_booking_event
-- trigger (0006); these expose them to the web client.

-- The caller's notifications (newest 50).
create or replace function my_notifications()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
  from (
    select id, type, payload, read_at, created_at
    from notifications
    where user_id = auth.uid()
    order by created_at desc
    limit 50
  ) n;
$$;

-- Count of the caller's unread notifications (for the bell badge).
create or replace function unread_notification_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from notifications
  where user_id = auth.uid() and read_at is null;
$$;

-- Mark all the caller's notifications read.
create or replace function mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

grant execute on function my_notifications() to authenticated;
grant execute on function unread_notification_count() to authenticated;
grant execute on function mark_notifications_read() to authenticated;
