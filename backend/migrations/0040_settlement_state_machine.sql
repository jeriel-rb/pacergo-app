-- Phase 2 Stage 3 step 1 (docs/phase2-execution-order.md): B-6 settlement
-- state machine, backend only. Builds on 0035 (payments fee-split/settlement
-- columns) and 0037 (cron infra + fee-split write path). No UI in this
-- migration — B-4/B-7/B-8 (steps 4-6) read the functions/columns here.
--
-- State machine per order (spec §5.2 B-6):
--   session end time passes -> Service Completed (auto; admin can correct)
--   -> 24h hold -> Eligible for Payout (iff paid, not cancelled, not
--   refunded, no dispute/admin hold).

-- ---------------------------------------------------------------------------
-- 1. Dispute / admin-hold flag (B-6 eligibility condition "no unresolved
--    dispute or admin hold" — B-X12 excludes real dispute-resolution tooling,
--    so this is deliberately just a manual flag + reason note, not a workflow).
-- ---------------------------------------------------------------------------

alter table payments
  add column if not exists admin_hold boolean not null default false,
  add column if not exists admin_hold_reason text,
  add column if not exists admin_hold_by uuid references users (id) on delete set null,
  add column if not exists admin_hold_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Audit log for admin corrections/actions on a payment (B-6, B-8: "each
--    change logs timestamp + acting admin"). Cron-driven automatic
--    transitions are also logged here with actor_id null, so the full
--    history (auto + admin) is one queryable trail per payment.
-- ---------------------------------------------------------------------------

create table if not exists payment_status_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  event_type text not null,
  from_value text,
  to_value text,
  reason_note text,
  actor_id uuid references users (id) on delete set null, -- null = system/cron
  created_at timestamptz not null default now()
);
create index if not exists payment_status_events_payment_idx
  on payment_status_events (payment_id, created_at desc);

alter table payment_status_events enable row level security;
-- No direct client policies: written only by SECURITY DEFINER functions
-- below, read only via the admin RPCs in the next migration (B-8 history).

-- ---------------------------------------------------------------------------
-- 3. Trainer can read their own orders (B-4). The 0033 "payments owner read"
--    policy only covers the seeker (payments.user_id); add the mirror for
--    the trainer side (bookings.companion_id).
-- ---------------------------------------------------------------------------

drop policy if exists "payments trainer read" on payments;
create policy "payments trainer read"
  on payments for select to authenticated
  using (exists (
    select 1 from bookings b
    where b.id = payments.booking_id and b.companion_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Service Completed — automatic (cron) + admin correction.
-- ---------------------------------------------------------------------------

create or replace function mark_service_completed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select pay.id
    from payments pay
    join bookings b on b.id = pay.booking_id
    where pay.status = 'paid'
      and pay.service_completed_at is null
      and b.scheduled_start is not null
      and b.scheduled_start + make_interval(mins => b.duration_min) <= now()
  loop
    update payments
    set service_completed_at = now(),
        settlement_hold_until = now() + interval '24 hours'
    where id = r.id;

    insert into payment_status_events (payment_id, event_type, to_value, actor_id)
    values (r.id, 'service_completed_auto', now()::text, null);
  end loop;
end $$;

comment on function mark_service_completed() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

-- Admin-callable correction (no-show, reschedule error). Required reason,
-- logged. p_completed=false only allowed before settlement (never unwind a
-- paid-out order from here — that is a payout-workflow correction, B-8).
create or replace function admin_correct_service_completed(
  p_payment_id uuid,
  p_completed boolean,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reason_required';
  end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if p_completed then
    if pay.service_completed_at is not null then
      raise exception 'already_service_completed';
    end if;
    update payments
    set service_completed_at = now(),
        settlement_hold_until = now() + interval '24 hours'
    where id = p_payment_id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'service_completed_admin_correction', 'null', now()::text, p_reason, v_uid);
  else
    if pay.settlement_status = 'paid' then
      raise exception 'cannot_revert_settled_payment';
    end if;
    update payments
    set service_completed_at = null,
        settlement_hold_until = null,
        settlement_eligibility_status = 'ineligible'
    where id = p_payment_id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'service_completed_admin_reverted', pay.service_completed_at::text, 'null', p_reason, v_uid);
  end if;
end $$;
grant execute on function admin_correct_service_completed(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Eligibility — automatic (cron), re-evaluated every cycle in both
--    directions so admin_hold / refund changes made between cron runs are
--    reconciled even if the RPCs below didn't already flip the flag inline.
-- ---------------------------------------------------------------------------

create or replace function evaluate_settlement_eligibility()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Grant eligibility: hold has passed, paid, not cancelled/refunded, no hold.
  update payments
  set settlement_eligibility_status = 'eligible'
  where settlement_eligibility_status = 'ineligible'
    and settlement_status = 'unsettled'
    and status = 'paid'
    and refund_status = 'none'
    and admin_hold = false
    and service_completed_at is not null
    and settlement_hold_until is not null
    and settlement_hold_until <= now();

  -- Revoke eligibility: something changed after the row was already marked
  -- eligible but before it was settled (refund/hold applied out of band).
  update payments
  set settlement_eligibility_status = 'ineligible'
  where settlement_eligibility_status = 'eligible'
    and settlement_status = 'unsettled'
    and (status <> 'paid' or refund_status <> 'none' or admin_hold = true);
end $$;

comment on function evaluate_settlement_eligibility() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

create or replace function run_settlement_cycle()
returns void
language sql
security definer
set search_path = public
as $$
  select mark_service_completed();
  select evaluate_settlement_eligibility();
$$;

select cron.schedule(
  'run-settlement-cycle',
  '*/15 * * * *',
  $$select run_settlement_cycle()$$
);

-- ---------------------------------------------------------------------------
-- 6. Admin hold (dispute flag). Setting it revokes eligibility immediately
--    if the row was already eligible-unsettled; clearing it re-checks the
--    same row inline instead of waiting for the next cron tick.
-- ---------------------------------------------------------------------------

create or replace function admin_set_payment_hold(
  p_payment_id uuid,
  p_hold boolean,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reason_required';
  end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.settlement_status = 'paid' and p_hold then
    raise exception 'cannot_hold_settled_payment';
  end if;

  update payments
  set admin_hold = p_hold,
      admin_hold_reason = p_reason,
      admin_hold_by = v_uid,
      admin_hold_at = now(),
      settlement_eligibility_status = case
        when p_hold then 'ineligible'
        else settlement_eligibility_status
      end
  where id = p_payment_id;

  insert into payment_status_events
    (payment_id, event_type, from_value, to_value, reason_note, actor_id)
  values (
    p_payment_id,
    case when p_hold then 'admin_hold_set' else 'admin_hold_cleared' end,
    pay.admin_hold::text, p_hold::text, p_reason, v_uid
  );

  if not p_hold then
    -- Re-check this single row now rather than waiting up to 15 minutes.
    update payments
    set settlement_eligibility_status = 'eligible'
    where id = p_payment_id
      and settlement_eligibility_status = 'ineligible'
      and settlement_status = 'unsettled'
      and status = 'paid'
      and refund_status = 'none'
      and admin_hold = false
      and service_completed_at is not null
      and settlement_hold_until is not null
      and settlement_hold_until <= now();
  end if;
end $$;
grant execute on function admin_set_payment_hold(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Trainer available balance = sum of eligible, unsettled orders.
-- ---------------------------------------------------------------------------

create or replace function trainer_balance(p_trainer_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(pay.trainer_payable), 0)::int
  from payments pay
  join bookings b on b.id = pay.booking_id
  where b.companion_id = p_trainer_id
    and pay.settlement_eligibility_status = 'eligible'
    and pay.settlement_status = 'unsettled';
$$;

-- Self-service wrapper (trainer's own balance only).
create or replace function my_trainer_balance()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select trainer_balance(auth.uid());
$$;
grant execute on function my_trainer_balance() to authenticated;
