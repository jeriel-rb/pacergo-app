import {
  planExperience,
  resolveTrainingDays,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import { recommendSplit } from "./split-recommendation";

/** The three answer slices a plan is generated from. */
export interface PlanAnswers {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
}

/**
 * A stable fingerprint of everything the *Shared Fitness Profile* contributes
 * to generating a training plan: goal, obstacle, age and BMI inputs (low-impact
 * mode), experience, training days, session length, gym type and the exact
 * equipment list. Two plans with the same fingerprint would be generated
 * identically as far as the profile goes. Fields that don't change a plan
 * (gender, activity level, nutrition) are deliberately left out.
 */
export function planInputsSignature(input: PlanAnswers): string {
  const { answers, trainingPreferences: tp, gymEquipment: ge } = input;
  return JSON.stringify({
    goal: answers.goal,
    obstacle: answers.obstacle,
    age: answers.age,
    heightCm: answers.heightCm,
    weightKg: answers.weightKg,
    experience: planExperience(tp.experience),
    daysPerWeek: tp.daysPerWeek,
    trainingDays: tp.daysPerWeek ? resolveTrainingDays(tp.daysPerWeek, tp.trainingDays) : [],
    durationMin: tp.durationMin,
    gymType: ge.gymType,
    equipment: [...ge.equipment].sort(),
  });
}

/**
 * A saved plan's answers, brought up to date with the Fitness Profile: the
 * profile's body stats and goal, experience, training days, session length and
 * equipment replace the plan's copies, while plan-only settings (muscle focus,
 * variety, rest timer, cardio) stay as the plan had them. The weekly split is
 * re-derived, since it follows from the inputs that just changed.
 */
export function applyProfileToPlan(plan: PlanAnswers, profile: PlanAnswers): PlanAnswers {
  const trainingPreferences: TrainingPreferencesAnswers = {
    ...plan.trainingPreferences,
    experience: profile.trainingPreferences.experience,
    daysPerWeek: profile.trainingPreferences.daysPerWeek,
    trainingDays: profile.trainingPreferences.trainingDays,
    durationMin: profile.trainingPreferences.durationMin,
  };
  const gymEquipment: GymEquipmentAnswers = {
    ...plan.gymEquipment,
    gymType: profile.gymEquipment.gymType,
    equipment: [...profile.gymEquipment.equipment],
  };
  const answers: OnboardingAnswers = { ...profile.answers };
  trainingPreferences.workoutSplit = recommendSplit({ answers, trainingPreferences, gymEquipment }).split;
  return { answers, trainingPreferences, gymEquipment };
}
