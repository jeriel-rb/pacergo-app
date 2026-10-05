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

export interface BankAccountInput {
  bankCode: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  accountHolder: string;
}

/** Saves the signed-in trainer's payout account. The web server encrypts the
 *  account number before it is stored, so it is sent to our own API route — not
 *  straight to the database. Throws an Error whose message is a short code
 *  (e.g. "bank_details_invalid"). */
export async function saveBankAccount(input: BankAccountInput): Promise<void> {
  const res = await fetch("/api/studio/bank-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "bank_save_failed");
  }
}
