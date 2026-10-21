import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildPaymentForm,
  getNewebPayConfig,
  NewebPayConfigurationError,
} from "./newebpay";

export type ProviderType = "newebpay" | "simulated";

/**
 * Which provider handles NEW checkout attempts. Defaults to "newebpay" —
 * the existing, already-live integration — so this abstraction lands with
 * zero behavior change for real users. Set PAYMENT_PROVIDER=simulated for
 * local/preview fake checkout. Production (VERCEL_ENV=production) always
 * uses NewebPay even if the env is mis-set — fail closed.
 */
export function getActiveProviderType(): ProviderType {
  if (process.env.PAYMENT_PROVIDER !== "simulated") return "newebpay";
  if (process.env.VERCEL_ENV === "production") {
    console.error("payment_provider_simulated_blocked_in_production");
    return "newebpay";
  }
  return "simulated";
}

interface CreateAttemptInput {
  supabase: SupabaseClient;
  /** The signed-in user, already verified by the route. The simulated provider
   *  acts as this user through the server-only database functions. */
  userId: string;
  bookingId: string;
  merchantOrderNo: string;
  amount: number;
  email: string | null;
  locale: "zh" | "en";
}

export type CreateAttemptResult = {
  paymentId: string;
  merchantOrderNo: string;
  amount: number;
  currency: string;
} & (
  | { next: "redirect_form"; form: { action: string; fields: Record<string, string> } }
  | { next: "simulated_review" }
);

export class ProviderRpcError extends Error {}

export interface PaymentProvider {
  type: ProviderType;
  createAttempt(input: CreateAttemptInput): Promise<CreateAttemptResult>;
}

/** Live NewebPay — unchanged behavior, just moved behind the interface. */
export const newebpayProvider: PaymentProvider = {
  type: "newebpay",
  async createAttempt({ supabase, bookingId, merchantOrderNo, amount, email, locale }) {
    const config = getNewebPayConfig();
    const { data, error } = await supabase.rpc("create_newebpay_payment_attempt", {
      p_booking_id: bookingId,
      p_merchant_order_no: merchantOrderNo,
      p_amount: amount,
    });
    if (error) throw new ProviderRpcError(error.message);
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
      email,
      locale,
    });

    const { error: redirectError } = await supabase.rpc(
      "mark_newebpay_payment_redirected",
      { p_payment_id: attempt.id },
    );
    if (redirectError) throw new ProviderRpcError(redirectError.message);

    return {
      paymentId: attempt.id,
      merchantOrderNo: attempt.merchant_order_no,
      amount: attempt.amount,
      currency: attempt.currency,
      next: "redirect_form",
      form: { action: form.action, fields: form.fields },
    };
  },
};

/** Simulated — Phase 1 test provider (B-2). No card data, no external
 *  redirect; the client shows an explicit approve/decline screen that confirms
 *  through /api/payments/simulated/confirm.
 *
 *  It fakes a "paid" payment, so the database functions behind it are
 *  service_role only: a browser can never call them. The route verifies the user
 *  and passes the id; settlement also ignores simulated payments. */
export const simulatedProvider: PaymentProvider = {
  type: "simulated",
  async createAttempt({ userId, bookingId, merchantOrderNo, amount }) {
    const { data, error } = await createSupabaseAdminClient().rpc("create_simulated_payment_attempt", {
      p_booking_id: bookingId,
      p_merchant_order_no: merchantOrderNo,
      p_amount: amount,
      p_user_id: userId,
    });
    if (error) throw new ProviderRpcError(error.message);
    const attempt = data as {
      id: string;
      merchant_order_no: string;
      amount: number;
      currency: string;
    };
    return {
      paymentId: attempt.id,
      merchantOrderNo: attempt.merchant_order_no,
      amount: attempt.amount,
      currency: attempt.currency,
      next: "simulated_review",
    };
  },
};

export function getPaymentProvider(type: ProviderType = getActiveProviderType()): PaymentProvider {
  return type === "simulated" ? simulatedProvider : newebpayProvider;
}

export { NewebPayConfigurationError };
