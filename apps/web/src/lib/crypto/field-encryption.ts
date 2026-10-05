import "server-only";

/**
 * Application-layer encryption for sensitive database fields (bank account
 * numbers). Same scheme as Optserv's `shared/encryption.ts`:
 *
 *  - AES-GCM, key from the `ENCRYPTION_KEY` env var (base64, 16 / 24 / 32 bytes),
 *    which lives only on the server — never in the database or the browser.
 *  - A fresh random 12-byte IV per value; the stored value is
 *    `enc:v1:` + base64(IV ‖ ciphertext ‖ 16-byte auth tag).
 *  - The owner's user id is bound in as Additional Authenticated Data, so a
 *    ciphertext copied onto another user's row fails to decrypt.
 *
 * Plaintext values written before encryption existed (no `enc:v1:` prefix) are
 * returned as they are, so reads keep working until `encrypt-bank-accounts.mjs`
 * has back-filled them.
 */

export const ENCRYPTED_PREFIX = "enc:v1:";

const IV_BYTES = 12;
const TAG_BYTES = 16;

let cached: { raw: string; key: CryptoKey } | null = null;

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(b64, "base64");
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

/** The server's AES key, or a thrown `encryption_unavailable` error. */
async function getKey(): Promise<CryptoKey> {
  const raw = process.env.ENCRYPTION_KEY ?? "";
  if (!raw) throw new Error("encryption_unavailable");
  if (cached?.raw === raw) return cached.key;

  const bytes = fromBase64(raw);
  if (![16, 24, 32].includes(bytes.byteLength)) throw new Error("encryption_key_invalid");
  const key = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  cached = { raw, key };
  return key;
}

/** True when `stored` is an encrypted value (as opposed to legacy plaintext). */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(ENCRYPTED_PREFIX);
}

/** Encrypts `plaintext`, bound to `contextId` (the row owner's id). */
export async function encryptField(plaintext: string, contextId: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoder = new TextEncoder();
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: TAG_BYTES * 8, additionalData: encoder.encode(contextId) },
      key,
      encoder.encode(plaintext),
    ),
  );
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv, 0);
  out.set(sealed, IV_BYTES);
  return ENCRYPTED_PREFIX + Buffer.from(out).toString("base64");
}

/**
 * Decrypts a stored value for `contextId`. Legacy plaintext (no prefix) is
 * returned unchanged. Throws when the value was tampered with, was encrypted for
 * a different owner, or the key is wrong.
 */
export async function decryptField(stored: string, contextId: string): Promise<string> {
  if (!isEncrypted(stored)) return stored;
  const key = await getKey();
  const data = fromBase64(stored.slice(ENCRYPTED_PREFIX.length));
  if (data.byteLength < IV_BYTES + TAG_BYTES) throw new Error("encrypted_value_invalid");
  const iv = data.slice(0, IV_BYTES);
  const sealed = data.slice(IV_BYTES);
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: TAG_BYTES * 8,
        additionalData: new TextEncoder().encode(contextId),
      },
      key,
      sealed,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("decryption_failed");
  }
}
