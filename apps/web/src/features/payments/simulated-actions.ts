"use client";

/** B-2 Phase 1 simulated provider: explicit approve/decline in place of a
 *  real gateway. The database function is server-only (it fakes a paid
 *  payment), so this goes through the server route, which verifies the user and
 *  that the deployment is in simulated mode. */
export async function confirmSimulatedPayment(
  paymentId: string,
  approve: boolean,
): Promise<void> {
  const response = await fetch("/api/payments/simulated/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paymentId, approve }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "payment_request_failed");
  }
}
