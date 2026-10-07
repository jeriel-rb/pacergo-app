import type { PrimaryActivity } from '../enums/profile-setup';

/** "About You" onboarding wizard (Let's Get Started → About You) inputs.
 *  Distinct from ../enums/training.ts's TrainingGoal (spec A-1, tied to the
 *  existing plan-composer's authored content) — this is a different,
 *  richer question set feeding a not-yet-built onboarding flow. */

export type OnboardingGoal = "lose_weight" | "build_muscle" | "stay_healthy";

export const ONBOARDING_GOALS: readonly OnboardingGoal[] = [
  "lose_weight",
  "build_muscle",
  "stay_healthy",
] as const;

export type OnboardingObstacle =
  | "lack_of_time"
  | "lack_of_knowledge"
  | "low_motivation"
  | "injuries"
  | "lack_of_equipment"
  | "never_tried";

export const ONBOARDING_OBSTACLES: readonly OnboardingObstacle[] = [
  "lack_of_time",
  "lack_of_knowledge",
  "low_motivation",
  "injuries",
  "lack_of_equipment",
  "never_tried",
] as const;

export type OnboardingUseCase =
  | "log_weights_reps"
  | "personalized_plan"
  | "progressive_overload"
  | "manage_plan_workouts"
  | "exercise_demos"
  | "muscle_recovery";

export type OnboardingUnit = "imperial" | "metric";

/** General day-to-day activity outside of planned workouts (NEAT), bucketed
 *  by typical daily step count — see ACTIVITY_LEVEL_STEPS. One input to the
 *  nutrition calculator's energy-expenditure estimate. */
export type ActivityLevel = "low" | "moderate" | "high";

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = ["low", "moderate", "high"] as const;

/** Approximate daily step range each activity level stands for — shown to the
 *  user so the options are self-explanatory (`null` = open-ended). */
export const ACTIVITY_LEVEL_STEPS: Record<ActivityLevel, { min: number | null; max: number | null }> = {
  low: { min: null, max: 5000 },
  moderate: { min: 5000, max: 15000 },
  high: { min: 15000, max: null },
};

/** Everything collected across the "About You" sub-steps. Height/weight are
 *  always stored in metric; `unit` only controls which wheels are shown. */
export interface OnboardingAnswers {
  goal: OnboardingGoal | null;
  obstacle: OnboardingObstacle | null;
  useCases: OnboardingUseCase[];
  gender: "male" | "female" | "other" | null;
  age: number | null;
  unit: OnboardingUnit;
  heightCm: number | null;
  weightKg: number | null;
  /** Absent on drafts/rows saved before the activity-level step existed. */
  activityLevel: ActivityLevel | null;
  /** What the user mainly trains (asked once, by the Home Profile Setup). */
  primaryActivity: PrimaryActivity | null;
}

export const ONBOARDING_ANSWERS_DEFAULT: OnboardingAnswers = {
  goal: null,
  obstacle: null,
  useCases: [],
  gender: null,
  age: null,
  unit: "metric",
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  primaryActivity: null,
};

export type OnboardingStepId = "aboutYou" | "trainingPreferences" | "gymEquipment";

export const ONBOARDING_STEPS: readonly OnboardingStepId[] = [
  "aboutYou",
  "trainingPreferences",
  "gymEquipment",
] as const;

/** "Training Preferences" (hub step 2) inputs. Distinct from
 *  ../enums/experience.ts's ExperienceLevel (tied to the old plan-composer's
 *  3-value content) — this screen has a 4th "no experience" option. */

export type OnboardingExperience =
  | "no_experience"
  | "beginner"
  | "intermediate"
  | "advanced";

export const ONBOARDING_EXPERIENCES: readonly OnboardingExperience[] = [
  "no_experience",
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type OnboardingDaysPerWeek = "2" | "3" | "4" | "5" | "6" | "every_day";

export const ONBOARDING_DAYS_PER_WEEK: readonly OnboardingDaysPerWeek[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "every_day",
] as const;

/** Statically flagged as "Recommended" on the days-per-week screen (matches
 *  the reference UI) — not dynamically computed from other answers yet. */
export const ONBOARDING_DAYS_RECOMMENDED: readonly OnboardingDaysPerWeek[] = [
  "3",
  "4",
] as const;

/** Weekdays training falls on when the user hasn't picked specific days
 *  (0 = Monday .. 6 = Sunday) — spread out to leave recovery days between. */
const DEFAULT_TRAINING_DAYS: Record<OnboardingDaysPerWeek, readonly number[]> = {
  every_day: [0, 1, 2, 3, 4, 5, 6],
  "6": [0, 1, 2, 3, 4, 5],
  "5": [0, 1, 2, 3, 4],
  "4": [0, 1, 3, 4],
  "3": [0, 2, 4],
  "2": [1, 3],
};

export function trainingDaysCount(daysPerWeek: OnboardingDaysPerWeek): number {
  return DEFAULT_TRAINING_DAYS[daysPerWeek].length;
}

export function defaultTrainingDays(daysPerWeek: OnboardingDaysPerWeek): number[] {
  return [...DEFAULT_TRAINING_DAYS[daysPerWeek]];
}

/** The user picked exactly as many weekdays as their weekly frequency (every
 *  weekday is implied for "every day"). */
export function trainingDaysComplete(
  daysPerWeek: OnboardingDaysPerWeek | null,
  trainingDays: readonly number[] | undefined,
): boolean {
  if (!daysPerWeek) return false;
  const count = trainingDaysCount(daysPerWeek);
  return count === 7 || new Set(trainingDays ?? []).size === count;
}

/** The weekdays to train on: the user's own pick when it's valid for the
 *  chosen frequency, otherwise the default spread. Sorted, Monday first. */
export function resolveTrainingDays(
  daysPerWeek: OnboardingDaysPerWeek,
  trainingDays: readonly number[] | undefined,
): number[] {
  const picked = [...new Set(trainingDays ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return picked.length === trainingDaysCount(daysPerWeek)
    ? picked.sort((a, b) => a - b)
    : defaultTrainingDays(daysPerWeek);
}

/** Weekly training structures the AI recommendation chooses from (one
 *  personalized pick per user — see recommendSplit). */
export type TrainingSplit =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "ppl_upper"
  | "ppl_upper_lower";

/** What's stored on the answers: a TrainingSplit, or a value from the retired
 *  three-option picker on plans saved before it ("ai_custom" means "let the
 *  recommendation decide"). */
export type OnboardingWorkoutSplit =
  | TrainingSplit
  | "ai_custom"
  | "ppl_full_body"
  | "ppl_upper_body";

export type OnboardingVariety = "fixed" | "balanced" | "dynamic";

export const ONBOARDING_VARIETIES: readonly OnboardingVariety[] = [
  "fixed",
  "balanced",
  "dynamic",
] as const;

export const ONBOARDING_DURATION_MIN = 15;
export const ONBOARDING_DURATION_MAX = 90;
export const ONBOARDING_DURATION_STEP = 5;
export const ONBOARDING_DURATION_DEFAULT = 45;

/** Bounds of the rest-timer duration range slider (seconds), and the range we
 *  recommend to most people. The chosen min/max clamp the rest shown for each
 *  main-lift set (see generateTrainingPlan) (the in-workout countdown will use the same range). */
export const REST_TIMER_MIN_SEC = 10;
export const REST_TIMER_MAX_SEC = 300;
export const REST_TIMER_STEP_SEC = 5;
export const REST_TIMER_RECOMMENDED_SEC = { min: 60, max: 180 } as const;

/** Rest-timer presets between main-lift sets — not collected anywhere in the
 *  onboarding wizard itself (only editable later from a saved plan's
 *  "Customize Plan" screen), so every plan starts on the "medium" default. */
export type OnboardingRestTimerPreset = "short" | "medium" | "long";

export const ONBOARDING_REST_TIMER_PRESETS: Record<
  OnboardingRestTimerPreset,
  { minSec: number; maxSec: number }
> = {
  short: { minSec: 30, maxSec: 60 },
  medium: { minSec: 60, maxSec: 180 },
  long: { minSec: 120, maxSec: 300 },
};

/** Every selectable muscle group in the "Focused"/"Excluded" muscle pickers.
 *  Filenames under `apps/web/public/images/focused_muscles/` are the source of
 *  truth for labels — keep this list aligned with verified assets. */
export type OnboardingMuscleGroup =
  | "abs"
  | "trapezius"
  | "front_deltoid"
  | "calves"
  | "shins"
  | "middle_chest"
  | "forearms"
  | "biceps"
  | "triceps"
  | "hip_flexors"
  | "quadriceps"
  | "lower_back"
  | "obliques"
  | "upper_chest"
  | "lats"
  | "hamstrings"
  | "lower_chest"
  | "lower_abs"
  | "adductors"
  | "rear_deltoid"
  | "middle_deltoid"
  | "upper_back"
  | "abductors"
  | "glutes"
  | "neck";

export const ONBOARDING_MUSCLE_GROUPS: readonly OnboardingMuscleGroup[] = [
  "abs",
  "trapezius",
  "front_deltoid",
  "calves",
  "shins",
  "middle_chest",
  "forearms",
  "biceps",
  "triceps",
  "hip_flexors",
  "quadriceps",
  "lower_back",
  "obliques",
  "upper_chest",
  "lats",
  "hamstrings",
  "lower_chest",
  "lower_abs",
  "adductors",
  "rear_deltoid",
  "middle_deltoid",
  "upper_back",
  "abductors",
  "glutes",
  "neck",
] as const;

export const ONBOARDING_EXCLUDED_MUSCLES_MAX = 4;
export const ONBOARDING_PRIORITIZED_MUSCLES_MAX = 3;

/** Everything collected across the "Training Preferences" sub-steps. */
export interface TrainingPreferencesAnswers {
  experience: OnboardingExperience | null;
  daysPerWeek: OnboardingDaysPerWeek | null;
  /** The specific weekdays chosen (0 = Monday .. 6 = Sunday). Empty, or a
   *  count that doesn't match `daysPerWeek`, means "use the default spread"
   *  — see resolveTrainingDays. */
  trainingDays: number[];
  excludeMuscles: boolean | null;
  excludedMuscles: OnboardingMuscleGroup[];
  prioritizeMuscles: boolean | null;
  prioritizedMuscles: OnboardingMuscleGroup[];
  workoutSplit: OnboardingWorkoutSplit | null;
  variety: OnboardingVariety | null;
  durationMin: number | null;
  restTimerEnabled: boolean;
  restTimerMinSec: number;
  restTimerMaxSec: number;
  /** Beep when a rest countdown finishes. */
  restTimerSound: boolean;
}

export const TRAINING_PREFERENCES_DEFAULT: TrainingPreferencesAnswers = {
  experience: null,
  daysPerWeek: null,
  trainingDays: [],
  excludeMuscles: null,
  excludedMuscles: [],
  prioritizeMuscles: null,
  prioritizedMuscles: [],
  workoutSplit: null,
  variety: null,
  durationMin: null,
  restTimerEnabled: true,
  restTimerMinSec: ONBOARDING_REST_TIMER_PRESETS.medium.minSec,
  restTimerMaxSec: ONBOARDING_REST_TIMER_PRESETS.medium.maxSec,
  restTimerSound: true,
};

/** "Gym & Equipment" (hub step 3) inputs. */

export type OnboardingGymType =
  | "large_gym"
  | "small_gym"
  | "garage_gym"
  | "bodyweight_only";

export const ONBOARDING_GYM_TYPES: readonly OnboardingGymType[] = [
  "large_gym",
  "small_gym",
  "garage_gym",
  "bodyweight_only",
] as const;

export type OnboardingEquipment =
  | "dumbbells"
  | "barbell"
  | "plates"
  | "kettlebell"
  | "ez_bar"
  | "trap_bar"
  | "landmine"
  | "bench"
  | "squat_rack"
  | "pull_up_bar"
  | "dip_station"
  | "back_extension_bench"
  | "preacher_bench"
  | "cable_machine"
  | "lat_pulldown"
  | "smith_machine"
  | "chest_press_machine"
  | "pec_deck"
  | "shoulder_press_machine"
  | "lateral_raise_machine"
  | "row_machine"
  | "chest_supported_row_machine"
  | "leg_press"
  | "leg_extension_machine"
  | "leg_curl_machine"
  | "lying_leg_curl_machine"
  | "hack_squat_machine"
  | "calf_machine"
  | "hip_machine"
  | "assisted_machine"
  | "resistance_bands"
  | "stability_ball"
  | "ab_wheel"
  | "chair"
  | "towel"
  | "doorway"
  | "step_box";

/** Display order/grouping lives in `equipment-catalog.ts`; this is just the
 *  full set (also the default selection — every item starts checked). */
export const ONBOARDING_EQUIPMENT: readonly OnboardingEquipment[] = [
  "dumbbells",
  "barbell",
  "plates",
  "kettlebell",
  "ez_bar",
  "trap_bar",
  "landmine",
  "bench",
  "squat_rack",
  "pull_up_bar",
  "dip_station",
  "back_extension_bench",
  "preacher_bench",
  "cable_machine",
  "lat_pulldown",
  "smith_machine",
  "chest_press_machine",
  "pec_deck",
  "shoulder_press_machine",
  "lateral_raise_machine",
  "row_machine",
  "chest_supported_row_machine",
  "leg_press",
  "leg_extension_machine",
  "leg_curl_machine",
  "lying_leg_curl_machine",
  "hack_squat_machine",
  "calf_machine",
  "hip_machine",
  "assisted_machine",
  "resistance_bands",
  "stability_ball",
  "ab_wheel",
  "chair",
  "towel",
  "doorway",
  "step_box",
] as const;

export type OnboardingCardioPlacement = "start" | "end";

export type OnboardingCardioType =
  | "treadmill"
  | "stair_climber"
  | "elliptical"
  | "rowing"
  | "cycling_stationary"
  | "air_bike"
  | "ski_erg"
  | "battle_ropes"
  | "cycling"
  | "jump_rope";

export const ONBOARDING_CARDIO_TYPES: readonly OnboardingCardioType[] = [
  "treadmill",
  "stair_climber",
  "elliptical",
  "rowing",
  "cycling_stationary",
  "air_bike",
  "ski_erg",
  "battle_ropes",
  "cycling",
  "jump_rope",
] as const;

/** Everything collected across the "Gym & Equipment" sub-steps.
 *  `equipment` starts with every item checked (matches the reference UI's
 *  default state); `cardioPlacement` defaults to "end" for the same reason. */
export interface GymEquipmentAnswers {
  gymType: OnboardingGymType | null;
  equipment: OnboardingEquipment[];
  addCardio: boolean | null;
  cardioPlacement: OnboardingCardioPlacement;
  cardioTypes: OnboardingCardioType[];
}

export const GYM_EQUIPMENT_DEFAULT: GymEquipmentAnswers = {
  gymType: null,
  equipment: [...ONBOARDING_EQUIPMENT],
  addCardio: null,
  cardioPlacement: "end",
  cardioTypes: [],
};
