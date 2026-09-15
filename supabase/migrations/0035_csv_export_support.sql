-- Phase 2 (Scope B) prerequisites for the admin CSV export (B-9) and the
-- order/payout data model (B-1, B-3, B-5, B-6, B-7, B-8).
--
-- Backward-compatible: every new column is nullable or has a safe default so
-- existing payments rows stay valid until Phase-2 checkout code starts
-- populating the fee / settlement fields. Apply with `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. Payment-order enrichment: platform fee split + refund + settlement.
--    Phase 1 pricing model: customer pays `gross_amount`; platform takes 5%
--    (`platform_fee_amount`); trainer payable = `trainer_payable` (95%).
--    `processing_fee_*` records the gateway fee where exposed (not deducted
--    from the trainer's 95%).
--    Rounding is not applied at storage; the 5% rate is stored on the row so
--    exports are reproducible. (Rounding policy is a Phase 2 open item.)
-- ---------------------------------------------------------------------------

-- Fee split (B-1, B-3, B-9 columns: gross / platform-fee rate & amount /
-- processing-fee rate & amount / trainer payable).
alter table payments
  add column if not exists gross_amount int,
  add column if not exists platform_fee_rate numeric(5,4) not null default 0.05,
  add column if not exists platform_fee_amount int not null default 0,
  add column if not exists processing_fee_rate numeric(5,4),
  add column if not exists processing_fee_amount int,
  add column if not exists trainer_payable int;

-- Refund status (B-5).
do $$ begin
  create type payment_refund_status as enum
    ('none', 'refund_requested', 'refunded');
exception when duplicate_object then null; end $$;
alter table payments
  add column if not exists refund_status payment_refund_status not null default 'none';

-- Settlement state machine (B-6) + statuses (B-3).
do $$ begin
  create type settlement_status as enum ('unsettled', 'paid');
exception when duplicate_object then null; end $$;
do $$ begin
  create type settlement_eligibility_status as enum ('ineligible', 'eligible');
exception when duplicate_object then null; end $$;

alter table payments
  add column if not exists service_completed_at timestamptz,
  add column if not exists settlement_hold_until timestamptz,
  add column if not exists settlement_eligibility_status settlement_eligibility_status not null default 'ineligible',
  add column if not exists settlement_status settlement_status not null default 'unsettled',
  add column if not exists settled_at timestamptz;

-- Allow a simulated provider alongside live newebpay (Phase 1 simulated vs
-- Phase 2 live, B-2/B-3). The 0033 constraint is inline (auto-named by Postgres),
-- so drop it dynamically by matching its conname, then re-add an explicit one.
do $$
declare
  cn text;
begin
  select conname into cn
  from pg_constraint
  where contype = 'c'
    and conname like 'payments_provider%'
    and conrelid = 'payments'::regclass;
  if cn is not null then
    execute format('alter table payments drop constraint if exists %I', cn);
  end if;
end $$;
alter table payments
  add constraint payments_provider_check
  check (provider in ('newebpay', 'simulated'));
alter table payments alter column provider set default 'newebpay';

-- Backfill legacy rows: treat the stored `amount` as both gross and trainer
-- payable (pre-fee-split era) so historical orders stay consistent in export.
update payments
  set gross_amount = amount,
      trainer_payable = amount,
      platform_fee_amount = 0
  where gross_amount is null;

-- ---------------------------------------------------------------------------
-- 2. Trainer bank details (B-6/B-7/B-8). P-6 (bank field format) is a client
--    prerequisite; columns are nullable so Phase-1 simulated payouts can ship
--    without it. Full data is shown ONLY in the B-8 admin detail view.
-- ---------------------------------------------------------------------------

alter table users
  add column if not exists bank_account text;        -- raw; format per P-6
alter table users
  add column if not exists bank_account_mask text;   -- masked copy for exports/listings

-- ---------------------------------------------------------------------------
-- 3. Withdrawal requests (B-6/B-7/B-8). Trainer requests a payout from their
--    available balance; the platform tracks state only (the actual transfer is
--    manual / per P-6). `bank_account_mask` holds only the masked value.
-- ---------------------------------------------------------------------------

create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references users (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  amount int not null check (amount > 0),
  bank_account_mask text not null,      -- masked; never the raw account here
  status text not null default 'requested'
    check (status in ('requested','processing','paid','rejected','cancelled')),
  reason_note text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists withdrawal_requests_trainer_idx
  on withdrawal_requests (trainer_id, requested_at desc);
create index if not exists withdrawal_requests_status_idx
  on withdrawal_requests (status);

drop trigger if exists withdrawal_requests_set_updated_at on withdrawal_requests;
create trigger withdrawal_requests_set_updated_at
  before update on withdrawal_requests
  for each row execute function set_updated_at();

alter table withdrawal_requests enable row level security;

-- Row-level: a trainer can read only their own withdrawal rows. Admin reads go
-- through the SECURITY DEFINER RPCs below, which bypass RLS for the export.
drop policy if exists "withdrawal_requests trainer read" on withdrawal_requests;
create policy "withdrawal_requests trainer read"
  on withdrawal_requests for select to authenticated
  using (trainer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Admin export RPCs (B-9). SECURITY DEFINER; admin-gated via
--    is_platform_admin(); return jsonb arrays so the TS layer projects the exact
--    B-9 column sets without clients querying tables directly (A-8).
--    Each inner subquery exposes the ordering columns as bare columns so the
--    outer jsonb_agg can ORDER BY them.
-- ---------------------------------------------------------------------------

-- Users export (safe profile columns only; email lives in auth.users and
-- is intentionally excluded — PII, cross-schema). `bank_account` / `push_token`
-- must NEVER appear in a bulk export.
create or replace function admin_export_users()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select u.created_at, u.id, jsonb_build_object(
      'id', u.id,
      'display_name', u.display_name,
      'home_area', u.home_area,
      'experience_level', u.experience_level,
      'is_companion', u.is_companion,
      'is_admin', u.is_admin,
      'created_at', u.created_at
    ) as obj
    from users u
  ) s;
  return v;
end $$;

-- Trainers export: listed companions only (has an active companion_listing),
-- with their headline tier / price and rating. Email excluded (PII).
create or replace function admin_export_trainers()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select p.created_at, p.id, jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'home_area', p.home_area,
      'experience_level', p.experience_level,
      'tier', h.tier,
      'price_ntd', h.price_ntd,
      'is_free', h.is_free,
      'rating_avg', coalesce(l.rating_avg, 0),
      'rating_count', coalesce(l.rating_count, 0),
      'is_companion', p.is_companion,
      'created_at', p.created_at
    ) as obj
    from users p
    join companion_listings l on l.user_id = p.id and l.status = 'active'
    left join lateral (
      select o.tier, o.price_ntd, o.is_free
      from listing_offerings o
      where o.listing_id = l.id
      order by o.tier asc, o.price_ntd desc
      limit 1
    ) h on true
  ) s;
  return v;
end $$;

-- Orders / bookings export with fee split + settlement / refund statuses.
-- payments.user_id is the seeker; the trainer is bookings.companion_id.
create or replace function admin_export_orders()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select pay.created_at, pay.id, jsonb_build_object(
      'booking_id', b.id,
      'seeker_id', b.seeker_id,
      'seeker_name', b.seeker_name,
      'companion_id', b.companion_id,
      'companion_name', b.companion_name,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'payment_id', pay.id,
      'merchant_order_no', pay.merchant_order_no,
      'provider_trade_no', pay.provider_trade_no,
      'provider', pay.provider,
      'provider_type', pay.provider,
      'gross_amount', pay.gross_amount,
      'platform_fee_rate', pay.platform_fee_rate,
      'platform_fee_amount', pay.platform_fee_amount,
      'processing_fee_rate', pay.processing_fee_rate,
      'processing_fee_amount', pay.processing_fee_amount,
      'trainer_payable', pay.trainer_payable,
      'payment_status', pay.status,
      'refund_status', pay.refund_status,
      'service_completed_at', pay.service_completed_at,
      'settlement_hold_until', pay.settlement_hold_until,
      'settlement_eligibility_status', pay.settlement_eligibility_status,
      'settlement_status', pay.settlement_status,
      'paid_at', pay.paid_at,
      'failed_at', pay.failed_at,
      'expired_at', pay.expired_at,
      'created_at', pay.created_at
    ) as obj
    from payments pay
    join bookings b on b.id = pay.booking_id
  ) s;
  return v;
end $$;

-- Withdrawal requests export (masked bank only).
create or replace function admin_export_withdrawals()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.requested_at asc, s.id), '[]'::jsonb) into v
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'trainer_id', w.trainer_id,
      'trainer_name', t.display_name,
      'amount', w.amount,
      'bank_account_mask', w.bank_account_mask,
      'status', w.status,
      'reason_note', w.reason_note,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at,
      'settled_at', w.settled_at
    ) as obj
    from withdrawal_requests w
    join users t on t.id = w.trainer_id
  ) s;
  return v;
end $$;

grant execute on function admin_export_users() to authenticated;
grant execute on function admin_export_trainers() to authenticated;
grant execute on function admin_export_orders() to authenticated;
grant execute on function admin_export_withdrawals() to authenticated;
