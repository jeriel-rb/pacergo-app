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
