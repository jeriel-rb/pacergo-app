import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveProviderType } from "@/lib/payments/provider";

export const runtime = "nodejs";

type ConfirmBody = { paymentId?: string; approve?: boolean };

/**
 * Approve or decline a SIMULATED test payment.
 *
 * `confirm_simulated_payment` fakes a "paid" payment, so the database only lets
 * the server (service_role) call it. This route is that server: it verifies
 * the signed-in user, refuses unless the deployment is set to
 * PAYMENT_PROVIDER=simulated, and passes the verified user id. The database
 * still requires that user to own a pending provider='simulated' payment.
 */
export async function POST(request: Request) {
  try {
    if (getActiveProviderType() !== "simulated") return error("payment_simulated_disabled", 403);

    const body = (await request.json()) as ConfirmBody;
    if (!body.paymentId || typeof body.approve !== "boolean") return error("payment_request_failed", 400);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return error("payment_unauthenticated", 401);

    const { error: rpcError } = await createSupabaseAdminClient().rpc("confirm_simulated_payment", {
      p_payment_id: body.paymentId,
      p_approve: body.approve,
      p_user_id: user.id,
    });
    if (rpcError) return error(mapDatabaseError(rpcError.message), 409);

    return NextResponse.json({ ok: true });
  } catch {
    return error("payment_request_failed", 500);
  }
}

function mapDatabaseError(message: string) {
  const known = [
    "payment_order_not_found",
    "payment_booking_not_owned",
    "payment_not_simulated",
    "payment_not_pending",
  ];
  return known.find((code) => message.includes(code)) ?? "payment_request_failed";
}

function error(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}
