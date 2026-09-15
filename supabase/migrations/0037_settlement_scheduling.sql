-- Phase 2 Scope B gap-fix: the fee split (B-1) and 30-min order expiry (B-1)
-- were added as *columns* in 0035 but nothing ever wrote or scheduled them.
-- This migration wires the write path. It does NOT touch B-2 (provider
-- abstraction), B-6/B-7/B-8 (settlement state machine / payout admin) — those
-- are separate, larger pieces sequenced after this one in
-- docs/phase2-execution-order.md Stage 3/4. Keeping this migration narrowly
-- scoped to "make the columns that already exist actually correct" avoids
-- building settlement/payout logic against a fee split that isn't real yet.

-- ---------------------------------------------------------------------------
-- 1. Fee-split formula, isolated in one function.
--
--    TODO(pending client confirmation — see docs/phase2-work-tracker.md
--    Decisions log, "Fee rounding rule"): the rounding MODE below (round half
--    up) is a placeholder, not a confirmed business rule. It is written as a
--    single small function with one clearly-named constant so changing the
--    rate or the rounding mode later is a one-line edit here, not a hunt
--    through every place that computes a fee.
--
--    Formula: platform_fee_amount = round_half_up(gross_amount * rate)
--             trainer_payable      = gross_amount - platform_fee_amount
--    (Processing fee is recorded separately where the provider exposes it —
--    §5.1: "not deducted from trainer 95%" — so it never enters this split.)
-- ---------------------------------------------------------------------------

create or replace function compute_order_fee_split(
  p_gross_amount int,
  p_platform_fee_rate numeric default 0.05  -- named constant, not a magic number
) returns table (platform_fee_amount int, trainer_payable int)
language sql
immutable
as $$
  select
    round(p_gross_amount * p_platform_fee_rate)::int as platform_fee_amount,
    p_gross_amount - round(p_gross_amount * p_platform_fee_rate)::int as trainer_payable;
$$;

comment on function compute_order_fee_split(int, numeric) is
  'TODO(pending client confirmation): rounding mode (round-half-up via Postgres round()) is a placeholder. Change here only — every caller reads the result, none re-implement the formula.';

-- ---------------------------------------------------------------------------
-- 2. Populate the fee split at order-creation time, not just at export time.
--    `create_newebpay_payment_attempt` (0033) inserts the payments row with
--    only `amount` set; extend it to also set gross_amount/platform_fee_*/
--    trainer_payable using the function above. Re-declaring the whole
--    function (not just patching) because `create or replace` needs the
--    complete body — this is a copy of 0033's version with one insert
--    changed; see the "-- CHANGED" markers.
-- ---------------------------------------------------------------------------

create or replace function create_newebpay_payment_attempt(
  p_booking_id uuid,
  p_merchant_order_no text,
  p_amount int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  existing record;
  inserted payments%rowtype;
  fee record; -- CHANGED: holds compute_order_fee_split() output
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into b
  from bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'payment_booking_not_found'; end if;
  if b.seeker_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if b.is_free or b.agreed_price <= 0 then raise exception 'payment_invalid_amount'; end if;
  if b.agreed_price <> p_amount then raise exception 'payment_amount_mismatch'; end if;
  if b.status in ('cancelled', 'completed', 'expired', 'declined') then
    raise exception 'payment_booking_not_payable';
  end if;
  if exists (
    select 1 from payments
    where booking_id = p_booking_id and status = 'paid'
  ) then
    raise exception 'payment_already_paid';
  end if;

  select * into existing
  from payments
  where booking_id = p_booking_id
    and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at > now() - interval '30 minutes'
  order by created_at desc
  limit 1
  for update;

  if found then raise exception 'payment_attempt_in_progress'; end if;

  select * into fee from compute_order_fee_split(p_amount); -- CHANGED

  insert into payments (
    booking_id, user_id, provider, merchant_order_no, amount, currency, status,
    gross_amount, platform_fee_amount, trainer_payable -- CHANGED
  ) values (
    p_booking_id, v_uid, 'newebpay', p_merchant_order_no, p_amount, 'TWD', 'created',
    p_amount, fee.platform_fee_amount, fee.trainer_payable -- CHANGED
  )
  returning * into inserted;

  update bookings
  set status = 'payment_processing'
  where id = p_booking_id
    and status not in ('cancelled', 'completed', 'expired', 'declined');

  return jsonb_build_object(
    'id', inserted.id,
    'booking_id', inserted.booking_id,
    'merchant_order_no', inserted.merchant_order_no,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'status', inserted.status,
    'booking', jsonb_build_object(
      'id', b.id,
      'seeker_id', b.seeker_id,
      'companion_id', b.companion_id,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. 30-minute unpaid-order expiry (B-1), automated via pg_cron.
--
--    Why pg_cron and not Vercel Cron: confirmed via research (2026-09-15) that
--    pg_cron is available on Supabase's Free plan at no extra cost (just
--    `create extension`), while Vercel's Hobby-plan Cron Jobs are capped at
--    once per day — far too coarse for a 30-minute expiry window. Using
--    pg_cron also means the job runs next to the data with no network hop,
--    and needs no new deployment target.
--
--    Why a plain internal function, not a `SECURITY DEFINER` RPC granted to
--    `authenticated`: pg_cron jobs execute as the role that scheduled them
--    (the Postgres superuser/owner role), NOT as a request-scoped user, so
--    `auth.uid()` is NULL inside a cron-invoked function. This function must
--    never be reachable by a normal user session — it has no `grant execute`
--    to `anon`/`authenticated` at all, only pg_cron (running as the table
--    owner) can call it.
--
--    What "release the slot" means here: there is no separate time-slot
--    table in this schema (see docs/phase2-work-tracker.md Decisions log).
--    `create_booking` blocks a new booking only if an existing booking with
--    that companion is still in an "open" status. Moving the stale booking to
--    'expired' removes it from that check, which is the entire "release."
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

create or replace function expire_stale_payment_attempts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Payments left in a non-terminal state past the 30-minute window
  -- (`create_newebpay_payment_attempt` already uses the same 30-minute
  -- constant for its in-progress lockout check, so this reuses that number
  -- rather than inventing a second one).
  update payments
  set status = 'expired',
      expired_at = coalesce(expired_at, now())
  where status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at <= now() - interval '30 minutes';

  -- Release the paired booking (see comment block above) — only bookings
  -- still sitting in a pre-payment/processing state; never touch a booking
  -- that already succeeded, was cancelled, or completed through another path.
  update bookings b
  set status = 'expired'
  from payments p
  where p.booking_id = b.id
    and p.status = 'expired'
    and p.expired_at >= now() - interval '1 minute' -- only rows this run just touched
    and b.status in ('pending_payment', 'payment_processing');
end $$;

comment on function expire_stale_payment_attempts() is
  'Called only by pg_cron (see cron.schedule below). Not granted to anon/authenticated — auth.uid() is NULL in a cron context, so this must stay unreachable from a user session.';

-- Every 5 minutes: frequent enough that a 30-minute window is enforced within
-- a tight margin, infrequent enough to be a trivial load on a free-tier DB.
-- `cron.schedule()` upserts by job name (confirmed against Supabase's docs,
-- 2026-09-15: calling it again with the same name replaces the existing job
-- rather than erroring or duplicating it), so this is safe to re-run as-is —
-- no existence check needed.
select cron.schedule(
  'expire-stale-payment-attempts',
  '*/5 * * * *',
  $$select expire_stale_payment_attempts()$$
);
