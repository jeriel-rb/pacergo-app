-- Phase 2 Stage 4 (docs/phase2-execution-order.md): B-2 payment-provider
-- abstraction, database side. Mirrors create_newebpay_payment_attempt (0033)
-- with provider='simulated' instead of 'newebpay' — kept as a separate
-- function rather than parameterizing the existing one, since the existing
-- function is already relied on by the live NewebPay route and duplicating a
-- ~40-line function is lower-risk than changing it (§8.4 "live cutover is
-- config-only" implies the live path shouldn't need to change for this).
--
-- Confirmation reuses apply_newebpay_notification (0033) as-is: that
-- function is already provider-agnostic (it matches by merchant_order_no
-- and never references "newebpay" in its body), so no new confirmation
-- logic is needed — only a trainee-callable RPC that supplies simulated
-- values in place of a real gateway signature.

create or replace function create_simulated_payment_attempt(
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
  fee record;
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'payment_booking_not_found'; end if;
  if b.seeker_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if b.is_free or b.agreed_price <= 0 then raise exception 'payment_invalid_amount'; end if;
  if b.agreed_price <> p_amount then raise exception 'payment_amount_mismatch'; end if;
  if b.status in ('cancelled', 'completed', 'expired', 'declined') then
    raise exception 'payment_booking_not_payable';
  end if;
  if exists (select 1 from payments where booking_id = p_booking_id and status = 'paid') then
    raise exception 'payment_already_paid';
  end if;

  select * into existing
  from payments
  where booking_id = p_booking_id
    and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at > now() - interval '30 minutes'
  order by created_at desc limit 1 for update;
  if found then raise exception 'payment_attempt_in_progress'; end if;

  select * into fee from compute_order_fee_split(p_amount);

  insert into payments (
    booking_id, user_id, provider, merchant_order_no, amount, currency, status,
    gross_amount, platform_fee_amount, trainer_payable
  ) values (
    p_booking_id, v_uid, 'simulated', p_merchant_order_no, p_amount, 'TWD', 'created',
    p_amount, fee.platform_fee_amount, fee.trainer_payable
  )
  returning * into inserted;

  update bookings
  set status = 'payment_processing'
  where id = p_booking_id and status not in ('cancelled', 'completed', 'expired', 'declined');

  return jsonb_build_object(
    'id', inserted.id,
    'booking_id', inserted.booking_id,
    'merchant_order_no', inserted.merchant_order_no,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'status', inserted.status
  );
end $$;
grant execute on function create_simulated_payment_attempt(uuid, text, int) to authenticated;

-- Trainee-callable "gateway" for the simulated provider — an explicit
-- approve/decline in place of NewebPay's hosted page + real NotifyURL.
-- Clearly test-only: only ever touches rows this same user owns and with
-- provider='simulated', so it can never be used to fake a live payment.
create or replace function confirm_simulated_payment(
  p_payment_id uuid,
  p_approve boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_order_not_found'; end if;
  if pay.user_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if pay.provider <> 'simulated' then raise exception 'payment_not_simulated'; end if;
  if pay.status not in ('created', 'redirected', 'processing') then
    raise exception 'payment_not_pending';
  end if;

  perform apply_newebpay_notification(
    pay.merchant_order_no,
    pay.amount,
    'SIM-' || left(pay.id::text, 8),
    case when p_approve then 'SUCCESS' else 'DECLINED' end,
    'SIMULATED',
    case when p_approve then '0000' else 'SIM_DECLINE' end,
    case when p_approve then 'Simulated approval (Phase 1 test payment)'
         else 'Simulated decline (Phase 1 test payment)' end,
    '{}'::jsonb,
    case when p_approve then 'paid'::payment_status else 'failed'::payment_status end
  );
end $$;
grant execute on function confirm_simulated_payment(uuid, boolean) to authenticated;

-- The simulated review/result screens reuse the existing payment_detail()
-- RPC (0033) — already owner-gated (p.user_id = auth.uid()) and already
-- returns everything the UI needs (status, amount, booking). No new getter
-- needed; payment_detail's `booking` join doesn't reference "newebpay"
-- either, so it's already provider-agnostic.
