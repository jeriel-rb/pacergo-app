-- Phase 2 Stage 3 steps 2-6 (docs/phase2-execution-order.md): withdrawal
-- request RPC, B-5 admin cancel/refund, B-4 trainer earnings view, B-7 admin
-- payout list, B-8 admin payout detail + workflow + corrections. Builds on
-- 0039 (settlement state machine: trainer_balance(), eligibility columns).
--
-- DOCUMENTED ASSUMPTION (not spec'd, flagged in phase2-work-tracker.md
-- Decisions log): the spec defines trainer balance as "sum of eligible,
-- unsettled orders" and a withdrawal request as an amount <= that balance,
-- but never specifies which underlying orders a paid-out withdrawal actually
-- settles. This migration settles whole orders FIFO (oldest
-- service_completed_at first) until the cumulative trainer_payable covers
-- the withdrawal amount, allowing the last order applied to push the total
-- slightly over the requested amount (never under). This keeps the ledger
-- reconcilable (every settled order is attributable to exactly one
-- withdrawal) without inventing partial-order settlement, which the schema's
-- per-order settlement_status enum ('unsettled'/'paid') can't represent
-- anyway. Reasonable default for Phase 1 simulated payouts; revisit if the
-- client's actual reconciliation process (manual bank transfer) needs exact
-- amounts instead.

-- ---------------------------------------------------------------------------
-- 1. Withdrawal status history (B-8: "each change logs timestamp + acting
--    admin", "full status history" in the detail view).
-- ---------------------------------------------------------------------------

create table if not exists withdrawal_status_events (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references withdrawal_requests (id) on delete cascade,
  from_status text,
  to_status text not null,
  reason_note text,
  actor_id uuid references users (id) on delete set null, -- null = trainer self-request
  created_at timestamptz not null default now()
);
create index if not exists withdrawal_status_events_request_idx
  on withdrawal_status_events (withdrawal_request_id, created_at desc);
alter table withdrawal_status_events enable row level security;
-- No direct client policies: written by SECURITY DEFINER functions only,
-- read via the admin detail RPC (B-8) below.

-- Which specific orders a withdrawal settled (see assumption note above).
create table if not exists withdrawal_settlements (
  withdrawal_request_id uuid not null references withdrawal_requests (id) on delete cascade,
  payment_id uuid not null references payments (id) on delete cascade,
  amount_applied int not null,
  created_at timestamptz not null default now(),
  primary key (withdrawal_request_id, payment_id)
);
alter table withdrawal_settlements enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Withdrawal request (trainer-callable).
-- ---------------------------------------------------------------------------

create or replace function request_withdrawal(p_amount int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
  v_mask text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'withdrawal_unauthenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;

  v_balance := trainer_balance(v_uid);
  if p_amount > v_balance then raise exception 'insufficient_balance'; end if;

  select bank_account_mask into v_mask from users where id = v_uid;
  if v_mask is null then raise exception 'bank_details_missing'; end if;

  insert into withdrawal_requests (trainer_id, amount, bank_account_mask, status)
  values (v_uid, p_amount, v_mask, 'requested')
  returning id into v_id;

  insert into withdrawal_status_events (withdrawal_request_id, from_status, to_status, actor_id)
  values (v_id, null, 'requested', v_uid);

  return v_id;
end $$;
grant execute on function request_withdrawal(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. B-5 · Cancellation & refund status recording (admin action only).
--    p_action: 'cancel' (payments.status -> cancelled),
--              'refund_requested' | 'refunded' (payments.refund_status).
--    Excludes the order from settlement eligibility immediately if it was
--    already eligible-unsettled (mirrors admin_set_payment_hold's pattern).
-- ---------------------------------------------------------------------------

create or replace function admin_set_payment_status(
  p_payment_id uuid,
  p_action text,
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
  if p_action not in ('cancel', 'refund_requested', 'refunded') then
    raise exception 'invalid_action';
  end if;
  if p_reason is null or trim(p_reason) = '' then raise exception 'reason_required'; end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.settlement_status = 'paid' then
    raise exception 'cannot_modify_settled_payment';
  end if;

  if p_action = 'cancel' then
    update payments set status = 'cancelled' where id = p_payment_id;
    insert into payment_status_events (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'admin_cancelled', pay.status::text, 'cancelled', p_reason, v_uid);
  else
    update payments set refund_status = p_action::payment_refund_status where id = p_payment_id;
    insert into payment_status_events (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'admin_refund_status_changed', pay.refund_status::text, p_action, p_reason, v_uid);
  end if;

  -- Immediate downgrade if this row was already eligible-unsettled; the
  -- run_settlement_cycle cron would also catch it, but no reason to wait.
  update payments
  set settlement_eligibility_status = 'ineligible'
  where id = p_payment_id
    and settlement_eligibility_status = 'eligible'
    and settlement_status = 'unsettled';
end $$;
grant execute on function admin_set_payment_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. B-4 · Trainer's own orders (read-only). Replaces a direct client-side
--    table query (§6.3) with a SECURITY DEFINER RPC scoped to auth.uid().
-- ---------------------------------------------------------------------------

create or replace function trainer_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then raise exception 'trainer_orders_unauthenticated'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at desc, s.id), '[]'::jsonb) into v
  from (
    select pay.created_at, pay.id, jsonb_build_object(
      'payment_id', pay.id,
      'booking_id', b.id,
      'seeker_name', b.seeker_name,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'trainer_payable', pay.trainer_payable,
      'payment_status', pay.status,
      'refund_status', pay.refund_status,
      'service_completed_at', pay.service_completed_at,
      'settlement_eligibility_status', pay.settlement_eligibility_status,
      'settlement_status', pay.settlement_status,
      'created_at', pay.created_at
    ) as obj
    from payments pay
    join bookings b on b.id = pay.booking_id
    where b.companion_id = v_uid
  ) s;
  return v;
end $$;
grant execute on function trainer_orders() to authenticated;

-- Trainer's own withdrawal requests (for the same earnings page).
create or replace function my_withdrawal_requests()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then raise exception 'withdrawals_unauthenticated'; end if;
  select coalesce(jsonb_agg(s.obj order by s.requested_at desc, s.id), '[]'::jsonb) into v
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'amount', w.amount,
      'status', w.status,
      'bank_account_mask', w.bank_account_mask,
      'reason_note', w.reason_note,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at,
      'settled_at', w.settled_at
    ) as obj
    from withdrawal_requests w
    where w.trainer_id = v_uid
  ) s;
  return v;
end $$;
grant execute on function my_withdrawal_requests() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Settlement application / reversal helpers (used by the B-8 workflow
--    RPC below). Internal only — not granted to authenticated/anon.
-- ---------------------------------------------------------------------------

create or replace function apply_withdrawal_settlement(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w withdrawal_requests%rowtype;
  v_trainer_id uuid;
  remaining int;
  r record;
begin
  select * into w from withdrawal_requests where id = p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  v_trainer_id := w.trainer_id;
  remaining := w.amount;

  for r in
    select pay.id, pay.trainer_payable
    from payments pay
    join bookings b on b.id = pay.booking_id
    where b.companion_id = v_trainer_id
      and pay.settlement_eligibility_status = 'eligible'
      and pay.settlement_status = 'unsettled'
    order by pay.service_completed_at asc
  loop
    exit when remaining <= 0;
    update payments
    set settlement_status = 'paid', settled_at = now()
    where id = r.id;
    insert into withdrawal_settlements (withdrawal_request_id, payment_id, amount_applied)
    values (p_withdrawal_id, r.id, r.trainer_payable);
    remaining := remaining - r.trainer_payable;
  end loop;

  update withdrawal_requests set settled_at = now() where id = p_withdrawal_id;
end $$;

create or replace function undo_withdrawal_settlement(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
  set settlement_status = 'unsettled', settled_at = null
  where id in (
    select payment_id from withdrawal_settlements where withdrawal_request_id = p_withdrawal_id
  );
  delete from withdrawal_settlements where withdrawal_request_id = p_withdrawal_id;
  update withdrawal_requests set settled_at = null where id = p_withdrawal_id;
end $$;

-- ---------------------------------------------------------------------------
-- 6. B-7 · Admin payout list (filterable, with header totals).
-- ---------------------------------------------------------------------------

create or replace function admin_list_withdrawal_requests(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_rows jsonb;
  v_totals jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status is not null and p_status not in
     ('requested', 'processing', 'paid', 'rejected', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select coalesce(jsonb_agg(s.obj order by s.requested_at desc, s.id), '[]'::jsonb) into v_rows
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'trainer_id', w.trainer_id,
      'trainer_name', t.display_name,
      'amount', w.amount,
      'bank_account_mask', w.bank_account_mask,
      'status', w.status,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at
    ) as obj
    from withdrawal_requests w
    join users t on t.id = w.trainer_id
    where p_status is null or w.status = p_status
  ) s;

  select jsonb_build_object(
    'requested_count', count(*) filter (where status = 'requested'),
    'requested_sum', coalesce(sum(amount) filter (where status = 'requested'), 0),
    'processing_count', count(*) filter (where status = 'processing'),
    'processing_sum', coalesce(sum(amount) filter (where status = 'processing'), 0)
  ) into v_totals
  from withdrawal_requests;

  return jsonb_build_object('rows', v_rows, 'totals', v_totals);
end $$;
grant execute on function admin_list_withdrawal_requests(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. B-8 · Admin payout detail (full bank reveal, admin-only) + full history.
-- ---------------------------------------------------------------------------

create or replace function admin_withdrawal_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v jsonb;
  v_history jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'id', w.id,
    'trainer_id', w.trainer_id,
    'trainer_name', t.display_name,
    'amount', w.amount,
    'status', w.status,
    'reason_note', w.reason_note,
    'requested_at', w.requested_at,
    'updated_at', w.updated_at,
    'settled_at', w.settled_at,
    'bank_code', t.bank_code,
    'bank_name', t.bank_name,
    'branch_name', t.branch_name,
    'bank_account_number', t.bank_account_number,
    'bank_account_holder', t.bank_account_holder
  ) into v
  from withdrawal_requests w
  join users t on t.id = w.trainer_id
  where w.id = p_id;

  if v is null then raise exception 'withdrawal_not_found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'from_status', e.from_status,
    'to_status', e.to_status,
    'reason_note', e.reason_note,
    'actor_id', e.actor_id,
    'actor_name', a.display_name,
    'created_at', e.created_at
  ) order by e.created_at asc), '[]'::jsonb) into v_history
  from withdrawal_status_events e
  left join users a on a.id = e.actor_id
  where e.withdrawal_request_id = p_id;

  return v || jsonb_build_object('history', v_history);
end $$;
grant execute on function admin_withdrawal_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. B-8 · Status workflow + corrections. Forward steps (requested->
--    processing, processing->paid) don't require a reason; every other
--    transition (rejected/cancelled, or any backward "undo") does.
-- ---------------------------------------------------------------------------

create or replace function admin_set_withdrawal_status(
  p_id uuid,
  p_status text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  w withdrawal_requests%rowtype;
  v_forward boolean;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('requested', 'processing', 'paid', 'rejected', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select * into w from withdrawal_requests where id = p_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if w.status = p_status then raise exception 'no_change'; end if;

  v_forward :=
    (w.status = 'requested' and p_status = 'processing') or
    (w.status = 'processing' and p_status = 'paid');

  if not v_forward and (p_reason is null or trim(p_reason) = '') then
    raise exception 'reason_required';
  end if;

  -- Reversing away from 'paid' un-settles the specific orders this
  -- withdrawal covered (see assumption note at top of file).
  if w.status = 'paid' and p_status <> 'paid' then
    perform undo_withdrawal_settlement(p_id);
  end if;

  update withdrawal_requests
  set status = p_status,
      reason_note = case when p_reason is not null and trim(p_reason) <> ''
                          then p_reason else reason_note end
  where id = p_id;

  insert into withdrawal_status_events (withdrawal_request_id, from_status, to_status, reason_note, actor_id)
  values (p_id, w.status, p_status, p_reason, v_uid);

  if p_status = 'paid' then
    perform apply_withdrawal_settlement(p_id);
  end if;
end $$;
grant execute on function admin_set_withdrawal_status(uuid, text, text) to authenticated;
