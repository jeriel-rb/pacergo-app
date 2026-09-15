import { describe, it, expect } from "vitest";
import { maskBankAccount } from "../mask";

describe("maskBankAccount", () => {
  it("keeps only the last 4 characters, masking the rest", () => {
    // 16-digit PAN -> 12 stars + 1234
    expect(maskBankAccount("4111111111111111")).toBe("************1111");
  });

  it("handles short values (<=4) by masking everything", () => {
    expect(maskBankAccount("1234")).toBe("****");
    expect(maskBankAccount("12")).toBe("**");
  });

  it("preserves non-digit structure (branch code + dash + account)", () => {
    // "807-1234567-89" is 14 chars -> keep last 4 ("7-89"), mask the rest.
    const masked = maskBankAccount("807-1234567-89");
    expect(masked).toHaveLength("807-1234567-89".length);
    expect(masked.endsWith("7-89")).toBe(true);
    expect(masked).not.toContain("1234567"); // full account number never present
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(maskBankAccount(null)).toBe("");
    expect(maskBankAccount(undefined)).toBe("");
    expect(maskBankAccount("")).toBe("");
    expect(maskBankAccount("   ")).toBe("");
  });

  it("never returns the full raw value", () => {
    const raw = "000000000000001234";
    const masked = maskBankAccount(raw);
    expect(masked).not.toBe(raw);
    expect(masked).not.toContain(raw.slice(0, raw.length - 4));
  });
});
