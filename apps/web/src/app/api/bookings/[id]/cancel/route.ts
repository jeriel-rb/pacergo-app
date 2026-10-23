import { NextResponse } from "next/server";
import { getNewebPayConfig } from "@/lib/payments/newebpay";
import { completeNewebPayRefund, type RefundCandidate } from "@/lib/payments/refunds";
import { forbidCrossSiteOrigin } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Cancel through the server so the trainer's cancellation can immediately give
 * a paid card charge back (void if NewebPay hasn't captured it yet, otherwise
 * refund; see returnCardPayment). Only the trainer cancels; cancel_booking
 * enforces that too. The database makes the cancellation / refund-request
 * transition first, which keeps a gateway outage safe: staff can complete any
 * failed external refund manually.
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
  if (booking.companion_id !== user.id) {
    return response({ error: "booking_cancel_trainer_only" }, 403);
  }

  const { error: cancelError } = await supabase.rpc("cancel_booking", { p_id: bookingId });
  if (cancelError) return response({ error: "booking_cancel_not_allowed" }, 409);

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
    try {
      const result = await completeNewebPayRefund({ admin, config: getNewebPayConfig(), payment: candidate });
      if (result.refund === "automatic") automatic += 1;
      else manualRequired = true;
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

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}
