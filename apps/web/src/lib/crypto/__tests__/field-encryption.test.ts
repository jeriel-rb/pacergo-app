// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ENCRYPTED_PREFIX,
  decryptField,
  encryptField,
  isEncrypted,
} from "../field-encryption";
import {
  ACCOUNT_NUMBER_PATTERN,
  encryptAccountNumber,
  maskAccountNumber,
  readAccountNumber,
} from "../bank-account";

const key = (bytes = 32) => Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64");
const USER = "7c1d3c34-0000-4000-8000-000000000001";
const OTHER = "7c1d3c34-0000-4000-8000-000000000002";

const original = process.env.ENCRYPTION_KEY;
beforeEach(() => {
  process.env.ENCRYPTION_KEY = key();
});
afterEach(() => {
  if (original === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = original;
});

describe("encryptField / decryptField", () => {
  it("round-trips a value", async () => {
    const cipher = await encryptField("123456780912", USER);
    expect(await decryptField(cipher, USER)).toBe("123456780912");
  });

  it("round-trips unicode and empty-ish values", async () => {
    for (const v of ["王小明 · 台灣銀行", "a", " 0012 "]) {
      expect(await decryptField(await encryptField(v, USER), USER)).toBe(v);
    }
  });

  it("stores a versioned, base64 value that does not contain the plaintext", async () => {
    const cipher = await encryptField("123456780912", USER);
    expect(cipher.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    expect(cipher).toMatch(/^enc:v1:[A-Za-z0-9+/=]+$/);
    expect(cipher).not.toContain("123456780912");
    expect(isEncrypted(cipher)).toBe(true);
  });

  it("uses a fresh random IV every time (same input, different ciphertext)", async () => {
    const a = await encryptField("123456780912", USER);
    const b = await encryptField("123456780912", USER);
    expect(a).not.toBe(b);
    expect(await decryptField(a, USER)).toBe(await decryptField(b, USER));
  });

  it("is bound to its owner: the ciphertext does not decrypt for another user", async () => {
    const cipher = await encryptField("123456780912", USER);
    await expect(decryptField(cipher, OTHER)).rejects.toThrow("decryption_failed");
  });

  it("detects tampering", async () => {
    const cipher = await encryptField("123456780912", USER);
    const bytes = Buffer.from(cipher.slice(ENCRYPTED_PREFIX.length), "base64");
    bytes[bytes.length - 1] ^= 0x01; // flip one bit of the auth tag
    const tampered = ENCRYPTED_PREFIX + bytes.toString("base64");
    await expect(decryptField(tampered, USER)).rejects.toThrow("decryption_failed");
    bytes[bytes.length - 1] ^= 0x01;
    bytes[14] ^= 0x01; // …and a bit of the ciphertext
    await expect(decryptField(ENCRYPTED_PREFIX + bytes.toString("base64"), USER)).rejects.toThrow(
      "decryption_failed",
    );
  });

  it("does not decrypt under a different key", async () => {
    const cipher = await encryptField("123456780912", USER);
    process.env.ENCRYPTION_KEY = key();
    await expect(decryptField(cipher, USER)).rejects.toThrow("decryption_failed");
  });

  it("rejects values too short to hold an IV and a tag", async () => {
    await expect(decryptField(ENCRYPTED_PREFIX + "AAAA", USER)).rejects.toThrow("encrypted_value_invalid");
  });

  it("returns legacy plaintext (no prefix) unchanged, so old rows keep working", async () => {
    expect(isEncrypted("123456780912")).toBe(false);
    expect(await decryptField("123456780912", USER)).toBe("123456780912");
  });

  it("accepts 128, 192 and 256-bit keys", async () => {
    for (const bytes of [16, 24, 32]) {
      process.env.ENCRYPTION_KEY = key(bytes);
      expect(await decryptField(await encryptField("x1", USER), USER)).toBe("x1");
    }
  });

  it("refuses to run without a key, or with a key of the wrong size", async () => {
    delete process.env.ENCRYPTION_KEY;
    await expect(encryptField("x", USER)).rejects.toThrow("encryption_unavailable");
    await expect(decryptField(ENCRYPTED_PREFIX + "A".repeat(60), USER)).rejects.toThrow("encryption_unavailable");
    process.env.ENCRYPTION_KEY = key(10);
    await expect(encryptField("x", USER)).rejects.toThrow("encryption_key_invalid");
  });

  it("still lets legacy plaintext through when no key is configured", async () => {
    delete process.env.ENCRYPTION_KEY;
    expect(await decryptField("123456780912", USER)).toBe("123456780912");
  });
});

describe("bank account helpers", () => {
  it("masks all but the last 4 digits, like the database does", () => {
    expect(maskAccountNumber("123456780912")).toBe("********0912");
    expect(maskAccountNumber("12345678")).toBe("****5678");
    expect(maskAccountNumber("  123456780912 ")).toBe("********0912");
    expect(maskAccountNumber("1234")).toBe("****");
    expect(maskAccountNumber("")).toBeNull();
    expect(maskAccountNumber(null)).toBeNull();
  });

  it("accepts 8–16 digit account numbers only", () => {
    for (const ok of ["12345678", "1234567890123456"]) expect(ACCOUNT_NUMBER_PATTERN.test(ok)).toBe(true);
    for (const bad of ["1234567", "12345678901234567", "1234-5678-0912", "abcdefgh", "", " 12345678"]) {
      expect(ACCOUNT_NUMBER_PATTERN.test(bad)).toBe(false);
    }
  });

  it("encrypts an account number for its owner and reads it back", async () => {
    const stored = await encryptAccountNumber(USER, "123456780912");
    expect(stored).not.toContain("123456780912");
    expect(await readAccountNumber(USER, stored)).toBe("123456780912");
    await expect(readAccountNumber(OTHER, stored)).rejects.toThrow();
  });

  it("reads nothing when nothing is stored, and legacy plaintext as it is", async () => {
    expect(await readAccountNumber(USER, null)).toBeNull();
    expect(await readAccountNumber(USER, "")).toBeNull();
    expect(await readAccountNumber(USER, "123456780912")).toBe("123456780912");
  });

  it("produces a value the database's save function accepts (shape and size)", async () => {
    // mirrors the checks in save_bank_account_encrypted
    for (const digits of ["12345678", "1234567890123456"]) {
      const cipher = await encryptAccountNumber(USER, digits);
      expect(cipher).toMatch(/^enc:v1:[A-Za-z0-9+/=]{40,400}$/);
      expect(maskAccountNumber(digits)).toMatch(/^[*]{0,12}[0-9]{1,4}$|^[*]{1,4}$/);
    }
  });
});
