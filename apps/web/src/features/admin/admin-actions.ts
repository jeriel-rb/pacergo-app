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
