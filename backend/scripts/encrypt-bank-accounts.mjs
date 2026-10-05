#!/usr/bin/env node
/**
 * One-time back-fill: encrypt the bank account numbers saved before field
 * encryption existed (they are still plaintext in `users.bank_account_number`).
 *
 *   ENCRYPTION_KEY=<base64> SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   node backend/scripts/encrypt-bank-accounts.mjs [--dry-run]
 *
 * - Uses the same scheme as apps/web/src/lib/crypto/field-encryption.ts:
 *   AES-GCM, `enc:v1:` + base64(IV ‖ ciphertext ‖ tag), the user's id as AAD.
 * - Safe to run again: rows that are already encrypted are skipped.
 * - The masked copy (`bank_account_mask`) is left as it is; the `users` trigger
 *   keeps it when the stored value is ciphertext.
 * - Prints counts only — never account numbers.
 */
import { createClient } from "@supabase/supabase-js";

export const ENCRYPTED_PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BITS = 128;

export async function importKey(base64Key) {
  if (!base64Key) throw new Error("ENCRYPTION_KEY is not set");
  const bytes = Uint8Array.from(Buffer.from(base64Key, "base64"));
  if (![16, 24, 32].includes(bytes.byteLength)) {
    throw new Error(`ENCRYPTION_KEY must decode to 16, 24 or 32 bytes (got ${bytes.byteLength})`);
  }
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptValue(plaintext, key, contextId) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoder = new TextEncoder();
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: TAG_BITS, additionalData: encoder.encode(contextId) },
      key,
      encoder.encode(plaintext),
    ),
  );
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv, 0);
  out.set(sealed, IV_BYTES);
  return ENCRYPTED_PREFIX + Buffer.from(out).toString("base64");
}

export async function decryptValue(stored, key, contextId) {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored;
  const data = Uint8Array.from(Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64"));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: data.slice(0, IV_BYTES), tagLength: TAG_BITS, additionalData: new TextEncoder().encode(contextId) },
    key,
    data.slice(IV_BYTES),
  );
  return new TextDecoder().decode(plain);
}

/** Encrypts every plaintext account number. `db` is a Supabase client. Returns counts. */
export async function backfill({ db, key, dryRun = false, pageSize = 200 }) {
  let encrypted = 0;
  let skipped = 0;
  let failed = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("users")
      .select("id, bank_account_number")
      .not("bank_account_number", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`read failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const value = row.bank_account_number;
      if (typeof value !== "string" || value === "" || value.startsWith(ENCRYPTED_PREFIX)) {
        skipped++;
        continue;
      }
      if (dryRun) {
        encrypted++;
        continue;
      }
      try {
        const cipher = await encryptValue(value, key, row.id);
        // Only touch the row if it still holds the plaintext we read (no lost update).
        const { error: updateError, count } = await db
          .from("users")
          .update({ bank_account_number: cipher }, { count: "exact" })
          .eq("id", row.id)
          .eq("bank_account_number", value);
        if (updateError) throw new Error(updateError.message);
        if (count === 0) skipped++;
        else encrypted++;
      } catch {
        failed++;
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return { encrypted, skipped, failed };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const key = await importKey(process.env.ENCRYPTION_KEY ?? "");
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { encrypted, skipped, failed } = await backfill({ db, key, dryRun });
  console.log(
    `${dryRun ? "[dry run] would encrypt" : "encrypted"}: ${encrypted}, already encrypted / empty: ${skipped}, failed: ${failed}`,
  );
  if (failed > 0) process.exitCode = 1;
}

// Run only when executed directly (the exports above are imported by tests).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
