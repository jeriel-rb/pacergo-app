"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AdminOrderDetail,
  AdminUserDetail,
  AdminUserRole,
  AdminUsersPage,
} from "@/lib/admin";

/** Must match `MEMBERS_PAGE_SIZE` in `@/lib/admin` (server-only, so it can't be
 *  imported into client components). */
export const MEMBERS_PAGE_SIZE = 12;

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
  role?: AdminUserRole,
  pageSize = MEMBERS_PAGE_SIZE,
): Promise<AdminUsersPage> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_all_users", {
    p_limit: pageSize,
    p_offset: page * pageSize,
    p_search: search.trim() || null,
    ...(role ? { p_role: role } : {}),
  });
  if (error || !data) throw new Error(error?.message ?? "members");
  return data as AdminUsersPage;
}

/** One user's full bank account number, decrypted by the server for an admin who
 *  asked to reveal it. Never cached. Throws a short error code
 *  ("forbidden" | "not_found" | "decrypt_failed" | ...). */
export async function fetchBankAccountNumber(userId: string): Promise<string> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/bank-account`, {
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as
    | { accountNumber?: string | null; error?: string }
    | null;
  if (!res.ok || !body?.accountNumber) throw new Error(body?.error ?? "reveal_failed");
  return body.accountNumber;
}

/** One user's full detail for the sheet (admin-only RPC). */
export async function fetchUserDetail(id: string): Promise<AdminUserDetail> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_user_detail", { p_user_id: id });
  if (error || !data) throw new Error(error?.message ?? "user");
  return data as AdminUserDetail;
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

/** One order plus its ledger history, fetched from the browser (admin-only RPC). */
export async function fetchOrderDetail(id: string): Promise<AdminOrderDetail> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_payment_detail", { p_id: id });
  if (error || !data) throw new Error(error?.message ?? "order");
  return data as AdminOrderDetail;
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
