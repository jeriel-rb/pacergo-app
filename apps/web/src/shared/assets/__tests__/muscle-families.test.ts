import { describe, it, expect } from "vitest";
import { ONBOARDING_MUSCLE_GROUPS } from "@pacergo/shared";
import { MUSCLE_FAMILIES } from "../images";

describe("MUSCLE_FAMILIES", () => {
  it("places every muscle group in exactly one family row", () => {
    const placed = MUSCLE_FAMILIES.flatMap((f) => f.muscles);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...ONBOARDING_MUSCLE_GROUPS].sort());
  });

  it("keeps front, middle and rear delts together", () => {
    const shoulders = MUSCLE_FAMILIES.find((f) => f.key === "shoulders");
    expect(shoulders?.muscles).toEqual(["front_deltoid", "middle_deltoid", "rear_deltoid"]);
  });
});
