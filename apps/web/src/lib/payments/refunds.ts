import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCreditCardCancelAuthRequest,
  buildCreditCardRefundRequest,
  buildTradeInfoQuery,
  type NewebPayConfig,
  type NewebPayForm,
} from "./newebpay";

export type ReturnCardPaymentResult =
  | { outcome: "returned"; via: "void" | "refund" | "already" }
  | { outcome: "manual_required"; reason: string };

type TradeState = {
  TradeStatus?: string;
  /** Capture: 0 not yet, 1 queued, 2 processing, 3 done. */
  CloseStatus?: string;
  /** Refund: 0 none, 1 queued, 2 processing, 3 done. */
  BackStatus?: string;
};

/**
 * Give a paid NewebPay card charge back to the member, picking the call that
 * NewebPay accepts for the charge's current state (looked up first):
 *   - not captured yet (CloseStatus 0)  -> void the authorization (NPA-B01);
 *     a refund is rejected until the nightly capture has run
 *   - captured (CloseStatus 3)          -> refund (NPA-B032)
 *   - already voided / refund under way -> nothing to send
 *   - capture in flight (1, 2) or any failure -> staff finish it by hand
 * Never retries a mutating call, so a slow gateway can't cause a double refund.
 */
export async function returnCardPayment(input: {
  config: NewebPayConfig;
  payment: { merchantOrderNo: string; tradeNo: string | null; amount: number };
  fetchImpl?: typeof fetch;
}): Promise<ReturnCardPaymentResult> {
  const { config, payment } = input;
  const post = (form: NewebPayForm) =>
    (input.fetchImpl ?? fetch)(form.action, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form.fields).toString(),
      cache: "no-store",
    });

  let trade: TradeState;
  try {
    const res = await post(
      buildTradeInfoQuery({ config, merchantOrderNo: payment.merchantOrderNo, amount: payment.amount }),
    );
    const body = (await res.json().catch(() => null)) as
      | { Status?: unknown; Result?: TradeState }
      | null;
    if (!res.ok || body?.Status !== "SUCCESS" || !body.Result) {
      return { outcome: "manual_required", reason: "query_failed" };
    }
    trade = body.Result;
  } catch {
    return { outcome: "manual_required", reason: "query_unavailable" };
  }

  if (trade.TradeStatus === "3" || (trade.BackStatus && trade.BackStatus !== "0")) {
    return { outcome: "returned", via: "already" };
  }

  let via: "void" | "refund";
  let form: NewebPayForm;
  if (trade.CloseStatus === "0") {
    via = "void";
    form = buildCreditCardCancelAuthRequest({ config, ...payment });
  } else if (trade.CloseStatus === "3") {
    via = "refund";
    form = buildCreditCardRefundRequest({
      config,
      merchantOrderNo: payment.merchantOrderNo,
      amount: payment.amount,
    });
  } else {
    return { outcome: "manual_required", reason: `capture_status_${trade.CloseStatus ?? "unknown"}` };
  }

  try {
    const res = await post(form);
    const body = (await res.json().catch(() => null)) as { Status?: unknown } | null;
    if (!res.ok || body?.Status !== "SUCCESS") {
      return {
        outcome: "manual_required",
        reason: typeof body?.Status === "string" ? body.Status : `http_${res.status}`,
      };
    }
  } catch {
    return { outcome: "manual_required", reason: `${via}_unavailable` };
  }
  return { outcome: "returned", via };
}

export type RefundCandidate = {
  id: string;
  merchant_order_no: string;
  provider_trade_no: string | null;
  amount: number;
  payment_method: string | null;
};

/**
 * For a paid NewebPay payment already flagged refund_requested: give the money
 * back (card payments only; see returnCardPayment) and record it with the
 * service-role client. Anything else stays refund_requested for staff to
 * refund in NewebPay's portal and then mark refunded. Used by the trainer's
 * cancel and by admin "Issue refund".
 */
export async function completeNewebPayRefund(input: {
  admin: SupabaseClient;
  config: NewebPayConfig;
  payment: RefundCandidate;
  fetchImpl?: typeof fetch;
}): Promise<{ refund: "automatic" } | { refund: "manual_required"; reason: string }> {
  const { admin, payment } = input;
  if (!payment.payment_method?.toUpperCase().includes("CREDIT")) {
    return { refund: "manual_required", reason: "not_card" };
  }

  const result = await returnCardPayment({
    config: input.config,
    payment: {
      merchantOrderNo: payment.merchant_order_no,
      tradeNo: payment.provider_trade_no,
      amount: payment.amount,
    },
    fetchImpl: input.fetchImpl,
  });
  if (result.outcome !== "returned") {
    console.warn("newebpay_automatic_refund_failed", { paymentId: payment.id, reason: result.reason });
    return { refund: "manual_required", reason: result.reason };
  }

  const { error } = await admin.rpc("record_newebpay_refund", {
    p_payment_id: payment.id,
    p_provider_trade_no: payment.provider_trade_no,
  });
  if (error) {
    // Do not retry a successful gateway call: it could create a duplicate
    // refund. Leave the ledger in refund_requested for reconciliation.
    console.error("newebpay_automatic_refund_record_failed", { paymentId: payment.id });
    return { refund: "manual_required", reason: "record_failed" };
  }
  console.info("newebpay_automatic_refund_done", { paymentId: payment.id, via: result.via });
  return { refund: "automatic" };
}
