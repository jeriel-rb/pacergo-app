import type {
  OnboardingAnswers,
  OnboardingExperience,
  OnboardingGoal,
} from "../onboarding/onboarding-types";

/** Volume mode for the 4-week consumer mesocycle. FLAT is the default. */
export type VolumeCurve = "FLAT" | "MILD_RAMP" | "CONSOLIDATE";

export type TrainingQuality =
  | "strength"
  | "hypertrophy"
  | "power"
  | "aerobic"
  | "anaerobic"
  | "locomotion"
  | "stability"
  | "movement_skill";

export interface ExperienceScheme {
  sets: number;
  reps: string;
}

/** Beginner (`no_experience`) ≠ Basic (`beginner`). */
export const EXPERIENCE_SCHEME: Record<OnboardingExperience, ExperienceScheme> = {
  no_experience: { sets: 2, reps: "12-15" },
  beginner: { sets: 3, reps: "10-12" },
  intermediate: { sets: 3, reps: "8-12" },
  advanced: { sets: 4, reps: "6-10" },
};

export function baseSchemeForExperience(experience: OnboardingExperience): ExperienceScheme {
  return EXPERIENCE_SCHEME[experience];
}

export interface GoalProfile {
  id: OnboardingGoal;
  /** Fat loss must not auto-shorten rests. */
  shortenRestForDensity: boolean;
  /** Prefer higher-rep technique ranges when true. */
  preferHigherReps: boolean;
  conditioningBias: "optional" | "encouraged";
  fatigueSensitivity: "low" | "medium" | "high";
  qualityWeights: Partial<Record<TrainingQuality, number>>;
}

export const GOAL_PROFILES: Record<OnboardingGoal, GoalProfile> = {
  build_muscle: {
    id: "build_muscle",
    shortenRestForDensity: false,
    preferHigherReps: false,
    conditioningBias: "optional",
    fatigueSensitivity: "medium",
    qualityWeights: { hypertrophy: 3, strength: 2 },
  },
  lose_weight: {
    id: "lose_weight",
    shortenRestForDensity: false,
    preferHigherReps: true,
    conditioningBias: "encouraged",
    fatigueSensitivity: "high",
    qualityWeights: { hypertrophy: 2, strength: 2, aerobic: 2 },
  },
  stay_healthy: {
    id: "stay_healthy",
    shortenRestForDensity: false,
    preferHigherReps: true,
    conditioningBias: "encouraged",
    fatigueSensitivity: "medium",
    qualityWeights: { strength: 2, hypertrophy: 2, aerobic: 2, movement_skill: 1, stability: 1 },
  },
  functional: {
    id: "functional",
    shortenRestForDensity: false,
    preferHigherReps: false,
    conditioningBias: "encouraged",
    fatigueSensitivity: "medium",
    qualityWeights: {
      strength: 2,
      hypertrophy: 1,
      power: 2,
      aerobic: 1,
      anaerobic: 1,
      locomotion: 1,
      stability: 1,
      movement_skill: 1,
    },
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
    (experience === "beginner" || experience === "intermediate" || experience === "advanced") &&
    (goal === "build_muscle" || goal === "functional")
  ) {
    return "MILD_RAMP";
  }
  return "FLAT";
}

/** Extra sets on main lifts for the week (0-based week index). */
export function weekSetDelta(week: number, curve: VolumeCurve): number {
  if (curve === "FLAT") return 0;
  if (curve === "MILD_RAMP") {
    // W1–W2 base, W3 peak (+1), W4 hold peak (consolidation decided separately).
    return week >= 2 ? 1 : 0;
  }
  // CONSOLIDATE: used as week-4 overlay — caller applies negative delta.
  return 0;
}

/** Whether week 4 should ease effort/sets for this curve + experience. */
export function shouldConsolidateWeek4(input: {
  week: number;
  curve: VolumeCurve;
  experience: OnboardingExperience;
  obstacle: OnboardingAnswers["obstacle"];
}): boolean {
  if (input.week !== 3) return false;
  if (input.obstacle === "lack_of_time" || input.obstacle === "injuries") return false;
  if (input.experience === "no_experience" || input.experience === "beginner") return false;
  return input.curve === "MILD_RAMP";
}

/** Planned RIR for the week — effort progression without adding sets. */
export function weekRirTarget(week: number, experience: OnboardingExperience, curve: VolumeCurve): number {
  const base = experience === "no_experience" ? 4 : experience === "beginner" ? 3 : experience === "intermediate" ? 3 : 2;
  if (week <= 0) return base;
  if (week === 1) return Math.max(2, base - 0);
  if (week === 2) return Math.max(1, base - 1);
  // Week 4: consolidate back up if we ramped, else hold week-3 effort.
  if (shouldConsolidateWeek4({ week, curve, experience, obstacle: null })) return base;
  return Math.max(1, base - 1);
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

/** Mobility / specific warm-up slugs after the Raise. */
export const WARMUP_MOBILITY_SLUGS = ["arm-circles", "leg-swings-stretch", "bodyweight-squat"] as const;

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
