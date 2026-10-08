import { describe, it, expect } from "vitest";
import { tierStates } from "../tier-eligibility";

const st = (status: "pending" | "approved" | "rejected") => ({ status, label: null });
const none = { backgrounds: {}, verifications: {}, competitions: {} };

describe("tierStates", () => {
  it("is missing everywhere with no proof", () => {
    expect(tierStates("gym", none)).toEqual({ C: "missing", B: "missing", A: "missing" });
  });

  it("verifies C from a background proof only", () => {
    expect(tierStates("running", { ...none, backgrounds: { running: st("approved") } })).toEqual({
      C: "verified",
      B: "missing",
      A: "missing",
    });
  });

  it("lets a certification cover C and B; A also needs competition proof", () => {
    const maps = { ...none, verifications: { gym: st("approved") } };
    expect(tierStates("gym", maps)).toEqual({ C: "verified", B: "verified", A: "missing" });
    expect(
      tierStates("gym", { ...maps, competitions: { gym: st("approved") } }).A,
    ).toBe("verified");
  });

  it("is per activity", () => {
    const maps = { ...none, verifications: { gym: st("approved") } };
    expect(tierStates("hyrox", maps)).toEqual({ C: "missing", B: "missing", A: "missing" });
  });

  it("reports pending and rejected", () => {
    expect(tierStates("gym", { ...none, backgrounds: { gym: st("pending") } }).C).toBe("pending");
    expect(tierStates("gym", { ...none, backgrounds: { gym: st("rejected") } }).C).toBe("rejected");
    expect(
      tierStates("gym", { ...none, verifications: { gym: st("approved") }, competitions: { gym: st("rejected") } }).A,
    ).toBe("rejected");
  });
});
