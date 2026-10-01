-- Fix duplicate booking/payment notifications (fired 2x-4x on a single
-- payment success / booking confirmation).
--
-- Root cause: notify_booking_event() inserts a row into `notifications` on
-- every booking status transition, but nothing enforced one notification per
-- (user, booking, type). Two independent code paths can each push a booking
-- through the same transition and race each other:
--   - apps/web .../api/payments/newebpay/return  -> observe_newebpay_return()
--   - apps/web .../api/payments/newebpay/notify   -> apply_newebpay_notification()
-- NewebPay calls the return URL (browser redirect, can double-submit on
-- retry/back-button) and the notify webhook (server-to-server, retried by
-- the gateway on any non-2xx/timeout) independently for the same payment
-- event. Both can observe the same "old status" before either transaction
-- commits and each insert their own notification row, since the trigger had
-- no idempotency guard beyond "status changed since NEW vs OLD in this row".
--
-- Fix: give `notifications` a real `booking_id` column (promoted out of the
-- jsonb payload) and a unique index on (user_id, booking_id, type). The
-- trigger then uses `on conflict do nothing`, so re-entering the same
-- logical transition from a retried webhook or a raced concurrent
-- transaction is a true no-op instead of a race to insert.

alter table notifications
  add column if not exists booking_id uuid references bookings (id) on delete cascade;

update notifications
set booking_id = (payload ->> 'booking_id')::uuid
where booking_id is null
  and payload ? 'booking_id';

-- Existing data already holds the duplicates this migration is fixing, and
-- the unique index below can't be built over them. Keep one row per
-- (recipient, booking, type) — a copy the user already read if there is one
-- (so an old notification doesn't come back as unread), otherwise the
-- earliest — and delete the extra copies.
delete from notifications n
using (
  select id,
         row_number() over (
           partition by user_id, booking_id, type
           order by (read_at is null), created_at, id
         ) as rn
  from notifications
  where booking_id is not null
) ranked
where n.id = ranked.id
  and ranked.rn > 1;

-- One notification per (recipient, booking, type). Booking-less
-- notifications (booking_id null) are untouched by this constraint.
create unique index if not exists notifications_one_per_booking_event_idx
  on notifications (user_id, booking_id, type)
  where booking_id is not null;

create or replace function notify_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  ntype text;
begin
  if (tg_op = 'INSERT') then
    recipient := new.companion_id; ntype := 'booking_requested';
  elsif (new.status is distinct from old.status) then
    ntype := 'booking_' || new.status;
    if new.status in ('accepted', 'declined') then
      recipient := new.seeker_id;
    elsif new.status = 'cancelled' and new.cancelled_by is not null then
      recipient := case when new.cancelled_by = new.seeker_id then new.companion_id else new.seeker_id end;
    else
      recipient := new.seeker_id;
    end if;
  else
    return new;
  end if;

  insert into notifications (user_id, type, booking_id, payload)
  values (recipient, ntype, new.id, jsonb_build_object('booking_id', new.id, 'status', new.status))
  on conflict (user_id, booking_id, type) where booking_id is not null do nothing;

  return new;
end $$;
