import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMerchantOrderNo,
  getNewebPayConfig,
  getSafeProviderValues,
  mapProviderStatus,
  parseNewebPayFormData,
  verifyAndDecodeCallback,
} from "@/lib/payments/newebpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleReturn(request);
}

export async function GET(request: Request) {
  return handleReturn(request);
}

async function handleReturn(request: Request) {
  const baseUrl = new URL(request.url).origin;
  try {
    const config = getNewebPayConfig();
    const fields =
      request.method === "POST"
        ? await parseNewebPayFormData(request)
        : Object.fromEntries(new URL(request.url).searchParams);
    const parsed = verifyAndDecodeCallback(fields, config);
    const merchantOrderNo = getMerchantOrderNo(parsed.decoded);
    const providerValues = getSafeProviderValues(parsed.decoded);
    const observed = mapProviderStatus(parsed.decoded);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("observe_newebpay_return", {
      p_merchant_order_no: merchantOrderNo,
      p_provider_trade_no: providerValues.providerTradeNo,
      p_provider_status: providerValues.providerStatus,
      p_payment_method: providerValues.paymentMethod,
      p_response_code: providerValues.responseCode,
      p_response_message: providerValues.responseMessage,
      p_instructions: providerValues.instructions,
      p_observed_status: observed === "paid" ? "processing" : observed,
    });
    if (error) throw new Error(error.message);

    console.info("newebpay_return_received", {
      paymentId: data,
      merchantOrderNo,
      observedStatus: observed,
      environment: config.env,
    });

    return NextResponse.redirect(
      new URL(`/payments/newebpay/result?payment=${encodeURIComponent(String(data))}`, baseUrl),
      { status: 303 },
    );
  } catch {
    return NextResponse.redirect(
      new URL("/payments/newebpay/result?error=payment_invalid_response", baseUrl),
      { status: 303 },
    );
  }
}
