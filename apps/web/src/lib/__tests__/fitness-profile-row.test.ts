import { describe, it, expect } from "vitest";
import { calculateNutrition, TRAINING_PREFERENCES_DEFAULT } from "@pacergo/shared";
import { parseFitnessProfileRow } from "../fitness-profile-row";

const nutrition = calculateNutrition({
  gender: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderate",
  goal: "stay_healthy",
  experience: "intermediate",
  trainingDaysPerWeek: 4,
});

describe("parseFitnessProfileRow", () => {
  it("gives all defaults when the user has no row", () => {
    for (const empty of [null, undefined]) {
      const p = parseFitnessProfileRow(empty);
      expect(p.answers.age).toBeNull();
      expect(p.nutrition).toBeNull();
      expect(p.nutritionStatus).toBeNull();
      expect(p.updatedAt).toBeNull();
    }
  });

  it("keeps valid saved values", () => {
    const p = parseFitnessProfileRow({
      about_you: { age: 30, heightCm: 180, weightKg: 80, goal: "build_muscle" },
      training_preferences: { daysPerWeek: "4", durationMin: 60, restTimerMinSec: 45, restTimerMaxSec: 120 },
      gym_equipment: {},
      nutrition: JSON.parse(JSON.stringify(nutrition)),
      nutrition_status: "built",
      updated_at: "2026-10-05T00:00:00Z",
    });
    expect(p.answers).toMatchObject({ age: 30, heightCm: 180, weightKg: 80, goal: "build_muscle" });
    expect(p.trainingPreferences).toMatchObject({ daysPerWeek: "4", durationMin: 60, restTimerMinSec: 45, restTimerMaxSec: 120 });
    expect(p.nutrition).toEqual(nutrition);
    expect(p.nutritionStatus).toBe("built");
  });

  it("drops tampered or corrupt values instead of trusting them", () => {
    const p = parseFitnessProfileRow({
      about_you: { age: 9999, heightCm: -10, weightKg: "heavy" },
      training_preferences: { daysPerWeek: "banana", durationMin: 1e6, restTimerMinSec: 999, restTimerMaxSec: 1, trainingDays: "x" },
      nutrition: { ...nutrition, dailyCalories: -5 },
      nutrition_status: "built",
    });
    expect(p.answers.age).toBeNull();
    expect(p.answers.heightCm).toBeNull();
    expect(p.answers.weightKg).toBeNull();
    expect(p.trainingPreferences.daysPerWeek).toBeNull();
    expect(p.trainingPreferences.durationMin).toBeNull();
    expect(p.trainingPreferences.trainingDays).toEqual([]);
    expect(p.trainingPreferences.restTimerMinSec).toBe(TRAINING_PREFERENCES_DEFAULT.restTimerMinSec);
    expect(p.trainingPreferences.restTimerMaxSec).toBe(TRAINING_PREFERENCES_DEFAULT.restTimerMaxSec);
    expect(p.nutrition).toBeNull();
  });
});
