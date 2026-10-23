import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/admin";
import { getNewebPayConfig } from "@/lib/payments/newebpay";
import { completeNewebPayRefund, type RefundCandidate } from "@/lib/payments/refunds";
import { forbidCrossSiteOrigin } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin "Issue refund" on an order: flags the refund with the admin's reason
 * (admin_set_payment_status, audited, takes it out of payout), then gives the
 * money back through NewebPay the same way a trainer's cancel does. Also the
 * retry for a refund that is still refund_requested. A payment NewebPay can't
 * return by API (non-card, mid-capture) stays refund_requested for staff to
 * refund in NewebPay's portal and then "Mark refunded".
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originBlock = forbidCrossSiteOrigin(request);
  if (originBlock) return originBlock;

  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "payment_not_found" }, 404);
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return json({ error: "reason_required" }, 400);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "forbidden" }, 401);
  if (!(await getIsAdmin())) return json({ error: "forbidden" }, 403);

  const admin = createSupabaseAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select(
      "id, provider, status, refund_status, settlement_status, merchant_order_no, provider_trade_no, amount, payment_method",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ error: "payment_lookup_failed" }, 500);
  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (payment.provider !== "newebpay" || payment.status !== "paid") {
    return json({ error: "refund_not_applicable" }, 409);
  }
  if (payment.refund_status === "refunded") return json({ error: "already_refunded" }, 409);
  if (payment.settlement_status === "paid") {
    return json({ error: "cannot_modify_settled_payment" }, 409);
  }

  if (payment.refund_status === "none") {
    const { error: flagError } = await supabase.rpc("admin_set_payment_status", {
      p_payment_id: id,
      p_action: "refund_requested",
      p_reason: reason,
    });
    if (flagError) return json({ error: "refund_flag_failed" }, 409);
  }

  try {
    const result = await completeNewebPayRefund({
      admin,
      config: getNewebPayConfig(),
      payment: payment as RefundCandidate,
    });
    return json(result);
  } catch {
    console.warn("newebpay_admin_refund_unavailable", { paymentId: id });
    return json({ refund: "manual_required", reason: "unavailable" });
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}
