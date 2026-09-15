/**
 * Sensitive‑data masking for admin CSV exports (B-9 / §6.3).
 *
 * Rule: **never** export the full bank account number. Each character is masked
 * with `*` except the final 4 characters, preserving length/structure so no
 * extra information leaks while still revealing only the suffix used for
 * human verification. The exact format is finalised with the client (P‑6);
 * this default is safe for Phase 1 simulated payouts.
 *
 * Full bank details render ONLY in the B‑8 admin detail view, and bank values
 * are never written to application logs (verified by test).
 */

/** Mask everything except the last 4 characters. Empty → "". */
export function maskBankAccount(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s.length === 0) return "";
  if (s.length <= 4) return "*".repeat(s.length);
  return "*".repeat(s.length - 4) + s.slice(-4);
}

/** Generic PII mask: keep last 4, mask the rest. */
export function maskLast4(value: string | null | undefined): string {
  return maskBankAccount(value);
}
