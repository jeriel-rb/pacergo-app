import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export interface AdminVerification {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string | null;
  doc_type: string;
  activity: string | null;
  label: string | null;
  document_path: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/** Whether the signed-in user is a platform admin (server-side). */
export async function getIsAdmin(): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("am_i_admin");
  return data === true;
}

/** The certification review queue (pending first). Admin-only RPC. */
export async function getVerificationQueue(): Promise<AdminVerification[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_pending_verifications");
  if (error) return [];
  return (data ?? []) as AdminVerification[];
}

export type PayoutStatus =
  | "requested"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled";

export interface PayoutListRow {
  id: string;
  trainer_id: string;
  trainer_name: string;
  amount: number;
  bank_account_mask: string | null;
  status: PayoutStatus;
  requested_at: string;
  updated_at: string;
}

export interface PayoutTotals {
  requested_count: number;
  requested_sum: number;
  processing_count: number;
  processing_sum: number;
}

export interface PayoutList {
  rows: PayoutListRow[];
  totals: PayoutTotals;
}

/** B-7: admin payout list, optionally filtered by status. Admin-only RPC. */
export async function getPayoutList(
  status?: PayoutStatus,
): Promise<PayoutList> {
  const empty: PayoutList = {
    rows: [],
    totals: { requested_count: 0, requested_sum: 0, processing_count: 0, processing_sum: 0 },
  };
  if (!SUPABASE_CONFIGURED) return empty;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_withdrawal_requests", {
    p_status: status ?? null,
  });
  if (error || !data) return empty;
  return data as PayoutList;
}

export interface PayoutStatusEvent {
  from_status: string | null;
  to_status: string;
  reason_note: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface PayoutDetail {
  id: string;
  trainer_id: string;
  trainer_name: string;
  amount: number;
  status: PayoutStatus;
  reason_note: string | null;
  requested_at: string;
  updated_at: string;
  settled_at: string | null;
  bank_code: string | null;
  bank_name: string | null;
  branch_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  history: PayoutStatusEvent[];
}

/** B-8: full detail incl. unmasked bank details + status history. Admin-only RPC. */
export async function getPayoutDetail(id: string): Promise<PayoutDetail | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_withdrawal_detail", {
    p_id: id,
  });
  if (error || !data) return null;
  return data as PayoutDetail;
}
