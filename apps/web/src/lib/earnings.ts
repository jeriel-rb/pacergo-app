import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";
import { readAccountNumber } from "./crypto/bank-account";

export interface TrainerOrder {
  payment_id: string;
  booking_id: string;
  seeker_name: string | null;
  activity_slug: string | null;
  tier: string | null;
  scheduled_start: string | null;
  duration_min: number | null;
  trainer_payable: number | null;
  payment_status: string;
  refund_status: string;
  service_completed_at: string | null;
  settlement_eligibility_status: "eligible" | "ineligible";
  settlement_status: "unsettled" | "paid";
  created_at: string;
}

export type WithdrawalStatus =
  | "requested"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled";

export interface MyWithdrawalRequest {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  bank_account_mask: string | null;
  reason_note: string | null;
  requested_at: string;
  updated_at: string;
  settled_at: string | null;
}

export interface BankAccount {
  bank_code: string | null;
  bank_name: string | null;
  branch_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_account_mask: string | null;
}

export interface EarningsData {
  balance: number;
  orders: TrainerOrder[];
  withdrawals: MyWithdrawalRequest[];
  bank: BankAccount | null;
}

/** B-4: the signed-in trainer's own orders, balance, and withdrawal history. */
const EMPTY_EARNINGS: EarningsData = {
  balance: 0,
  orders: [],
  withdrawals: [],
  bank: null,
};

/** The stored account number is ciphertext; decrypt it for its owner so the
 *  form can show what they saved. If it can't be decrypted (key missing or
 *  changed) the number is left blank — the mask still shows — rather than
 *  failing the whole page. */
async function decryptOwnBank(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bank: BankAccount | null,
): Promise<BankAccount | null> {
  if (!bank?.bank_account_number) return bank;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ...bank, bank_account_number: null };
  try {
    return {
      ...bank,
      bank_account_number: await readAccountNumber(userId, bank.bank_account_number),
    };
  } catch {
    console.warn("bank_account_decrypt_failed");
    return { ...bank, bank_account_number: null };
  }
}

export async function getMyEarnings(): Promise<EarningsData> {
  if (!SUPABASE_CONFIGURED) return EMPTY_EARNINGS;
  const supabase = await createSupabaseServerClient();

  const [balanceRes, ordersRes, withdrawalsRes, bankRes] = await Promise.all([
    supabase.rpc("my_trainer_balance"),
    supabase.rpc("trainer_orders"),
    supabase.rpc("my_withdrawal_requests"),
    supabase.rpc("my_bank_account"),
  ]);

  return {
    balance: (balanceRes.data as number | null) ?? 0,
    orders: (ordersRes.data as TrainerOrder[] | null) ?? [],
    withdrawals: (withdrawalsRes.data as MyWithdrawalRequest[] | null) ?? [],
    bank: await decryptOwnBank(supabase, bankRes.data as BankAccount | null),
  };
}
