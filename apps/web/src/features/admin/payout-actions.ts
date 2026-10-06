import type { PayoutStatus } from "@/lib/admin";

/** Transitions from the current status: [forward steps, correction steps].
 *  Forward steps don't require a reason; corrections do (enforced server-side
 *  too, in admin_set_withdrawal_status). Shared by the payouts table menu and
 *  the payout detail page so they always offer the same actions. */
export const PAYOUT_TRANSITIONS: Record<
  PayoutStatus,
  { forward: PayoutStatus[]; corrections: PayoutStatus[] }
> = {
  requested: { forward: ["processing"], corrections: ["rejected", "cancelled"] },
  processing: { forward: ["paid"], corrections: ["rejected", "cancelled", "requested"] },
  paid: { forward: [], corrections: ["processing"] },
  rejected: { forward: [], corrections: ["requested"] },
  cancelled: { forward: [], corrections: ["requested"] },
};

/** Moving to `to` from `from` is a correction (needs a reason) rather than a forward step. */
export function isCorrection(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].corrections.includes(to);
}
