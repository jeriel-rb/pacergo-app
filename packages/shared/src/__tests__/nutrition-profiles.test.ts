import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  calculateNutrition,
  isValidSavedNutrition,
  missingNutritionInputs,
  nutritionNeedsRecalc,
  type NutritionInputs,
} from "../nutrition/calculate-nutrition";
import { DEFAULT_NUTRITION_RULES } from "../nutrition/nutrition-rules";
import { sanitizeAboutYou, sanitizeTrainingPreferences } from "../nutrition/profile-limits";
import {
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  ONBOARDING_GOALS,
  ONBOARDING_EXPERIENCES,
  type ActivityLevel,
} from "../onboarding/onboarding-types";

const ACTIVITY: readonly ActivityLevel[] = ["low", "moderate", "high"];
const GENDERS = ["male", "female"] as const;

const BASE: NutritionInputs = {
  gender: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderate",
  goal: "stay_healthy",
  experience: "intermediate",
  trainingDaysPerWeek: 4,
};

// Realistic body shapes, from small/light to large/heavy, young to old.
const BODIES = [
  { age: 18, heightCm: 150, weightKg: 42 },
  { age: 25, heightCm: 165, weightKg: 58 },
  { age: 30, heightCm: 180, weightKg: 80 },
  { age: 45, heightCm: 172, weightKg: 95 },
  { age: 62, heightCm: 160, weightKg: 70 },
  { age: 80, heightCm: 155, weightKg: 50 },
  { age: 35, heightCm: 200, weightKg: 130 },
];

function allProfiles(): NutritionInputs[] {
  const out: NutritionInputs[] = [];
  for (const gender of GENDERS)
    for (const body of BODIES)
      for (const activityLevel of ACTIVITY)
        for (const goal of ONBOARDING_GOALS)
          for (const experience of ONBOARDING_EXPERIENCES)
            for (let trainingDaysPerWeek = 0; trainingDaysPerWeek <= 7; trainingDaysPerWeek++)
              out.push({ gender, ...body, activityLevel, goal, experience, trainingDaysPerWeek });
  return out;
}

describe("calculateNutrition — hand-verified numbers", () => {
  it("female BMR uses the −161 offset (Mifflin-St Jeor)", () => {
    // 10·60 + 6.25·165 − 5·28 − 161 = 600 + 1031.25 − 140 − 161 = 1330.25
    const r = calculateNutrition({
      ...BASE,
      gender: "female",
      age: 28,
      heightCm: 165,
      weightKg: 60,
      activityLevel: "low",
      goal: "stay_healthy",
      experience: "basic",
      trainingDaysPerWeek: 0,
    })!;
    expect(r.bmrKcal).toBe(1330);
    // × 1.2 = 1596.3 → 1600
    expect(r.maintenanceKcal).toBe(1600);
    expect(r.dailyCalories).toBe(1600);
    // 1.2 g/kg × 60 = 72 → 70
    expect(r.proteinGPerKg).toBe(1.2);
    expect(r.proteinGrams).toBe(70);
  });

  it("applies each goal factor to maintenance", () => {
    const m = calculateNutrition(BASE)!.maintenanceKcal; // 2630
    const cut = calculateNutrition({ ...BASE, goal: "lose_weight" })!.dailyCalories;
    const bulk = calculateNutrition({ ...BASE, goal: "build_muscle" })!.dailyCalories;
    // Unrounded maintenance is 2625.5; the goal factor applies before rounding.
    expect(cut).toBe(Math.round((2625.5 * 0.8) / 10) * 10); // 2100
    expect(bulk).toBe(Math.round((2625.5 * 1.1) / 10) * 10); // 2890
    expect(cut).toBeLessThan(m);
    expect(bulk).toBeGreaterThan(m);
  });

  it("sums training-day factor linearly: +0.025 × BMR per weekly session", () => {
    const zero = calculateNutrition({ ...BASE, trainingDaysPerWeek: 0 })!.maintenanceKcal;
    const seven = calculateNutrition({ ...BASE, trainingDaysPerWeek: 7 })!.maintenanceKcal;
    // 1780 × 0.025 × 7 = 311.5 apart (±10 rounding)
    expect(Math.abs(seven - zero - 311.5)).toBeLessThanOrEqual(10);
  });

  it("protein per kg matches the rules table for every goal × experience (below the bonus threshold)", () => {
    for (const goal of ONBOARDING_GOALS)
      for (const experience of ONBOARDING_EXPERIENCES) {
        const r = calculateNutrition({ ...BASE, goal, experience, trainingDaysPerWeek: 3 })!;
        expect(r.proteinGPerKg).toBe(DEFAULT_NUTRITION_RULES.proteinGPerKg[goal][experience]);
      }
  });

  it("training bonus starts exactly at the configured threshold", () => {
    const { minSessionsPerWeek, gPerKg } = DEFAULT_NUTRITION_RULES.proteinTrainingBonus;
    const below = calculateNutrition({ ...BASE, trainingDaysPerWeek: minSessionsPerWeek - 1 })!;
    const at = calculateNutrition({ ...BASE, trainingDaysPerWeek: minSessionsPerWeek })!;
    expect(at.proteinGPerKg - below.proteinGPerKg).toBeCloseTo(gPerKg, 5);
  });

  it("rounds output to the documented steps", () => {
    const r = calculateNutrition({ ...BASE, weightKg: 77.7, heightCm: 176.3 })!;
    expect(r.maintenanceKcal % 10).toBe(0);
    expect(r.dailyCalories % 10).toBe(0);
    expect(r.proteinGrams % 5).toBe(0);
    expect(Number.isInteger(r.bmrKcal)).toBe(true);
  });

  it("hydration is weight × 35 ml, rounded to 0.1 L", () => {
    const hyd = (w: number) =>
      calculateNutrition({ ...BASE, weightKg: w })!.guidance.find((g) => g.key === "hydration")!.params!.liters;
    expect(hyd(80)).toBe(2.8);
    expect(hyd(50)).toBe(1.8); // 1.75 → 1.8
    expect(hyd(100)).toBe(3.5);
  });
});

describe("calculateNutrition — invariants across the whole profile space", () => {
  const profiles = allProfiles();

  it("covers a large, varied profile space", () => {
    expect(profiles.length).toBeGreaterThan(2000);
  });

  it("always yields finite, positive, correctly-shaped targets", () => {
    for (const p of profiles) {
      const r = calculateNutrition(p);
      expect(r, JSON.stringify(p)).not.toBeNull();
      for (const n of [r!.bmrKcal, r!.maintenanceKcal, r!.dailyCalories, r!.proteinGrams, r!.proteinGPerKg]) {
        expect(Number.isFinite(n), JSON.stringify(p)).toBe(true);
        expect(n).toBeGreaterThan(0);
      }
      expect(r!.rulesVersion).toBe(DEFAULT_NUTRITION_RULES.version);
    }
  });

  it("never recommends below the gender floor — unless maintenance itself is lower", () => {
    const { minCalories } = DEFAULT_NUTRITION_RULES;
    for (const p of profiles) {
      const r = calculateNutrition(p)!;
      const floor = Math.min(minCalories[p.gender as "male" | "female"], r.maintenanceKcal);
      // Allow the 10-kcal rounding step.
      expect(r.dailyCalories).toBeGreaterThanOrEqual(floor - 10);
    }
  });

  it("a weight-loss target is never above maintenance; muscle gain never below it", () => {
    for (const p of profiles) {
      const r = calculateNutrition(p)!;
      if (p.goal === "lose_weight") expect(r.dailyCalories).toBeLessThanOrEqual(r.maintenanceKcal);
      if (p.goal === "build_muscle") expect(r.dailyCalories).toBeGreaterThanOrEqual(r.maintenanceKcal);
    }
  });

  it("protein stays within sane bounds (≥ 1.0 and ≤ the cap, in g/kg)", () => {
    for (const p of profiles) {
      const r = calculateNutrition(p)!;
      expect(r.proteinGPerKg).toBeGreaterThanOrEqual(1.0);
      expect(r.proteinGPerKg).toBeLessThanOrEqual(DEFAULT_NUTRITION_RULES.proteinGPerKgMax);
      // Rounded grams stay within half a rounding step of the g/kg figure.
      expect(Math.abs(r.proteinGrams - r.proteinGPerKg * p.weightKg!)).toBeLessThanOrEqual(2.5 + 0.01 * p.weightKg!);
    }
  });

  it("more experience never lowers protein; higher activity/training never lowers calories", () => {
    for (const goal of ONBOARDING_GOALS) {
      let prev = 0;
      for (const experience of ONBOARDING_EXPERIENCES) {
        const g = calculateNutrition({ ...BASE, goal, experience })!.proteinGPerKg;
        expect(g).toBeGreaterThanOrEqual(prev);
        prev = g;
      }
    }
    for (const p of profiles.filter((x) => x.goal === "stay_healthy" && x.experience === "basic")) {
      const more = calculateNutrition({ ...p, trainingDaysPerWeek: Math.min(7, (p.trainingDaysPerWeek ?? 0) + 1) })!;
      expect(more.maintenanceKcal).toBeGreaterThanOrEqual(calculateNutrition(p)!.maintenanceKcal);
    }
  });

  it("is monotonic in body size and age (heavier/taller → more; older → less)", () => {
    const kcal = (o: Partial<NutritionInputs>) => calculateNutrition({ ...BASE, ...o })!.maintenanceKcal;
    expect(kcal({ weightKg: 90 })).toBeGreaterThan(kcal({ weightKg: 70 }));
    expect(kcal({ heightCm: 190 })).toBeGreaterThan(kcal({ heightCm: 170 }));
    expect(kcal({ age: 50 })).toBeLessThan(kcal({ age: 25 }));
  });

  it("men get more calories than women of identical stats", () => {
    for (const p of profiles.filter((x) => x.gender === "male")) {
      const f = calculateNutrition({ ...p, gender: "female" })!;
      expect(calculateNutrition(p)!.bmrKcal).toBeGreaterThan(f.bmrKcal);
    }
  });

  it("guidance always has the core items, only known keys, and finite params", () => {
    const known = new Set([
      "proteinPerMeal",
      "proteinFoods",
      "goal_lose_weight",
      "goal_build_muscle",
      "goal_stay_healthy",
      "goal_functional",
      "activity_low",
      "activity_high",
      "hydration",
    ]);
    for (const p of profiles) {
      const g = calculateNutrition(p)!.guidance;
      const keys = g.map((x) => x.key);
      expect(keys[0]).toBe("proteinPerMeal");
      expect(keys).toContain(`goal_${p.goal}`);
      expect(keys.at(-1)).toBe("hydration");
      expect(new Set(keys).size).toBe(keys.length);
      for (const item of g) {
        expect(known.has(item.key)).toBe(true);
        for (const v of Object.values(item.params ?? {})) expect(Number.isFinite(v)).toBe(true);
      }
      expect(keys.includes("activity_low")).toBe(p.activityLevel === "low");
      expect(keys.includes("activity_high")).toBe(p.activityLevel === "high");
    }
  });

  it("every guidance key has copy in both the English and Chinese locale files", () => {
    // Guards against shipping a key the UI can't translate.
    const root = resolve(__dirname, "../../../../apps/web/src/locales");
    const load = (l: string) => JSON.parse(readFileSync(resolve(root, l, "plan.json"), "utf8"));
    const keys = new Set(profiles.flatMap((p) => calculateNutrition(p)!.guidance.map((g) => g.key)));
    for (const locale of ["en", "zh"]) {
      const copy = load(locale).nutrition.guidance as Record<string, string>;
      for (const key of keys) expect(copy[key], `${locale}:${key}`).toBeTruthy();
      // Every {{param}} the copy uses is supplied by the calculator.
      expect(copy.proteinPerMeal).toContain("{{grams}}");
      expect(copy.hydration).toContain("{{liters}}");
    }
  });
});

describe("calculateNutrition — purity and determinism", () => {
  it("returns an identical result on repeat calls", () => {
    for (const p of allProfiles().filter((_, i) => i % 37 === 0)) {
      expect(JSON.stringify(calculateNutrition(p))).toBe(JSON.stringify(calculateNutrition({ ...p })));
    }
  });

  it("does not mutate its input or the shared default rules", () => {
    const input = Object.freeze({ ...BASE });
    const rulesBefore = JSON.stringify(DEFAULT_NUTRITION_RULES);
    expect(() => calculateNutrition(input)).not.toThrow();
    expect(JSON.stringify(DEFAULT_NUTRITION_RULES)).toBe(rulesBefore);
  });

  it("returns fresh objects: mutating one result never leaks into the next", () => {
    const a = calculateNutrition(BASE)!;
    a.guidance.push({ key: "hydration" });
    a.inputs.age = 99;
    const b = calculateNutrition(BASE)!;
    expect(b.guidance).toHaveLength(4); // moderate activity: no activity tip
    expect(b.inputs.age).toBe(30);
  });

  it("ignores extra fields passed in (e.g. a whole FitnessProfile) when storing inputs", () => {
    const wide = { ...BASE, equipment: ["barbell"], trainingDays: [1, 2], primaryActivity: "running" } as NutritionInputs;
    const r = calculateNutrition(wide)!;
    expect(Object.keys(r.inputs).sort()).toEqual(
      ["activityLevel", "age", "experience", "gender", "goal", "heightCm", "trainingDaysPerWeek", "weightKg"].sort(),
    );
  });
});

describe("missing / incomplete profiles", () => {
  it("returns null for each required field missing, one at a time", () => {
    const cases: [Partial<NutritionInputs>, string][] = [
      [{ gender: null }, "gender"],
      [{ gender: "other" }, "gender"],
      [{ age: null }, "age"],
      [{ age: 0 }, "age"],
      [{ heightCm: null }, "heightCm"],
      [{ heightCm: 0 }, "heightCm"],
      [{ weightKg: null }, "weightKg"],
      [{ weightKg: 0 }, "weightKg"],
      [{ activityLevel: null }, "activityLevel"],
      [{ goal: null }, "goal"],
    ];
    for (const [patch, field] of cases) {
      const p = { ...BASE, ...patch };
      expect(calculateNutrition(p), field).toBeNull();
      expect(missingNutritionInputs(p)).toEqual([field]);
    }
  });

  it("an empty profile reports every required field, and NaN is treated as missing", () => {
    const empty: NutritionInputs = {
      gender: null, age: null, heightCm: null, weightKg: null,
      activityLevel: null, goal: null, experience: null, trainingDaysPerWeek: null,
    };
    expect(missingNutritionInputs(empty)).toEqual(["gender", "age", "heightCm", "weightKg", "activityLevel", "goal"]);
    expect(calculateNutrition({ ...BASE, age: NaN })).toBeNull();
    expect(calculateNutrition({ ...BASE, weightKg: NaN })).toBeNull();
  });

  it("experience and training days are optional (neutral fallbacks)", () => {
    expect(missingNutritionInputs({ ...BASE, experience: null, trainingDaysPerWeek: null })).toEqual([]);
  });

  it("rejects out-of-range or non-numeric body facts instead of computing nonsense", () => {
    const bad: [keyof NutritionInputs, unknown][] = [
      ["age", -5], ["age", 12], ["age", 101], ["age", Infinity], ["age", "30"],
      ["heightCm", -1], ["heightCm", 89], ["heightCm", 276], ["heightCm", Infinity],
      ["weightKg", -80], ["weightKg", 24], ["weightKg", 251], ["weightKg", 1e9], ["weightKg", "80"],
    ];
    for (const [field, value] of bad) {
      const p = { ...BASE, [field]: value } as NutritionInputs;
      expect(calculateNutrition(p), `${field}=${String(value)}`).toBeNull();
      expect(missingNutritionInputs(p)).toContain(field);
    }
  });

  it("accepts the exact bounds and everything the pickers can produce", () => {
    for (const [field, values] of [
      ["age", [13, 90, 100]],
      ["heightCm", [90, 120, 220, 275]],
      ["weightKg", [25, 30, 180, 250]],
    ] as const)
      for (const value of values) {
        const r = calculateNutrition({ ...BASE, [field]: value });
        expect(r, `${field}=${value}`).not.toBeNull();
        expect(r!.dailyCalories).toBeGreaterThan(0);
        expect(r!.proteinGrams).toBeGreaterThan(0);
      }
  });

  it("clamps absurd training-day counts rather than inflating calories", () => {
    const seven = calculateNutrition({ ...BASE, trainingDaysPerWeek: 7 })!;
    expect(calculateNutrition({ ...BASE, trainingDaysPerWeek: 99 })!.dailyCalories).toBe(seven.dailyCalories);
    const zero = calculateNutrition({ ...BASE, trainingDaysPerWeek: 0 })!;
    expect(calculateNutrition({ ...BASE, trainingDaysPerWeek: -3 })!.dailyCalories).toBe(zero.dailyCalories);
    expect(calculateNutrition({ ...BASE, trainingDaysPerWeek: NaN })!.dailyCalories).toBe(zero.dailyCalories);
  });
});

describe("profile sanitizers and saved-nutrition validation", () => {
  it("sanitizeAboutYou nulls only the bad values", () => {
    const out = sanitizeAboutYou({
      ...ONBOARDING_ANSWERS_DEFAULT,
      age: 9999,
      heightCm: 180,
      weightKg: -4,
      useCases: ["personalized_plan"],
    } as typeof ONBOARDING_ANSWERS_DEFAULT & { useCases: string[] });
    expect([out.age, out.heightCm, out.weightKg]).toEqual([null, 180, null]);
    expect(out).not.toHaveProperty("useCases");
  });

  it("sanitizeTrainingPreferences repairs frequency, duration, rest range and day list", () => {
    const messy = {
      ...TRAINING_PREFERENCES_DEFAULT,
      daysPerWeek: "banana",
      trainingDays: "nope",
      durationMin: 9999,
      restTimerMinSec: 500,
      restTimerMaxSec: 5,
    } as unknown as typeof TRAINING_PREFERENCES_DEFAULT;
    const out = sanitizeTrainingPreferences(messy, TRAINING_PREFERENCES_DEFAULT);
    expect(out.daysPerWeek).toBeNull();
    expect(out.trainingDays).toEqual([]);
    expect(out.durationMin).toBeNull();
    expect([out.restTimerMinSec, out.restTimerMaxSec]).toEqual([
      TRAINING_PREFERENCES_DEFAULT.restTimerMinSec,
      TRAINING_PREFERENCES_DEFAULT.restTimerMaxSec,
    ]);
    const ok = sanitizeTrainingPreferences(
      { ...TRAINING_PREFERENCES_DEFAULT, daysPerWeek: "4", durationMin: 60, restTimerMinSec: 45, restTimerMaxSec: 90 },
      TRAINING_PREFERENCES_DEFAULT,
    );
    expect([ok.daysPerWeek, ok.durationMin, ok.restTimerMinSec, ok.restTimerMaxSec]).toEqual(["4", 60, 45, 90]);
  });

  it("isValidSavedNutrition accepts real results and rejects malformed or absurd blobs", () => {
    const real = JSON.parse(JSON.stringify(calculateNutrition(BASE)));
    expect(isValidSavedNutrition(real)).toBe(true);
    for (const bad of [
      null, undefined, "x", 5, [], {},
      { ...real, dailyCalories: -1 },
      { ...real, proteinGrams: 1e9 },
      { ...real, bmrKcal: "1780" },
      { ...real, guidance: "nope" },
      { ...real, inputs: null },
      { ...real, proteinGPerKg: NaN },
    ])
      expect(isValidSavedNutrition(bad)).toBe(false);
  });

  it("every plausible profile's own result passes isValidSavedNutrition", () => {
    for (const p of allProfiles().filter((_, i) => i % 11 === 0))
      expect(isValidSavedNutrition(JSON.parse(JSON.stringify(calculateNutrition(p))))).toBe(true);
  });
});

describe("nutritionNeedsRecalc — every input counts, nothing else does", () => {
  const saved = calculateNutrition(BASE)!;
  const changes: Partial<NutritionInputs>[] = [
    { gender: "female" },
    { age: 31 },
    { heightCm: 181 },
    { weightKg: 81 },
    { activityLevel: "high" },
    { goal: "build_muscle" },
    { experience: "advanced" },
    { trainingDaysPerWeek: 5 },
  ];

  it("flags a change to each of the 8 nutrition inputs", () => {
    for (const change of changes) expect(nutritionNeedsRecalc(saved, { ...BASE, ...change }), JSON.stringify(change)).toBe(true);
  });

  it("treats undefined and null as the same 'no value'", () => {
    const noExp = calculateNutrition({ ...BASE, experience: null })!;
    expect(nutritionNeedsRecalc(noExp, { ...BASE, experience: undefined as unknown as null })).toBe(false);
  });

  it("is stale when the saved result is from an older rules version, fresh once recomputed", () => {
    const old = { ...saved, rulesVersion: DEFAULT_NUTRITION_RULES.version - 1 };
    expect(nutritionNeedsRecalc(old, BASE)).toBe(true);
    expect(nutritionNeedsRecalc(calculateNutrition(BASE)!, BASE)).toBe(false);
  });

  it("a recalculation after any change is itself fresh (round-trips through JSON like the DB row)", () => {
    for (const change of changes) {
      const profile = { ...BASE, ...change };
      const persisted = JSON.parse(JSON.stringify(calculateNutrition(profile))) as typeof saved;
      expect(nutritionNeedsRecalc(persisted, profile)).toBe(false);
    }
  });
});
