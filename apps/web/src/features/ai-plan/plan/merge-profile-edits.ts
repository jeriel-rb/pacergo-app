import type {
  GymEquipmentAnswers,
  OnboardingAnswers,
  TrainingPreferencesAnswers,
} from "@pacergo/shared";
import type { PlanOnboardingSnapshot } from "@/lib/plans";

type CopiedPreferenceKey = Exclude<keyof TrainingPreferencesAnswers, "workoutSplit">;

/** Preference fields a plan edit may copy onto the shared profile. The split is
 *  derived, so it is not one of them. */
const PREFERENCE_KEYS = [
  "experience",
  "daysPerWeek",
  "trainingDays",
  "excludeMuscles",
  "excludedMuscles",
  "prioritizeMuscles",
  "prioritizedMuscles",
  "variety",
  "durationMin",
  "restTimerEnabled",
  "restTimerMinSec",
  "restTimerMaxSec",
  "restTimerSound",
] as const satisfies readonly CopiedPreferenceKey[];

type _MissingPreference = _AssertNever<Exclude<CopiedPreferenceKey, (typeof PREFERENCE_KEYS)[number]>>;

const GYM_KEYS = [
  "gymType",
  "equipment",
  "addCardio",
  "cardioPlacement",
  "cardioTypes",
] as const satisfies readonly (keyof GymEquipmentAnswers)[];

type _MissingGym = _AssertNever<Exclude<keyof GymEquipmentAnswers, (typeof GYM_KEYS)[number]>>;

/** Cardio rotates in list order. The other lists are sets. */
const ORDERED_KEYS = new Set<string>(["cardioTypes"]);

type _AssertNever<T extends never> = T;

function sameMembers(a: readonly (string | number)[], b: readonly (string | number)[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  const right = [...b].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  return left.every((item, i) => Object.is(item, right[i]));
}

function same<T>(a: T, b: T, ordered: boolean): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (ordered) return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    return sameMembers(a, b);
  }
  return Object.is(a, b);
}

function withChanges<T extends object, K extends keyof T>(base: T, edited: T, opened: T, keys: readonly K[]): T | null {
  let changed = false;
  const next = { ...base };
  for (const key of keys) {
    if (same(edited[key], opened[key], ORDERED_KEYS.has(String(key)))) continue;
    next[key] = edited[key];
    changed = true;
  }
  return changed ? next : null;
}

/** The shared profile after a plan edit. Only fields the user changed on this
 *  screen are copied, on top of the profile as it is now. Returns null when
 *  nothing that belongs on the profile changed. */
export function profileAfterPlanEdit(input: {
  current: PlanOnboardingSnapshot;
  edited: PlanOnboardingSnapshot;
  openedGoal: OnboardingAnswers["goal"];
  openedPreferences: TrainingPreferencesAnswers;
  openedGym: GymEquipmentAnswers;
}): PlanOnboardingSnapshot | null {
  const trainingPreferences = withChanges(
    input.current.trainingPreferences,
    input.edited.trainingPreferences,
    input.openedPreferences,
    PREFERENCE_KEYS,
  );
  const gymEquipment = withChanges(
    input.current.gymEquipment,
    input.edited.gymEquipment,
    input.openedGym,
    GYM_KEYS,
  );
  const goalChanged = !same(input.edited.answers.goal, input.openedGoal, false);
  if (!trainingPreferences && !gymEquipment && !goalChanged) return null;
  return {
    answers: goalChanged ? { ...input.current.answers, goal: input.edited.answers.goal } : input.current.answers,
    trainingPreferences: trainingPreferences ?? input.current.trainingPreferences,
    gymEquipment: gymEquipment ?? input.current.gymEquipment,
  };
}
