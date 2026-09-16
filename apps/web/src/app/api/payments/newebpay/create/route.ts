import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMerchantOrderNo } from "@/lib/payments/newebpay";
import {
  getPaymentProvider,
  NewebPayConfigurationError,
  ProviderRpcError,
} from "@/lib/payments/provider";

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

    const provider = getPaymentProvider();
    const merchantOrderNo = createMerchantOrderNo();
    const result = await provider.createAttempt({
      supabase,
      bookingId: body.bookingId,
      merchantOrderNo,
      amount: review.agreed_price,
      email: user.email ?? null,
      locale: body.locale === "en" ? "en" : "zh",
    });

    console.info("payment_attempt_created", {
      provider: provider.type,
      paymentId: result.paymentId,
      merchantOrderNo: result.merchantOrderNo,
      amount: result.amount,
      ...(result.next === "redirect_form"
        ? {
            gateway: result.form.action,
            tradeInfoLength: result.form.fields.TradeInfo?.length,
            tradeShaPrefix: result.form.fields.TradeSha?.slice(0, 8),
          }
        : {}),
    });

    return NextResponse.json(
      result.next === "redirect_form"
        ? {
            paymentId: result.paymentId,
            merchantOrderNo: result.merchantOrderNo,
            amount: result.amount,
            currency: result.currency,
            provider: provider.type,
            form: result.form,
          }
        : {
            paymentId: result.paymentId,
            merchantOrderNo: result.merchantOrderNo,
            amount: result.amount,
            currency: result.currency,
            provider: provider.type,
            simulated: true,
          },
    );
  } catch (err) {
    if (err instanceof NewebPayConfigurationError) {
      return error(err.message, 503);
    }
    if (err instanceof ProviderRpcError) {
      return error(mapDatabaseError(err.message), 409);
    }
    console.warn("payment_create_failed", {
      error: err instanceof Error ? mapDatabaseError(err.message) : "payment_request_failed",
    });
    return error("payment_request_failed", 500);
  }
}

async function loadPaymentReview(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bookingId: string,
) {
  const { data, error } = await supabase.rpc("payment_review", { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
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
    "payment_redirect_not_allowed",
    "payment_invalid_amount",
    "payment_amount_mismatch",
  ];
  const matched = known.find((code) => message.includes(code));
  if (matched) return matched;
  if (
    message.includes("Could not find the function") ||
    message.includes("function") ||
    message.includes("schema cache")
  ) {
    return "payment_migrations_missing";
  }
  return "payment_request_failed";
}

function error(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}
