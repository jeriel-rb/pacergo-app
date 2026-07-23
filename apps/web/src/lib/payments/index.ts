import type { BookingRecord } from "@pacergo/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

export type PaymentStatus =
  | "created"
  | "redirected"
  | "processing"
  | "awaiting_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export interface PaymentReview {
  id: string;
  seeker_id: string;
  companion_id: string;
  offering_id: string | null;
  activity_slug: BookingRecord["activity_slug"];
  tier: BookingRecord["tier"];
  status: BookingRecord["status"];
  scheduled_start: string | null;
  duration_min: number;
  location_name: string | null;
  agreed_price: number;
  is_free: boolean;
  seeker_name: string | null;
  companion_name: string | null;
  created_at: string;
}

export interface PaymentDetail {
  id: string;
  booking_id: string;
  merchant_order_no: string;
  provider_trade_no: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_status: string | null;
  payment_method: string | null;
  payment_instructions: Record<string, string>;
  initiated_at: string;
  returned_at: string | null;
  notified_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  expired_at: string | null;
  booking: Pick<
    BookingRecord,
    | "id"
    | "status"
    | "activity_slug"
    | "tier"
    | "scheduled_start"
    | "duration_min"
    | "location_name"
    | "agreed_price"
    | "is_free"
    | "seeker_name"
    | "companion_name"
  >;
}

export async function getPaymentReview(bookingId: string): Promise<PaymentReview | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("payment_review", { p_booking_id: bookingId });
  return (data ?? null) as PaymentReview | null;
}

export async function getPaymentDetail(paymentId: string): Promise<PaymentDetail | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("payment_detail", { p_payment_id: paymentId });
  return (data ?? null) as PaymentDetail | null;
}

export function isBookingPayable(booking: Pick<BookingRecord, "status" | "is_free" | "agreed_price">) {
  return (
    !booking.is_free &&
    booking.agreed_price > 0 &&
    ["requested", "pending_payment", "payment_failed", "accepted"].includes(booking.status)
  );
}
