import type {
  DietMode,
  TrainingFrequency,
  TrainingGoal,
  TrainingLocation,
  WeightClass,
} from "../enums/training";
import type { ComposerExperienceLevel } from "../enums/experience";
import type { PlanGender } from "../enums/gender";

/** A bilingual string pair — every piece of authored/generated copy in the
 *  plan is one of these; the UI picks `[locale]` at render time. */
export interface Bi {
  zh: string;
  en: string;
}

/** The 6 onboarding inputs (spec A-1), nothing else. */
export interface PlanSelection {
  goal: TrainingGoal;
  gender: PlanGender;
  level: ComposerExperienceLevel;
  weightClass: WeightClass;
  frequency: TrainingFrequency;
  location: TrainingLocation;
  dietMode: DietMode;
  locale: "zh" | "en";
}

export type ExerciseSlot = "warmup" | "main" | "cooldown";

/** One exercise entry within a warm-up/main/cool-down list. `rx` is the
 *  per-exercise prescription ("12 reps", "30 sec") — between-set rest is
 *  handled once per session via `PlanSessionContent.scheme` instead. */
export interface PlanExerciseEntry {
  /** Stable ref into the future `exercises` content DB (A-7) — not built
   *  yet, so this is a slug derived from the entry today; the exercise
   *  detail screen (A-5) will resolve real records against these once that
   *  table exists. Re-authoring content later must not change refs for
   *  entries that are conceptually "the same exercise", or determinism
   *  across a content update would silently reshuffle old saved plans. */
  ref: string;
  name: Bi;
  rx: Bi;
}

/** One training day's full session: fixed 60 min = 10 warm-up + 40 main +
 *  10 cool-down (A-2 DoD), constrained to the day's `slot`. */
export interface PlanSessionContent {
  /** Session focus shown on the day card (A-3), e.g. "Full body". */
  focus: Bi;
  /** How to run the main block at the user's level (sets/rounds/rest). */
  scheme: Bi;
  warmup: PlanExerciseEntry[];
  main: PlanExerciseEntry[];
  cooldown: PlanExerciseEntry[];
}

export interface PlanDay {
  /** 0 = Monday .. 6 = Sunday. */
  dayIndex: number;
  dayLabel: Bi;
  isRestDay: boolean;
  /** null iff isRestDay. */
  session: PlanSessionContent | null;
}

export interface PlanWeek {
  /** 1-4. */
  weekIndex: number;
  days: PlanDay[]; // always length 7
}

/** Authored diet content (plan-data.ts) — carries both genders' guidance;
 *  the composer resolves `byGender[sel.gender]` into `ResolvedNutrition`
 *  below when assembling a specific plan. */
export interface DietGuidance {
  label: Bi;
  body: Bi[];
  /** Gender-specific calorie/intake framing — targets genuinely differ. */
  byGender: Record<PlanGender, Bi>;
  /** Extra tuning shown only for the "heavy" weight class. */
  heavyNote?: Bi;
}

/** `DietGuidance` resolved for one specific plan's gender + weight class. */
export interface ResolvedNutrition {
  label: Bi;
  body: Bi[];
  genderNote: Bi;
  /** Present only when the plan's weightClass is "heavy". */
  heavyNote?: Bi;
}

/** The full, structured 4-week plan (A-2). Every week is generated and
 *  visible immediately — nothing is drip-released. Read-only: there is no
 *  completion/progress state anywhere in this shape (A-X10). */
export interface TrainingPlan {
  selection: PlanSelection;
  /** Framing shown once at the top of the plan. */
  intro: Bi;
  /** Body-type guidance for the plan's gender + weight class. */
  weightNote: Bi;
  weeklyScheduleNote: Bi;
  weeks: PlanWeek[]; // always length 4
  /** Combined goal + location + always-on safety notes. */
  notes: Bi[];
  nutrition: ResolvedNutrition;
}
