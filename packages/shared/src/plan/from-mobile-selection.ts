import type { TrainingFrequency, TrainingGoal, TrainingLocation } from "../enums/training";
import type {
  GymEquipmentAnswers,
  OnboardingAnswers,
  OnboardingCardioType,
  OnboardingDaysPerWeek,
  OnboardingEquipment,
  OnboardingGoal,
  OnboardingGymType,
  TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import { TRAINING_PREFERENCES_DEFAULT } from "../onboarding/onboarding-types";
import type { PlanSelection } from "./plan-types";

/**
 * Turns the mobile chip form into the inputs `generateTrainingPlan` already
 * uses on web. Same chips always produce the same inputs.
 */
export function generatorInputFromMobileSelection(sel: PlanSelection): {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
} {
  const days = DAYS[sel.frequency];
  return {
    answers: {
      goal: GOAL[sel.goal],
      obstacle: null,
      gender: sel.gender,
      birthdate: null,
      age: null,
      unit: "metric",
      heightCm: null,
      weightKg: null,
      activityLevel: null,
      primaryActivity: null,
    },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: sel.level,
      daysPerWeek: days.daysPerWeek,
      trainingDays: [...days.trainingDays],
      variety: "balanced",
      durationMin: 45,
    },
    gymEquipment: GYM[sel.location],
  };
}

const GOAL: Record<TrainingGoal, OnboardingGoal> = {
  muscle_gain: "build_muscle",
  fat_loss: "lose_weight",
  functional: "functional",
  general_fitness: "stay_healthy",
};

const DAYS: Record<TrainingFrequency, { daysPerWeek: OnboardingDaysPerWeek; trainingDays: number[] }> = {
  every_day: { daysPerWeek: "every_day", trainingDays: [0, 1, 2, 3, 4, 5, 6] },
  every_2_days: { daysPerWeek: "4", trainingDays: [0, 2, 4, 6] },
  "3x": { daysPerWeek: "3", trainingDays: [0, 2, 4] },
  "2x": { daysPerWeek: "2", trainingDays: [1, 4] },
  "1x": { daysPerWeek: "1", trainingDays: [2] },
};

const HOME: OnboardingEquipment[] = ["dumbbells", "resistance_bands", "bench", "chair", "towel", "doorway"];
const GYM_KIT: OnboardingEquipment[] = [
  "dumbbells",
  "barbell",
  "plates",
  "bench",
  "squat_rack",
  "pull_up_bar",
  "cable_machine",
  "lat_pulldown",
  "leg_press",
  "chair",
  "doorway",
];
const BODYWEIGHT: OnboardingEquipment[] = ["chair", "towel", "doorway"];

function gym(
  gymType: OnboardingGymType,
  equipment: OnboardingEquipment[],
  cardioTypes: OnboardingCardioType[],
): GymEquipmentAnswers {
  return {
    gymType,
    equipment,
    addCardio: cardioTypes.length > 0,
    cardioPlacement: "end",
    cardioTypes,
  };
}

const GYM: Record<TrainingLocation, GymEquipmentAnswers> = {
  gym: gym("large_gym", GYM_KIT, ["treadmill", "elliptical", "stair_climber"]),
  home: gym("garage_gym", HOME, []),
  bodyweight: gym("bodyweight_only", BODYWEIGHT, []),
  outdoor: gym("bodyweight_only", BODYWEIGHT, ["jump_rope", "cycling"]),
};
