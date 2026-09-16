"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** B-2 Phase 1 simulated provider: explicit approve/decline in place of a
 *  real gateway. Only ever touches the caller's own provider='simulated'
 *  rows (enforced server-side in confirm_simulated_payment). */
export async function confirmSimulatedPayment(
  paymentId: string,
  approve: boolean,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("confirm_simulated_payment", {
    p_payment_id: paymentId,
    p_approve: approve,
  });
  if (error) throw new Error(error.message);
}
