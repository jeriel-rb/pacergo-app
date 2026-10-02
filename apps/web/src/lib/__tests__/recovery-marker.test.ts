import { describe, expect, it } from "vitest";
import { createRecoveryMarker, isValidRecoveryMarker } from "../recovery-marker";

const USER = "9a571ed8-2ef9-480a-ab4d-a9d9494b7e27";
const OTHER = "11111111-2222-3333-4444-555555555555";

describe("recovery marker", () => {
  it("accepts a marker issued for this user", () => {
    expect(isValidRecoveryMarker(createRecoveryMarker(USER), USER)).toBe(true);
  });

  it("rejects the old forgeable value and anything unsigned", () => {
    expect(isValidRecoveryMarker("1", USER)).toBe(false);
    expect(isValidRecoveryMarker(`${USER}.${Date.now() + 60_000}.forged`, USER)).toBe(false);
    expect(isValidRecoveryMarker("", USER)).toBe(false);
    expect(isValidRecoveryMarker(undefined, USER)).toBe(false);
  });

  it("is bound to the user it was issued for", () => {
    expect(isValidRecoveryMarker(createRecoveryMarker(USER), OTHER)).toBe(false);
    expect(isValidRecoveryMarker(createRecoveryMarker(USER), null)).toBe(false);
  });

  it("expires", () => {
    const issued = Date.parse("2026-10-02T10:00:00Z");
    const marker = createRecoveryMarker(USER, issued);
    expect(isValidRecoveryMarker(marker, USER, issued + 10 * 60_000)).toBe(true);
    expect(isValidRecoveryMarker(marker, USER, issued + 21 * 60_000)).toBe(false);
  });

  it("can't be extended by editing the expiry", () => {
    const [id, , sig] = createRecoveryMarker(USER, 1_000).split(".");
    expect(isValidRecoveryMarker(`${id}.${Date.now() + 86_400_000}.${sig}`, USER)).toBe(false);
  });
});
