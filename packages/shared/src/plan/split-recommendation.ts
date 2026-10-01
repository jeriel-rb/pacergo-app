import {
  ONBOARDING_DURATION_DEFAULT,
  resolveTrainingDays,
  trainingDaysCount,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingEquipment,
  type OnboardingExperience,
  type OnboardingGoal,
  type TrainingPreferencesAnswers,
  type TrainingSplit,
} from "../onboarding/onboarding-types";

/** Equipment that lets a session load a muscle properly. With less than two
 *  of these, splits that dedicate whole days to a few muscles run short of
 *  meaningful exercises, so full-body / upper-lower structures are used. */
const LOADING_EQUIPMENT: ReadonlySet<OnboardingEquipment> = new Set<OnboardingEquipment>([
  "dumbbells",
  "barbell",
  "kettlebell",
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
]);

/** The inputs behind a recommendation, returned so the UI can explain it. */
export interface SplitRecommendation {
  split: TrainingSplit;
  daysPerWeek: number;
  experience: OnboardingExperience;
  goal: OnboardingGoal | null;
  /** 3+ training days in a row (Sunday wraps to Monday). */
  consecutiveDays: boolean;
  limitedEquipment: boolean;
  /** Sessions of 30 minutes or less. */
  shortSessions: boolean;
}

/** Longest run of back-to-back training days, wrapping Sunday → Monday. */
export function longestConsecutiveRun(days: readonly number[]): number {
  const set = new Set(days);
  if (set.size >= 7) return 7;
  let best = 0;
  for (const start of set) {
    if (set.has((start + 6) % 7)) continue; // not the start of a run
    let len = 1;
    while (set.has((start + len) % 7)) len++;
    best = Math.max(best, len);
  }
  return best;
}

/**
 * One recommended weekly structure for this user — the MVP replacement for
 * offering three fixed template splits. Deterministic.
 *
 * - Frequency sets the frame: 2 days → full body; 3 → full body, or PPL for
 *   trained muscle-builders; 4 → upper/lower, or PPL + upper for advanced
 *   muscle-builders; 5 → PPL + upper/lower; 6–7 → PPL twice.
 * - Beginners stay on full-body / upper-lower (higher per-muscle frequency,
 *   simpler sessions) at any frequency.
 * - Fat loss keeps 3-day weeks full-body (more total work per session).
 * - Selected days: 3+ consecutive days rule out repeating full-body sessions
 *   back to back — the same muscles need recovery.
 * - Limited equipment or ≤30-minute sessions avoid body-part splits that need
 *   many distinct exercises per muscle group.
 */
export function recommendSplit(input: {
  answers: Pick<OnboardingAnswers, "goal">;
  trainingPreferences: Pick<TrainingPreferencesAnswers, "experience" | "daysPerWeek" | "trainingDays" | "durationMin">;
  gymEquipment: Pick<GymEquipmentAnswers, "gymType" | "equipment">;
}): SplitRecommendation {
  const { answers, trainingPreferences: tp, gymEquipment } = input;
  const daysPerWeek = tp.daysPerWeek ?? "3";
  const n = trainingDaysCount(daysPerWeek);
  const experience = tp.experience ?? "beginner";
  const goal = answers.goal;
  const consecutiveDays = longestConsecutiveRun(resolveTrainingDays(daysPerWeek, tp.trainingDays)) >= 3;
  const loading = gymEquipment.equipment.filter((e) => LOADING_EQUIPMENT.has(e)).length;
  const limitedEquipment = gymEquipment.gymType === "bodyweight_only" || loading < 2;
  const shortSessions = (tp.durationMin ?? ONBOARDING_DURATION_DEFAULT) <= 30;

  const novice = experience === "no_experience" || experience === "beginner";
  const simple = novice || limitedEquipment || shortSessions;
  const muscleFocus = goal === "build_muscle";

  let split: TrainingSplit;
  if (n <= 2) {
    split = "full_body";
  } else if (n === 3) {
    if (consecutiveDays) split = simple ? "upper_lower" : "push_pull_legs";
    else if (!simple && muscleFocus) split = "push_pull_legs";
    else split = "full_body";
  } else if (n === 4) {
    split = !simple && muscleFocus && experience === "advanced" ? "ppl_upper" : "upper_lower";
  } else if (n === 5) {
    split = simple ? "upper_lower" : "ppl_upper_lower";
  } else {
    split = simple ? "upper_lower" : "push_pull_legs";
  }

  return { split, daysPerWeek: n, experience, goal, consecutiveDays, limitedEquipment, shortSessions };
}
