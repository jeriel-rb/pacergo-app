import "server-only";
import { decryptField, encryptField } from "./field-encryption";

/** A Taiwan bank account number: 8–16 digits. */
export const ACCOUNT_NUMBER_PATTERN = /^[0-9]{8,16}$/;

/** `********0912` — every digit but the last 4 hidden. Same rule as the database's
 *  `mask_bank_account`, so a mask computed here matches one the DB would derive. */
export function maskAccountNumber(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (v.length <= 4) return "*".repeat(v.length);
  return "*".repeat(v.length - 4) + v.slice(-4);
}

/** Encrypts an account number for storage, bound to its owner. */
export function encryptAccountNumber(userId: string, accountNumber: string): Promise<string> {
  return encryptField(accountNumber, userId);
}

/** The readable account number from whatever is stored (ciphertext or legacy
 *  plaintext). `null` when nothing is stored. */
export async function readAccountNumber(
  userId: string,
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  return decryptField(stored, userId);
}
