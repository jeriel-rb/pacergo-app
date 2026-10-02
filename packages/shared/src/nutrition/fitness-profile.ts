import { PLAN_GENDERS, type Gender, type PlanGender } from "../enums/gender";
import type { PrimaryActivity } from "../enums/profile-setup";
import {
  resolveTrainingDays,
  trainingDaysComplete,
  trainingDaysCount,
  type ActivityLevel,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingEquipment,
  type OnboardingExperience,
  type OnboardingGoal,
  type OnboardingGymType,
  type OnboardingStepId,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";

/** The Shared Fitness Profile: the one account-level set of body, lifestyle
 *  and training facts that every personalized feature (AI Training, AI
 *  Nutrition) reads from. Stored once per user as the `user_onboarding` row
 *  (about_you / training_preferences / gym_equipment); this is the flat,
 *  typed view of it so consumers don't each dig through the wizard's three
 *  answer slices — and so no feature keeps its own copy. */
export interface FitnessProfile {
  gender: Gender | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: OnboardingGoal | null;
  /** What the user mainly trains (Home Profile Setup). */
  primaryActivity: PrimaryActivity | null;
  experience: OnboardingExperience | null;
  /** Planned training sessions per week (2–7). */
  trainingDaysPerWeek: number | null;
  /** Weekdays trained on (0 = Monday .. 6 = Sunday). */
  trainingDays: number[];
  sessionDurationMin: number | null;
  gymType: OnboardingGymType | null;
  /** The exact equipment the user selected — AI Training only picks
   *  exercises this list (or no equipment) can cover. */
  equipment: OnboardingEquipment[];
}

export function toFitnessProfile(
  answers: OnboardingAnswers,
  trainingPreferences: TrainingPreferencesAnswers,
  gymEquipment: Pick<GymEquipmentAnswers, "gymType" | "equipment">,
): FitnessProfile {
  const { daysPerWeek } = trainingPreferences;
  return {
    gender: answers.gender,
    age: answers.age,
    heightCm: answers.heightCm,
    weightKg: answers.weightKg,
    activityLevel: answers.activityLevel ?? null,
    goal: answers.goal,
    primaryActivity: answers.primaryActivity ?? null,
    experience: trainingPreferences.experience,
    trainingDaysPerWeek: daysPerWeek ? trainingDaysCount(daysPerWeek) : null,
    trainingDays: daysPerWeek ? resolveTrainingDays(daysPerWeek, trainingPreferences.trainingDays) : [],
    sessionDurationMin: trainingPreferences.durationMin,
    gymType: gymEquipment.gymType,
    equipment: [...gymEquipment.equipment],
  };
}

/** AI Training and Nutrition ask for male/female; "other" (a profile-settings
 *  choice) doesn't count as an answer to that question. */
export function isPlanGender(gender: Gender | null | undefined): gender is PlanGender {
  return PLAN_GENDERS.includes(gender as PlanGender);
}

/** Which onboarding sections the saved profile already fully answers — those
 *  are shown as done instead of being asked again. */
export function profileStepCompletion(
  answers: OnboardingAnswers,
  trainingPreferences: TrainingPreferencesAnswers,
  gymEquipment: GymEquipmentAnswers,
): Record<OnboardingStepId, boolean> {
  const tp = trainingPreferences;
  return {
    aboutYou: Boolean(
      isPlanGender(answers.gender) &&
        answers.goal &&
        answers.obstacle &&
        answers.age &&
        answers.heightCm &&
        answers.weightKg &&
        answers.activityLevel,
    ),
    trainingPreferences: Boolean(
      tp.experience &&
        trainingDaysComplete(tp.daysPerWeek, tp.trainingDays) &&
        tp.excludeMuscles !== null &&
        tp.prioritizeMuscles !== null &&
        tp.variety &&
        tp.durationMin,
    ),
    gymEquipment: Boolean(gymEquipment.gymType && gymEquipment.addCardio !== null),
  };
}
