import { NextResponse } from "next/server";
import { buildCreditCardRefundRequest, getNewebPayConfig } from "@/lib/payments/newebpay";
import { forbidCrossSiteOrigin } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type RefundCandidate = {
  id: string;
  merchant_order_no: string;
  provider_trade_no: string | null;
  amount: number;
  payment_method: string | null;
};

/**
 * Cancel through the server so a companion's cancellation can immediately
 * refund a paid credit-card transaction.  The database still makes the
 * cancellation/refund-request state transition first, which keeps a gateway
 * outage safe: staff can complete any failed external refund manually.
 */
export async function POST(request: Request, { params }: Params) {
  const originBlock = forbidCrossSiteOrigin(request);
  if (originBlock) return originBlock;

  const { id: bookingId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return response({ error: "booking_unauthenticated" }, 401);

  const admin = createSupabaseAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, seeker_id, companion_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) return response({ error: "booking_lookup_failed" }, 500);
  if (!booking) return response({ error: "booking_not_found" }, 404);
  if (booking.seeker_id !== user.id && booking.companion_id !== user.id) {
    return response({ error: "booking_not_allowed" }, 403);
  }

  const { error: cancelError } = await supabase.rpc("cancel_booking", { p_id: bookingId });
  if (cancelError) return response({ error: "booking_cancel_not_allowed" }, 409);

  // Only a companion cancellation is automatically refunded.  A seeker
  // cancellation keeps the existing policy: it is recorded for admin review.
  if (booking.companion_id !== user.id) {
    return response({ cancelled: true, refund: "not_applicable" });
  }

  const { data: candidates, error: candidatesError } = await admin
    .from("payments")
    .select("id, merchant_order_no, provider_trade_no, amount, payment_method")
    .eq("booking_id", bookingId)
    .eq("provider", "newebpay")
    .eq("status", "paid")
    .eq("refund_status", "refund_requested");
  if (candidatesError) return response({ cancelled: true, refund: "manual_required" });

  let automatic = 0;
  let manualRequired = false;
  for (const candidate of (candidates ?? []) as RefundCandidate[]) {
    if (!isCreditCard(candidate.payment_method)) {
      manualRequired = true;
      continue;
    }

    try {
      const config = getNewebPayConfig();
      const refund = buildCreditCardRefundRequest({
        config,
        merchantOrderNo: candidate.merchant_order_no,
        amount: candidate.amount,
      });
      const gatewayResponse = await fetch(refund.action, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(refund.fields).toString(),
        cache: "no-store",
      });
      const body = await gatewayResponse.json().catch(() => null) as { Status?: unknown } | null;
      if (!gatewayResponse.ok || body?.Status !== "SUCCESS") {
        manualRequired = true;
        console.warn("newebpay_automatic_refund_failed", {
          paymentId: candidate.id,
          httpStatus: gatewayResponse.status,
          status: typeof body?.Status === "string" ? body.Status : undefined,
        });
        continue;
      }

      const { error: recordedError } = await admin.rpc("record_newebpay_refund", {
        p_payment_id: candidate.id,
        p_provider_trade_no: candidate.provider_trade_no,
      });
      if (recordedError) {
        // Do not retry a successful gateway call: it could create a duplicate
        // refund.  Leave the ledger in refund_requested for reconciliation.
        manualRequired = true;
        console.error("newebpay_automatic_refund_record_failed", { paymentId: candidate.id });
        continue;
      }
      automatic += 1;
    } catch {
      manualRequired = true;
      console.warn("newebpay_automatic_refund_unavailable", { paymentId: candidate.id });
    }
  }

  return response({
    cancelled: true,
    refund: manualRequired ? "manual_required" : automatic > 0 ? "automatic" : "not_applicable",
  });
}

function isCreditCard(paymentMethod: string | null) {
  return paymentMethod?.toUpperCase().includes("CREDIT") ?? false;
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}
