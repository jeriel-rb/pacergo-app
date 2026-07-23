import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildPaymentForm,
  createMerchantOrderNo,
  getNewebPayConfig,
  NewebPayConfigurationError,
} from "@/lib/payments/newebpay";

export const runtime = "nodejs";

type CreateBody = {
  bookingId?: string;
  locale?: "zh" | "en";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    if (!body.bookingId) {
      return error("payment_booking_not_found", 400);
    }

    const config = getNewebPayConfig();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return error("payment_unauthenticated", 401);

    const review = await loadPaymentReview(supabase, body.bookingId);
    if (!review) return error("payment_booking_not_found", 404);
    if (review.seeker_id !== user.id) return error("payment_booking_not_owned", 403);
    if (review.is_free || review.agreed_price <= 0) {
      return error("payment_invalid_amount", 400);
    }

    const merchantOrderNo = createMerchantOrderNo();
    const { data, error: rpcError } = await supabase.rpc("create_newebpay_payment_attempt", {
      p_booking_id: body.bookingId,
      p_merchant_order_no: merchantOrderNo,
      p_amount: review.agreed_price,
    });
    if (rpcError) return error(mapDatabaseError(rpcError.message), 409);

    const attempt = data as {
      id: string;
      merchant_order_no: string;
      amount: number;
      currency: string;
    };
    const form = buildPaymentForm({
      config,
      merchantOrderNo: attempt.merchant_order_no,
      amount: attempt.amount,
      itemDesc: "PacerGo booking",
      email: user.email,
      locale: body.locale === "en" ? "en" : "zh",
    });

    const { error: redirectError } = await supabase.rpc("mark_newebpay_payment_redirected", {
      p_payment_id: attempt.id,
    });
    if (redirectError) return error("payment_request_failed", 409);

    console.info("newebpay_redirect_generated", {
      paymentId: attempt.id,
      merchantOrderNo: attempt.merchant_order_no,
      amount: attempt.amount,
      environment: config.env,
    });

    return NextResponse.json({
      paymentId: attempt.id,
      merchantOrderNo: attempt.merchant_order_no,
      amount: attempt.amount,
      currency: attempt.currency,
      form,
    });
  } catch (err) {
    if (err instanceof NewebPayConfigurationError) {
      return error(err.message, 503);
    }
    return error("payment_request_failed", 500);
  }
}

async function loadPaymentReview(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bookingId: string,
) {
  const { data } = await supabase.rpc("payment_review", { p_booking_id: bookingId });
  return data as
    | {
        id: string;
        seeker_id: string;
        agreed_price: number;
        is_free: boolean;
      }
    | null;
}

function mapDatabaseError(message: string) {
  const known = [
    "payment_booking_not_found",
    "payment_booking_not_owned",
    "payment_booking_not_payable",
    "payment_already_paid",
    "payment_attempt_in_progress",
    "payment_invalid_amount",
    "payment_amount_mismatch",
  ];
  return known.find((code) => message.includes(code)) ?? "payment_request_failed";
}

function error(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}
