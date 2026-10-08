import type { PlanGender } from "../enums/gender";
import type {
  ActivityLevel,
  OnboardingExperience,
  OnboardingGoal,
} from "../onboarding/onboarding-types";

/** Every tunable number the nutrition calculator uses, in one place. The
 *  calculator takes these as a parameter rather than reading constants, so
 *  the rules can be swapped (or later loaded from config) without touching
 *  the math. */
export interface NutritionRules {
  /** Stamped onto every saved result. Bump on any change below so results
   *  saved under older rules are recalculated (see `nutritionNeedsRecalc`). */
  version: number;
  /** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + sexOffset. */
  bmr: {
    weightCoef: number;
    heightCoef: number;
    ageCoef: number;
    sexOffset: Record<PlanGender, number>;
  };
  /** Daily-life (non-exercise) activity multiplier on BMR. */
  activityFactor: Record<ActivityLevel, number>;
  /** Added to the activity multiplier per planned training session/week. */
  trainingFactorPerSession: number;
  /** Multiplier on maintenance calories to move toward the goal. */
  goalCalorieFactor: Record<OnboardingGoal, number>;
  /** Never recommend fewer calories than this (unless maintenance is lower). */
  minCalories: Record<PlanGender, number>;
  /** Protein, g per kg of current body weight, by goal × experience. */
  proteinGPerKg: Record<OnboardingGoal, Record<OnboardingExperience, number>>;
  /** Extra protein for high training volume. */
  proteinTrainingBonus: { minSessionsPerWeek: number; gPerKg: number };
  proteinGPerKgMax: number;
  /** Meals the daily protein is split across in the guidance. */
  mealsPerDay: number;
  /** Daily water guidance, ml per kg of body weight. */
  waterMlPerKg: number;
}

/** PROVISIONAL — placeholder values pending the finalized calculation rules
 *  (product owner sign-off). The protein multipliers are drawn from the
 *  1.0 / 1.6 / 2.2 / 3.0 g/kg reference points; treat all of these as
 *  references, not settled policy. Change them here only, and bump
 *  `version` when you do. */
export const DEFAULT_NUTRITION_RULES: NutritionRules = {
  // v2: protein is always the formula — the user-set target was removed, so
  // bumping recalculates (and drops) any target a user saved under v1.
  version: 2,
  bmr: {
    weightCoef: 10,
    heightCoef: 6.25,
    ageCoef: 5,
    sexOffset: { male: 5, female: -161 },
  },
  activityFactor: { low: 1.2, moderate: 1.375, high: 1.55 },
  trainingFactorPerSession: 0.025,
  goalCalorieFactor: { lose_weight: 0.8, build_muscle: 1.1, stay_healthy: 1, functional: 1.05 },
  minCalories: { male: 1500, female: 1200 },
  proteinGPerKg: {
    stay_healthy: { no_experience: 1.0, beginner: 1.2, intermediate: 1.4, advanced: 1.6 },
    build_muscle: { no_experience: 1.6, beginner: 1.6, intermediate: 1.8, advanced: 2.2 },
    lose_weight: { no_experience: 1.6, beginner: 1.8, intermediate: 2.0, advanced: 2.2 },
    functional: { no_experience: 1.4, beginner: 1.6, intermediate: 1.8, advanced: 2.0 },
  },
  proteinTrainingBonus: { minSessionsPerWeek: 5, gPerKg: 0.2 },
  proteinGPerKgMax: 3.0,
  mealsPerDay: 3,
  waterMlPerKg: 35,
};
