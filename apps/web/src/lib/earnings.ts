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

export interface EarningsData {
  balance: number;
  orders: TrainerOrder[];
  withdrawals: MyWithdrawalRequest[];
}

/** B-4: the signed-in trainer's own orders, balance, and withdrawal history. */
export async function getMyEarnings(): Promise<EarningsData> {
  if (!SUPABASE_CONFIGURED) return { balance: 0, orders: [], withdrawals: [] };
  const supabase = await createSupabaseServerClient();

  const [balanceRes, ordersRes, withdrawalsRes] = await Promise.all([
    supabase.rpc("my_trainer_balance"),
    supabase.rpc("trainer_orders"),
    supabase.rpc("my_withdrawal_requests"),
  ]);

  return {
    balance: (balanceRes.data as number | null) ?? 0,
    orders: (ordersRes.data as TrainerOrder[] | null) ?? [],
    withdrawals: (withdrawalsRes.data as MyWithdrawalRequest[] | null) ?? [],
  };
}
