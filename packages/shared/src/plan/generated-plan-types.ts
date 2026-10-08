import type { Bi } from "./plan-types";

/** Which muscle-group cluster a training day targets — drives exercise
 *  selection from the `exercises` catalog. */
export type SessionFocus = "push" | "pull" | "legs" | "upper" | "lower" | "full_body";

export interface GeneratedExercise {
  slug: string;
  name: Bi;
  /** One-line how-to shown with the exercise (used for stretches). */
  cue?: Bi;
  /** Done once on each side (stretches and unilateral holds). */
  perSide?: boolean;
  sets: number;
  /** "10-12" for rep ranges, or "30 sec" for timed work. */
  reps: string;
  restSec: number;
  /** Planned reps-in-reserve for main work (composer effort cue). */
  rirTarget?: number;
}

export interface GeneratedCardioBlock {
  placement: "start" | "end";
  exercise: GeneratedExercise;
}

export interface GeneratedSession {
  focus: SessionFocus;
  warmup: GeneratedExercise[];
  main: GeneratedExercise[];
  cooldown: GeneratedExercise[];
  cardio: GeneratedCardioBlock | null;
}

export interface GeneratedDay {
  /** 0 = Monday .. 6 = Sunday. */
  dayIndex: number;
  dayLabel: Bi;
  isRestDay: boolean;
  session: GeneratedSession | null;
}

export interface GeneratedWeek {
  /** 1-4. */
  weekIndex: number;
  days: GeneratedDay[]; // always length 7
}

/** The full generated plan. Every week uses the same day-of-week pattern.
 *  Same-focus days within a week use structured Exposure A/B emphasis; week-
 *  to-week primaries stay frozen when variety is `fixed` (ladder when
 *  balanced/dynamic). Dose progresses via reps/effort/RIR and mild set ramps.
 *  All 4 weeks are always fully generated and visible, nothing drip-released. */
export interface GeneratedPlan {
  weeks: GeneratedWeek[]; // always length 4
  sessionDurationMin: number;
  /** `PLAN_RULES_VERSION` the plan was generated under. Absent on plans saved
   *  before it existed — those can be refreshed to the current rules. */
  rulesVersion?: number;
}

/** Minimal shape the composer needs from an `exercises` row — instructions/
 *  tips are fetched fresh by slug on the exercise detail screen instead of
 *  being embedded in the saved plan, so the plan JSON stays small and
 *  always reflects the latest authored content. */
export interface ExerciseRecord {
  slug: string;
  nameEn: string;
  nameZh: string;
  muscleGroups: string[];
  equipmentSettings: string[];
  /** Onboarding equipment / cardio ids — ANY ONE unlocks the exercise; empty
   *  means it needs no equipment. When present, the plan is built from the
   *  equipment the user selected; when absent (older data) it falls back to
   *  `equipmentSettings` and the gym type. */
  equipment?: string[];
  /** Has written step-by-step instructions. Exercises that do are preferred, so
   *  a day's exercises don't open onto an empty steps section. */
  hasInstructions?: boolean;
  /** Has a drawn illustration. An exercise without one isn't generated. */
  hasIllustration?: boolean;
  /** First steps of the instructions, joined — shown as the stretch cue. */
  shortCue?: Bi;
}
