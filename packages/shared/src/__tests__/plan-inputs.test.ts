import { describe, it, expect } from "vitest";
import { applyProfileToPlan, planInputsSignature, type PlanAnswers } from "../plan/plan-inputs";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
} from "../onboarding/onboarding-types";

const base = (): PlanAnswers => ({
  answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", age: 28, heightCm: 150, weightKg: 55, gender: "male" },
  trainingPreferences: {
    ...TRAINING_PREFERENCES_DEFAULT,
    experience: "intermediate",
    daysPerWeek: "3",
    trainingDays: [0, 2, 4],
    durationMin: 45,
    variety: "dynamic",
    excludeMuscles: true,
    excludedMuscles: ["neck"],
    restTimerMinSec: 90,
  },
  gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "garage_gym", equipment: ["dumbbells", "barbell"], addCardio: true, cardioTypes: ["rowing"] },
});

describe("planInputsSignature", () => {
  it("ignores fields that don't change a plan", () => {
    const a = base();
    const b = base();
    b.answers.gender = "female";
    b.answers.activityLevel = "high";
    b.trainingPreferences.variety = "fixed";
    expect(planInputsSignature(b)).toBe(planInputsSignature(a));
  });

  it("changes with any plan-relevant profile input", () => {
    const sig = planInputsSignature(base());
    const mutations: ((p: PlanAnswers) => void)[] = [
      (p) => (p.answers.goal = "lose_weight"),
      (p) => (p.answers.weightKg = 90),
      (p) => (p.trainingPreferences.experience = "advanced"),
      (p) => (p.trainingPreferences.trainingDays = [1, 3, 5]),
      (p) => (p.trainingPreferences.durationMin = 60),
      (p) => (p.gymEquipment.equipment = ["dumbbells"]),
    ];
    for (const m of mutations) {
      const p = base();
      m(p);
      expect(planInputsSignature(p)).not.toBe(sig);
    }
  });

  it("ignores equipment order and a default weekday spread vs the same explicit days", () => {
    const a = base();
    a.trainingPreferences.trainingDays = [];
    const b = base();
    b.gymEquipment.equipment = ["barbell", "dumbbells"];
    expect(planInputsSignature(a)).toBe(planInputsSignature(b));
  });
});

describe("applyProfileToPlan", () => {
  it("takes shared fields from the profile and keeps plan-only settings", () => {
    const plan = base();
    const profile = base();
    profile.answers.weightKg = 80;
    profile.trainingPreferences.experience = "advanced";
    profile.trainingPreferences.daysPerWeek = "4";
    profile.trainingPreferences.trainingDays = [0, 1, 3, 4];
    profile.gymEquipment.equipment = ["dumbbells", "barbell", "bench"];

    const next = applyProfileToPlan(plan, profile);
    expect(next.answers.weightKg).toBe(80);
    expect(next.trainingPreferences).toMatchObject({
      experience: "advanced",
      daysPerWeek: "4",
      trainingDays: [0, 1, 3, 4],
      variety: "dynamic",
      excludedMuscles: ["neck"],
      restTimerMinSec: 90,
    });
    expect(next.gymEquipment.equipment).toEqual(["dumbbells", "barbell", "bench"]);
    expect(next.gymEquipment.cardioTypes).toEqual(["rowing"]);
    // The split is re-derived for the new inputs (advanced, 4 days, build muscle).
    expect(next.trainingPreferences.workoutSplit).toBe("ppl_upper");
  });
});
