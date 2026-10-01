import { describe, it, expect } from "vitest";
import { kgToLb, lbToKg, parseRepRange, recommendLoad } from "../plan/progression";

const sets = (kg: number, ...reps: number[]) => reps.map((r) => ({ weightKg: kg, reps: r }));

describe("parseRepRange", () => {
  it("reads ranges, single numbers and skips timed work", () => {
    expect(parseRepRange("6-10")).toEqual({ low: 6, high: 10 });
    expect(parseRepRange("12")).toEqual({ low: 12, high: 12 });
    expect(parseRepRange("30 sec")).toBeNull();
  });
});

describe("recommendLoad", () => {
  it("keeps the weight for 60 kg × 10/10/9/8 on 6–10 (the ticket's example)", () => {
    const r = recommendLoad({ targetReps: "6-10", previous: { sets: sets(60, 10, 10, 9, 8), effort: null } })!;
    expect(r).toMatchObject({ weightKg: 60, action: "maintain", reason: "within_range" });
  });

  it("adds a step when every set hit the top of the range", () => {
    const r = recommendLoad({ targetReps: "6-10", previous: { sets: sets(60, 10, 10, 10, 10), effort: "just_right" } })!;
    expect(r).toMatchObject({ weightKg: 61.5, action: "increase", reason: "hit_top_of_range" });
  });

  it("adds a step when it felt too light without missing reps", () => {
    expect(recommendLoad({ targetReps: "8-12", previous: { sets: sets(20, 10, 9, 9), effort: "too_light" } })!.action).toBe(
      "increase",
    );
  });

  it("takes a step off when it felt too heavy and sets fell short", () => {
    const r = recommendLoad({ targetReps: "8-12", previous: { sets: sets(100, 8, 6, 5), effort: "too_heavy" } })!;
    expect(r).toMatchObject({ weightKg: 97.5, action: "decrease" });
  });

  it("uses the heaviest working weight and clamps the step", () => {
    const r = recommendLoad({ targetReps: "6-10", previous: { sets: [...sets(200, 10, 10), ...sets(180, 10)], effort: null } })!;
    expect(r.previousKg).toBe(200);
    expect(r.weightKg).toBe(205); // 2.5% = 5 kg, the max step
    expect(recommendLoad({ targetReps: "10-12", previous: { sets: sets(8, 12, 12), effort: null } })!.weightKg).toBe(9);
  });

  it("has nothing to calibrate from without weighted sets or for timed work", () => {
    expect(recommendLoad({ targetReps: "8-12", previous: null })).toBeNull();
    expect(recommendLoad({ targetReps: "8-12", previous: { sets: [{ weightKg: null, reps: 10 }], effort: null } })).toBeNull();
    expect(recommendLoad({ targetReps: "30 sec", previous: { sets: sets(10, 30), effort: null } })).toBeNull();
  });
});

describe("unit conversion", () => {
  it("round-trips kg and lb", () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(kgToLb(62.5))).toBeCloseTo(62.5, 6);
  });
});
