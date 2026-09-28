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

/** Saves the signed-in trainer's payout account. The mask is derived in the DB. */
export async function saveBankAccount(input: BankAccountInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("save_bank_account", {
    p_bank_code: input.bankCode,
    p_bank_name: input.bankName,
    p_branch_name: input.branchName,
    p_account_number: input.accountNumber,
    p_account_holder: input.accountHolder,
  });
  if (error) throw new Error(error.message);
}
