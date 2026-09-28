"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminUsersPage } from "@/lib/admin";

const MEMBERS_PAGE_SIZE = 20;

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

/** Grant or revoke platform-admin on another user (admin-only RPC). */
export async function setUserAdmin(
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_user_admin", {
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  if (error) throw new Error(error.message);
}

/** Fetch one page of members (admin-only RPC), admins first, optionally
 *  filtered by a name/email search — for client-side pagination. */
export async function fetchUsersPage(
  page: number,
  search = "",
): Promise<AdminUsersPage> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_all_users", {
    p_limit: MEMBERS_PAGE_SIZE,
    p_offset: page * MEMBERS_PAGE_SIZE,
    p_search: search.trim() || null,
  });
  if (error || !data) throw new Error(error?.message ?? "members");
  return data as AdminUsersPage;
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

/** Dispute flag. A hold drops an unsettled order out of the trainer balance. */
export async function setPaymentHold(
  paymentId: string,
  hold: boolean,
  reason: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_set_payment_hold", {
    p_payment_id: paymentId,
    p_hold: hold,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

/** Starts or clears the 24-hour settlement clock on one order. */
export async function correctServiceCompleted(
  paymentId: string,
  completed: boolean,
  reason: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_correct_service_completed", {
    p_payment_id: paymentId,
    p_completed: completed,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}
