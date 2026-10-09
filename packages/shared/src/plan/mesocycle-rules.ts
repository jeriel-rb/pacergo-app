import type {
  OnboardingAnswers,
  OnboardingExperience,
  OnboardingGoal,
} from "../onboarding/onboarding-types";

/** Volume mode for the 4-week consumer mesocycle. FLAT is the default.
 *  Week-4 easing is `shouldConsolidateWeek4`, not a third curve. */
export type VolumeCurve = "FLAT" | "MILD_RAMP";

export interface ExperienceScheme {
  sets: number;
  reps: string;
}

/** Beginner (`no_experience`) ≠ Basic (`basic`). */
export const EXPERIENCE_SCHEME: Record<OnboardingExperience, ExperienceScheme> = {
  no_experience: { sets: 2, reps: "12-15" },
  basic: { sets: 3, reps: "10-12" },
  intermediate: { sets: 3, reps: "8-12" },
  advanced: { sets: 4, reps: "6-10" },
};

export function baseSchemeForExperience(experience: OnboardingExperience): ExperienceScheme {
  return EXPERIENCE_SCHEME[experience];
}

/** The two goal settings generation actually reads. Rep bias changes the
 *  working range; conditioning bias prefers a machine in the warm-up. */
export interface GoalProfile {
  id: OnboardingGoal;
  /** Prefer higher-rep technique ranges when true. */
  preferHigherReps: boolean;
  conditioningBias: "optional" | "encouraged";
}

export const GOAL_PROFILES: Record<OnboardingGoal, GoalProfile> = {
  build_muscle: {
    id: "build_muscle",
    preferHigherReps: false,
    conditioningBias: "optional",
  },
  lose_weight: {
    id: "lose_weight",
    preferHigherReps: true,
    conditioningBias: "encouraged",
  },
  stay_healthy: {
    id: "stay_healthy",
    preferHigherReps: true,
    conditioningBias: "encouraged",
  },
  functional: {
    id: "functional",
    preferHigherReps: false,
    conditioningBias: "encouraged",
  },
};

export function goalProfile(goal: OnboardingGoal | null): GoalProfile {
  return GOAL_PROFILES[goal ?? "stay_healthy"];
}

export function volumeCurveFor(input: {
  experience: OnboardingExperience;
  goal: OnboardingGoal | null;
  obstacle: OnboardingAnswers["obstacle"];
}): VolumeCurve {
  const { experience, goal, obstacle } = input;
  if (obstacle === "lack_of_time" || obstacle === "injuries") return "FLAT";
  if (experience === "no_experience") return "FLAT";
  if (goal === "lose_weight") return "FLAT";
  // Basic+ hypertrophy / functional may take a mild mid-block set add.
  if (
    (experience === "basic" || experience === "intermediate" || experience === "advanced") &&
    (goal === "build_muscle" || goal === "functional")
  ) {
    return "MILD_RAMP";
  }
  return "FLAT";
}

/** Extra sets on main lifts for the week (0-based week index). */
export function weekSetDelta(week: number, curve: VolumeCurve): number {
  if (curve === "FLAT") return 0;
  // W1–W2 base, W3–W4 +1. Week 4 drops the add in `setsForWeek` when consolidating.
  return week >= 2 ? 1 : 0;
}

/** Whether week 4 should drop the mid-block set add. */
export function shouldConsolidateWeek4(input: {
  week: number;
  curve: VolumeCurve;
  experience: OnboardingExperience;
  obstacle: OnboardingAnswers["obstacle"];
}): boolean {
  if (input.week !== 3) return false;
  if (input.obstacle === "lack_of_time" || input.obstacle === "injuries") return false;
  if (input.experience === "no_experience" || input.experience === "basic") return false;
  return input.curve === "MILD_RAMP";
}

/** Fewer days → more sets per session; 6–7 days → one set less so frequency changes the dose. */
export function frequencySetAdjust(trainingDays: number): number {
  if (trainingDays <= 2) return 1;
  if (trainingDays >= 6) return -1;
  return 0;
}

/** Sets for a main exercise in a given week. */
export function setsForWeek(input: {
  baseSets: number;
  week: number;
  curve: VolumeCurve;
  experience: OnboardingExperience;
  obstacle: OnboardingAnswers["obstacle"];
  trainingDays?: number;
}): number {
  const consolidate = shouldConsolidateWeek4({
    week: input.week,
    curve: input.curve,
    experience: input.experience,
    obstacle: input.obstacle,
  });
  const delta = consolidate ? 0 : weekSetDelta(input.week, input.curve);
  const freq = input.obstacle === "lack_of_time" ? 0 : frequencySetAdjust(input.trainingDays ?? 3);
  return Math.max(1, input.baseSets + delta + freq);
}

/** How many steps up the easy→hard ladder this week should take (0 = easiest). */
export function weekLadderStep(week: number, goal: OnboardingGoal | null): number {
  const bias = goal === "functional" ? 1 : 0;
  return week + bias;
}

/**
 * Machine Raise preference for warm-up. Returns a catalog cardio slug, or null
 * to use bodyweight Raise drills. Cardio machines come from onboarding
 * `cardioTypes` (and any overlapping ids in `equipment`).
 */
export function selectWarmupRaiseSlug(input: {
  available: ReadonlySet<string>;
  lowImpact: boolean;
  preferMachine: boolean;
}): string | null {
  if (!input.preferMachine && !input.lowImpact) return null;
  const chain: { id: string; slug: string }[] = [
    { id: "cycling_stationary", slug: "cycling" },
    { id: "cycling", slug: "cycling" },
    { id: "elliptical", slug: "elliptical" },
    { id: "rowing", slug: "rowing" },
    { id: "treadmill", slug: "treadmill-incline-walk" },
  ];
  for (const step of chain) {
    if (input.available.has(step.id)) return step.slug;
  }
  return null;
}

/** Every dynamic mobility / activation drill a warm-up can use after the Raise.
 *  Which of them, and in what order, depends on the day's focus (see
 *  `WARMUP_DRILLS_BY_FOCUS` in generate-plan.ts). All are light, low-skill moves. */
export const WARMUP_MOBILITY_SLUGS = [
  "arm-circles",
  "leg-swings-stretch",
  "bodyweight-squat",
  "worlds-greatest-stretch",
  "cat-cow-stretch",
  "scapular-push-up",
  "band-pull-apart",
  "prone-y-raise",
  "glute-bridge",
] as const;

/** Impact Raise used only when no machine and not low-impact. */
export const WARMUP_IMPACT_RAISE_SLUGS = ["jumping-jack", "high-knees"] as const;

export function compoundRepsFor(input: {
  experience: OnboardingExperience;
  goal: OnboardingGoal | null;
  obstacle: OnboardingAnswers["obstacle"];
}): string {
  if (input.obstacle === "injuries") return "12-15";
  const profile = goalProfile(input.goal);
  const base = baseSchemeForExperience(input.experience).reps;
  if (profile.preferHigherReps && input.experience !== "advanced") {
    if (input.goal === "lose_weight") return "12-15";
    if (input.goal === "stay_healthy" && input.experience === "no_experience") return "12-15";
  }
  return base;
}
