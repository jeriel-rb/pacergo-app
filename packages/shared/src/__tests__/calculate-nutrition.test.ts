import { describe, it, expect } from "vitest";
import { calculateNutrition, missingNutritionInputs, nutritionNeedsRecalc } from "../nutrition/calculate-nutrition";
import { profileStepCompletion, toFitnessProfile, type FitnessProfile } from "../nutrition/fitness-profile";
import type { NutritionInputs } from "../nutrition/calculate-nutrition";
import { DEFAULT_NUTRITION_RULES, type NutritionRules } from "../nutrition/nutrition-rules";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  resolveTrainingDays,
  trainingDaysComplete,
} from "../onboarding/onboarding-types";

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

describe("toFitnessProfile", () => {
  it("flattens all three answer slices into one profile", () => {
    const profile = toFitnessProfile(
      { ...ONBOARDING_ANSWERS_DEFAULT, age: 25, activityLevel: "high" },
      { ...TRAINING_PREFERENCES_DEFAULT, daysPerWeek: "3", trainingDays: [5, 1, 3], durationMin: 60 },
      { ...GYM_EQUIPMENT_DEFAULT, gymType: "garage_gym", equipment: ["dumbbells", "bench"] },
    );
    expect(profile.age).toBe(25);
    expect(profile.activityLevel).toBe("high");
    expect(profile.trainingDaysPerWeek).toBe(3);
    expect(profile.trainingDays).toEqual([1, 3, 5]);
    expect(profile.sessionDurationMin).toBe(60);
    expect(profile.equipment).toEqual(["dumbbells", "bench"]);
  });

  it("treats a missing activityLevel (older saved answers) as null", () => {
    const { activityLevel: _, ...legacy } = ONBOARDING_ANSWERS_DEFAULT;
    const profile = toFitnessProfile(
      legacy as typeof ONBOARDING_ANSWERS_DEFAULT,
      TRAINING_PREFERENCES_DEFAULT,
      GYM_EQUIPMENT_DEFAULT,
    );
    expect(profile.activityLevel).toBeNull();
  });
});

describe("trainingDaysComplete", () => {
  it("requires exactly as many days as the weekly frequency", () => {
    expect(trainingDaysComplete("3", [0, 2, 4])).toBe(true);
    expect(trainingDaysComplete("3", [0, 2])).toBe(false);
    expect(trainingDaysComplete("3", [])).toBe(false);
    expect(trainingDaysComplete("every_day", [])).toBe(true);
    expect(trainingDaysComplete(null, [0])).toBe(false);
  });
});

describe("profileStepCompletion gender", () => {
  const aboutYou = {
    ...ONBOARDING_ANSWERS_DEFAULT,
    goal: "build_muscle" as const,
    obstacle: "lack_of_time" as const,
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activityLevel: "moderate" as const,
  };
  it("requires a male/female answer for About You", () => {
    const run = (gender: "male" | "other" | null) =>
      profileStepCompletion({ ...aboutYou, gender }, TRAINING_PREFERENCES_DEFAULT, GYM_EQUIPMENT_DEFAULT).aboutYou;
    expect(run("male")).toBe(true);
    expect(run("other")).toBe(false);
    expect(run(null)).toBe(false);
  });
});

describe("resolveTrainingDays", () => {
  it("uses the user's picked days when the count matches", () => {
    expect(resolveTrainingDays("2", [6, 2])).toEqual([2, 6]);
  });

  it("falls back to the default spread when the pick doesn't fit the frequency", () => {
    expect(resolveTrainingDays("3", [])).toEqual([0, 2, 4]);
    expect(resolveTrainingDays("3", [0, 1])).toEqual([0, 2, 4]);
    expect(resolveTrainingDays("2", [1, 9])).toEqual([1, 3]);
  });
});

describe("profileStepCompletion", () => {
  it("marks only fully answered sections as done", () => {
    const done = profileStepCompletion(
      {
        ...ONBOARDING_ANSWERS_DEFAULT,
        gender: "female",
        goal: "build_muscle",
        obstacle: "lack_of_time",
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: null,
      },
      TRAINING_PREFERENCES_DEFAULT,
      { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", addCardio: false },
    );
    expect(done).toEqual({ aboutYou: false, trainingPreferences: false, gymEquipment: true });
  });
});

describe("calculateNutrition", () => {
  it("returns null and lists what's missing when required inputs are absent", () => {
    const profile = { ...BASE, gender: "other" as const, weightKg: null, activityLevel: null };
    expect(calculateNutrition(profile)).toBeNull();
    expect(missingNutritionInputs(profile)).toEqual(["gender", "weightKg", "activityLevel"]);
  });

  it("computes Mifflin-St Jeor BMR and an activity-scaled maintenance", () => {
    const r = calculateNutrition(BASE)!;
    // 10·80 + 6.25·180 − 5·30 + 5 = 1780
    expect(r.bmrKcal).toBe(1780);
    // 1780 × (1.375 + 0.025·4) = 2625.5 → 2630
    expect(r.maintenanceKcal).toBe(2630);
    expect(r.dailyCalories).toBe(2630);
    expect(r.rulesVersion).toBe(DEFAULT_NUTRITION_RULES.version);
  });

  it("raises calories with daily activity level", () => {
    const low = calculateNutrition({ ...BASE, activityLevel: "low" })!.dailyCalories;
    const mod = calculateNutrition({ ...BASE, activityLevel: "moderate" })!.dailyCalories;
    const high = calculateNutrition({ ...BASE, activityLevel: "high" })!.dailyCalories;
    expect(low).toBeLessThan(mod);
    expect(mod).toBeLessThan(high);
  });

  it("adjusts calories for the fitness goal", () => {
    const lose = calculateNutrition({ ...BASE, goal: "lose_weight" })!.dailyCalories;
    const keep = calculateNutrition({ ...BASE, goal: "stay_healthy" })!.dailyCalories;
    const gain = calculateNutrition({ ...BASE, goal: "build_muscle" })!.dailyCalories;
    expect(lose).toBeLessThan(keep);
    expect(gain).toBeGreaterThan(keep);
  });

  it("never drops below the per-gender calorie floor", () => {
    const r = calculateNutrition({
      ...BASE,
      age: 60,
      heightCm: 165,
      weightKg: 55,
      activityLevel: "low",
      goal: "lose_weight",
      trainingDaysPerWeek: 0,
    })!;
    expect(r.maintenanceKcal).toBeGreaterThan(1500);
    expect(r.dailyCalories).toBe(1500);
  });

  it("caps the floor at maintenance so a deficit never becomes a surplus", () => {
    const r = calculateNutrition({
      ...BASE,
      gender: "female",
      age: 60,
      heightCm: 150,
      weightKg: 45,
      activityLevel: "low",
      goal: "lose_weight",
      trainingDaysPerWeek: 0,
    })!;
    expect(r.maintenanceKcal).toBeLessThan(1200);
    expect(r.dailyCalories).toBe(r.maintenanceKcal);
  });

  it("gives protein in grams from current body weight, influenced by goal", () => {
    const keep = calculateNutrition(BASE)!;
    expect(keep.proteinGPerKg).toBe(1.4);
    expect(keep.proteinGrams).toBe(110); // 1.4 × 80 = 112 → 110
    const cut = calculateNutrition({ ...BASE, goal: "lose_weight" })!;
    expect(cut.proteinGrams).toBeGreaterThan(keep.proteinGrams);
    const heavier = calculateNutrition({ ...BASE, weightKg: 100 })!;
    expect(heavier.proteinGrams).toBeGreaterThan(keep.proteinGrams);
  });

  it("adds a protein bonus at high training frequency, capped at the max", () => {
    expect(calculateNutrition({ ...BASE, trainingDaysPerWeek: 5 })!.proteinGPerKg).toBe(1.6);
    const rules: NutritionRules = { ...DEFAULT_NUTRITION_RULES, proteinGPerKgMax: 1.5 };
    expect(calculateNutrition({ ...BASE, trainingDaysPerWeek: 6 }, rules)!.proteinGPerKg).toBe(1.5);
  });

  it("uses injected rules rather than fixed constants", () => {
    const rules: NutritionRules = {
      ...DEFAULT_NUTRITION_RULES,
      version: 99,
      goalCalorieFactor: { ...DEFAULT_NUTRITION_RULES.goalCalorieFactor, stay_healthy: 0.5 },
    };
    const r = calculateNutrition(BASE, rules)!;
    expect(r.dailyCalories).toBe(1500); // floored
    expect(r.rulesVersion).toBe(99);
  });

  it("falls back to neutral defaults for experience and training days", () => {
    const r = calculateNutrition({ ...BASE, experience: null, trainingDaysPerWeek: null })!;
    expect(r.maintenanceKcal).toBe(2450); // 1780 × 1.375 = 2447.5, no training factor
    expect(r.proteinGPerKg).toBe(1.2);
  });

  it("requires a male/female gender", () => {
    expect(calculateNutrition({ ...BASE, gender: null })).toBeNull();
    expect(calculateNutrition({ ...BASE, gender: "other" })).toBeNull();
  });
});

describe("nutritionNeedsRecalc", () => {
  const saved = calculateNutrition(BASE)!;

  it("is false when nothing relevant changed", () => {
    expect(nutritionNeedsRecalc(saved, { ...BASE })).toBe(false);
  });

  it("ignores profile fields nutrition doesn't use", () => {
    const full = toFitnessProfile(
      {
        ...ONBOARDING_ANSWERS_DEFAULT,
        gender: "male",
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: "moderate",
        goal: "stay_healthy",
      },
      { ...TRAINING_PREFERENCES_DEFAULT, experience: "intermediate", daysPerWeek: "4" },
      { ...GYM_EQUIPMENT_DEFAULT, equipment: ["dumbbells"] },
    );
    const result = calculateNutrition(full)!;
    expect(result.inputs).not.toHaveProperty("equipment");
    const changed: FitnessProfile = { ...full, equipment: ["barbell"], trainingDays: [1, 2, 4, 5] };
    expect(nutritionNeedsRecalc(result, changed)).toBe(false);
  });

  it("is true when an input changes", () => {
    expect(nutritionNeedsRecalc(saved, { ...BASE, activityLevel: "high" })).toBe(true);
    expect(nutritionNeedsRecalc(saved, { ...BASE, weightKg: 79 })).toBe(true);
  });

  it("is true when the rules version changes", () => {
    expect(nutritionNeedsRecalc(saved, BASE, { ...DEFAULT_NUTRITION_RULES, version: 2 })).toBe(true);
  });

  it("is true when nothing is saved yet but a result can be computed", () => {
    expect(nutritionNeedsRecalc(null, BASE)).toBe(true);
    expect(nutritionNeedsRecalc(null, { ...BASE, goal: null })).toBe(false);
  });
});

describe("nutrition guidance", () => {
  it("personalizes protein split, goal, activity and hydration", () => {
    const r = calculateNutrition({ ...BASE, goal: "lose_weight", activityLevel: "low" })!;
    const keys = r.guidance.map((g) => g.key);
    expect(keys).toEqual(["proteinPerMeal", "proteinFoods", "goal_lose_weight", "activity_low", "hydration"]);
    const perMeal = r.guidance.find((g) => g.key === "proteinPerMeal")!;
    expect(perMeal.params).toEqual({ grams: Math.round(r.proteinGrams / 3 / 5) * 5, meals: 3 });
    expect(r.guidance.find((g) => g.key === "hydration")!.params).toEqual({ liters: 2.8 });
  });

  it("adds no activity tip for moderate activity", () => {
    const keys = calculateNutrition(BASE)!.guidance.map((g) => g.key);
    expect(keys).not.toContain("activity_low");
    expect(keys).not.toContain("activity_high");
  });
});
