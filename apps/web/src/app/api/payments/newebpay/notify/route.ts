import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAmount,
  getMerchantOrderNo,
  getNewebPayConfig,
  getSafeProviderValues,
  mapProviderStatus,
  parseNewebPayFormData,
  verifyAndDecodeCallback,
} from "@/lib/payments/newebpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const config = getNewebPayConfig();
    const fields = await parseNewebPayFormData(request);
    const parsed = verifyAndDecodeCallback(fields, config);
    const merchantOrderNo = getMerchantOrderNo(parsed.decoded);
    const amount = getAmount(parsed.decoded);
    const providerValues = getSafeProviderValues(parsed.decoded);
    const nextStatus = mapProviderStatus(parsed.decoded);

    if (!merchantOrderNo) throw new Error("payment_order_not_found");

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("apply_newebpay_notification", {
      p_merchant_order_no: merchantOrderNo,
      p_amount: amount,
      p_provider_trade_no: providerValues.providerTradeNo,
      p_provider_status: providerValues.providerStatus,
      p_payment_method: providerValues.paymentMethod,
      p_response_code: providerValues.responseCode,
      p_response_message: providerValues.responseMessage,
      p_instructions: providerValues.instructions,
      p_next_status: nextStatus,
    });
    if (error) throw new Error(error.message);

    console.info("newebpay_notify_received", {
      merchantOrderNo,
      amount,
      providerStatus: providerValues.providerStatus,
      paymentMethod: providerValues.paymentMethod,
      environment: config.env,
    });

    return new NextResponse("1|OK", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    console.warn("newebpay_payment_rejected", {
      error: sanitizeError(message),
      // The real reason when it isn't one of the named codes (no secrets:
      // decode/parse/DB error text only), and how NewebPay labelled the body.
      detail: message.slice(0, 160),
      contentType: request.headers.get("content-type"),
    });
    return new NextResponse("0|FAIL", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

function sanitizeError(message: string) {
  const known = [
    "payment_callback_invalid",
    "payment_signature_invalid",
    "payment_merchant_mismatch",
    "payment_amount_mismatch",
    "payment_order_not_found",
    "payment_invalid_amount",
  ];
  return known.find((code) => message.includes(code)) ?? "payment_callback_invalid";
}
