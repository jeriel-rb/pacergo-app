"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Approve or reject a certification request (admin-only RPC). */
export async function reviewVerification(
  id: string,
  status: "approved" | "rejected",
  notes: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("review_verification", {
    p_id: id,
    p_status: status,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
}

/** Short-lived signed URL for a private verification document (admins only). */
export async function getCertSignedUrl(path: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from("verification-docs")
    .createSignedUrl(path, 120);
  if (error || !data) throw new Error(error?.message ?? "doc");
  return data.signedUrl;
}

/** B-8: transition a withdrawal request's status. Forward steps (Requested->
 *  Processing, Processing->Paid) allow an empty reason; every other
 *  transition (Rejected/Cancelled, or a correction/undo) requires one. */
export async function setWithdrawalStatus(
  id: string,
  status: "requested" | "processing" | "paid" | "rejected" | "cancelled",
  reason: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_set_withdrawal_status", {
    p_id: id,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

/** B-5: admin-only cancel / refund-status recording on a payment. */
export async function setPaymentStatus(
  paymentId: string,
  action: "cancel" | "refund_requested" | "refunded",
  reason: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_set_payment_status", {
    p_payment_id: paymentId,
    p_action: action,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}
