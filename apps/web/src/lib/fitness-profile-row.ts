import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  upgradeLegacyEquipment,
  type GymEquipmentAnswers,
  type NutritionTargets,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";

/** The signed-in user's Shared Fitness Profile (`user_onboarding` row) plus
 *  the nutrition targets last saved with it. AI Training and AI Nutrition
 *  both read this one row; neither keeps its own copy. */
export interface SavedFitnessProfile {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  nutrition: NutritionTargets | null;
  /** null = the nutrition plan was never built or skipped. A result is only
   *  saved (and kept current) once it's "built". */
  nutritionStatus: NutritionStatus | null;
  /** null when the user has no saved profile yet. */
  updatedAt: string | null;
}

export type NutritionStatus = "built" | "skipped";

export const FITNESS_PROFILE_COLUMNS =
  "about_you, training_preferences, gym_equipment, nutrition, nutrition_status, updated_at";

interface FitnessProfileRow {
  about_you: Partial<OnboardingAnswers> | null;
  training_preferences: Partial<TrainingPreferencesAnswers> | null;
  gym_equipment: Partial<GymEquipmentAnswers> | null;
  nutrition: NutritionTargets | null;
  nutrition_status: NutritionStatus | null;
  updated_at: string | null;
}

/** Each slice is merged onto its defaults, so rows saved before a field
 *  existed (e.g. `activityLevel`, `trainingDays`) still type-check — and a
 *  user with no row yet gets all defaults. */
export function parseFitnessProfileRow(data: unknown): SavedFitnessProfile {
  const row = (data ?? null) as FitnessProfileRow | null;
  return {
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, ...row?.about_you },
    trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, ...row?.training_preferences },
    gymEquipment: upgradeLegacyEquipment({ ...GYM_EQUIPMENT_DEFAULT, ...row?.gym_equipment }),
    nutrition: row?.nutrition ?? null,
    nutritionStatus: row?.nutrition_status ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}
