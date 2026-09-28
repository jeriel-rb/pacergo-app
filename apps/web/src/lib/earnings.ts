import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

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
    bank: (bankRes.data as BankAccount | null) ?? null,
  };
}
