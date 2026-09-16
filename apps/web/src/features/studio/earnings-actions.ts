"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Trainer-callable withdrawal request (B-6). Amount must be <= available balance. */
export async function requestWithdrawal(amount: number): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
