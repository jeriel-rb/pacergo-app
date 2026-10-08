import { describe, it, expect } from "vitest";
import {
  generateTrainingPlan,
  progressionSets,
  PLAN_RULES_VERSION,
  restSecFor,
} from "../plan/generate-plan";
import {
  baseSchemeForExperience,
  volumeCurveFor,
  weekSetDelta,
  weekRirTarget,
  selectWarmupRaiseSlug,
} from "../plan/mesocycle-rules";
import { recommendLoad, recommendSessionProgression } from "../plan/progression";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord, GeneratedPlan } from "../plan/generated-plan-types";
import { STRETCH_LIBRARY } from "../plan/stretch-library";

const ex = (
  slug: string,
  muscles: string[],
  equipment: string[] = [],
): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups: muscles,
  equipmentSettings: [],
  equipment,
  hasInstructions: true,
  hasIllustration: true,
});

const CATALOG: ExerciseRecord[] = [
  ex("machine-chest-press", ["chest", "triceps"], ["chest_press_machine"]),
  ex("dumbbell-bench-press", ["chest", "triceps"], ["dumbbells", "bench"]),
  ex("push-up", ["chest", "triceps"]),
  ex("dumbbell-row", ["back", "biceps"], ["dumbbells"]),
  ex("inverted-row", ["back", "biceps"]),
  ex("goblet-squat", ["quads", "glutes"], ["dumbbells", "kettlebell"]),
  ex("bodyweight-lunge", ["quads", "glutes"]),
  ex("romanian-deadlift", ["hamstrings", "glutes"], ["dumbbells"]),
  ex("dumbbell-lateral-raise", ["shoulders"], ["dumbbells"]),
  ex("dumbbell-curl", ["biceps"], ["dumbbells"]),
  ex("triceps-pushdown", ["triceps"], ["cable_machine"]),
  ex("crunch", ["abs", "core"]),
  ex("jumping-jack", ["cardio"]),
  ex("high-knees", ["cardio"]),
  ex("bodyweight-squat", ["quads"]),
  ex("arm-circles", ["shoulders"]),
  ex("leg-swings-stretch", ["hamstrings"]),
  ex("march-in-place", ["cardio"]),
  ex("cycling", ["cardio"], ["cycling_stationary"]),
  ex("elliptical", ["cardio"], ["elliptical"]),
  ex("rowing", ["cardio"], ["rowing"]),
  ex("running", ["cardio"], ["treadmill"]),
  ...STRETCH_LIBRARY.map((s) =>
    ex(s.slug, ["mobility"], s.slug === "doorway-chest-stretch" ? ["doorway"] : []),
  ),
];

function plan(opts: {
  answers?: Partial<OnboardingAnswers>;
  prefs?: Partial<TrainingPreferencesAnswers>;
  gym?: Partial<GymEquipmentAnswers>;
}): GeneratedPlan {
  return generateTrainingPlan({
    answers: {
      ...ONBOARDING_ANSWERS_DEFAULT,
      goal: "build_muscle",
      gender: "male",
      age: 28,
      heightCm: 175,
      weightKg: 70,
      ...opts.answers,
    },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: "beginner",
      daysPerWeek: "3",
      workoutSplit: "full_body",
      durationMin: 45,
      variety: "balanced",
      ...opts.prefs,
    },
    gymEquipment: {
      ...GYM_EQUIPMENT_DEFAULT,
      gymType: "large_gym",
      equipment: ["dumbbells", "bench", "cable_machine", "kettlebell", "chest_press_machine"],
      cardioTypes: ["cycling_stationary"],
      addCardio: false,
      ...opts.gym,
    },
    exercises: CATALOG,
  });
}

const mainSlugs = (p: GeneratedPlan, week = 0) =>
  p.weeks[week]!.days.flatMap((d) => d.session?.main.map((e) => e.slug) ?? []);

describe("mesocycle experience tables", () => {
  it("gives Beginner and Basic different base sets", () => {
    expect(baseSchemeForExperience("no_experience").sets).toBe(2);
    expect(baseSchemeForExperience("beginner").sets).toBe(3);
    expect(baseSchemeForExperience("no_experience").reps).not.toBe(baseSchemeForExperience("beginner").reps);
  });

  it("generates different prescriptions for Beginner vs Basic", () => {
    const beginner = plan({ prefs: { experience: "no_experience" } });
    const basic = plan({ prefs: { experience: "beginner" } });
    const b0 = beginner.weeks[0]!.days.find((d) => d.session)!.session!.main[0]!;
    const a0 = basic.weeks[0]!.days.find((d) => d.session)!.session!.main[0]!;
    expect(b0.sets).toBe(2);
    expect(a0.sets).toBe(3);
    expect(b0.reps).not.toEqual(a0.reps);
  });
});

describe("mesocycle volume / week progression", () => {
  it("defaults novices to FLAT (no automatic weekly set ramp)", () => {
    expect(volumeCurveFor({ experience: "no_experience", goal: "build_muscle", obstacle: null })).toBe("FLAT");
    expect(weekSetDelta(0, "FLAT")).toBe(0);
    expect(weekSetDelta(3, "FLAT")).toBe(0);
  });

  it("does not add a set every week for Beginner build-muscle plans", () => {
    const p = plan({ prefs: { experience: "no_experience" } });
    const sets = (w: number) =>
      p.weeks[w]!.days.find((d) => d.session)!.session!.main.map((e) => e.sets);
    expect(sets(0)).toEqual(sets(1));
    expect(sets(2)).toEqual(sets(0));
    expect(sets(3)).toEqual(sets(0));
  });

  it("steps main exercises toward harder variations across weeks", () => {
    const p = plan({ prefs: { variety: "balanced", daysPerWeek: "4", workoutSplit: "upper_lower" } });
    expect(mainSlugs(p, 0).length).toBeGreaterThan(0);
    const changed = [1, 2, 3].some((w) => JSON.stringify(mainSlugs(p, w)) !== JSON.stringify(mainSlugs(p, 0)));
    expect(changed).toBe(true);
  });

  it("tightens RIR across weeks while keeping FLAT sets for Basic", () => {
    expect(weekRirTarget(0, "beginner", "FLAT")).toBeGreaterThan(weekRirTarget(2, "beginner", "FLAT"));
    const p = plan({ prefs: { experience: "beginner" } });
    const rir = (w: number) => p.weeks[w]!.days.find((d) => d.session)!.session!.main[0]!.rirTarget;
    expect(rir(0)).toBeGreaterThan(rir(2)!);
  });

  it("keeps progressionSets as a compatibility shim that no longer auto-ramps novices", () => {
    expect(progressionSets(0, null)).toBe(0);
    expect(progressionSets(3, null)).toBe(0);
    expect(progressionSets(3, "injuries")).toBe(0);
  });
});

describe("goal profiles", () => {
  it("does not auto-shorten rest solely because the goal is fat loss", () => {
    const record = CATALOG.find((e) => e.slug === "dumbbell-bench-press")!;
    const prefs = {
      restTimerEnabled: true,
      restTimerMinSec: 60,
      restTimerMaxSec: 180,
    };
    const fat = restSecFor({ record, reps: "12-15", goal: "lose_weight", prefs });
    const muscle = restSecFor({ record, reps: "12-15", goal: "build_muscle", prefs });
    // Same reps: fat loss must not sit below build muscle from a goal penalty.
    expect(fat).toBeGreaterThanOrEqual(muscle - 5);
  });

  it("builds a functional plan with stable mains", () => {
    const p = plan({ answers: { goal: "functional" }, prefs: { experience: "intermediate", daysPerWeek: "4" } });
    expect(p.rulesVersion).toBe(PLAN_RULES_VERSION);
    expect(mainSlugs(p, 0).length).toBeGreaterThan(0);
    const healthy = plan({
      answers: { goal: "stay_healthy" },
      prefs: { experience: "intermediate", daysPerWeek: "4" },
    });
    expect(JSON.stringify(mainSlugs(p, 0))).not.toEqual(JSON.stringify(mainSlugs(healthy, 0)));
  });
});

describe("warm-up Raise chain", () => {
  it("prefers stationary bike when available for novices", () => {
    expect(
      selectWarmupRaiseSlug({
        available: new Set(["cycling_stationary"]),
        lowImpact: false,
        preferMachine: true,
      }),
    ).toBe("cycling");
  });

  it("puts an easy machine Raise first in generated beginner warm-ups when bike exists", () => {
    const p = plan({
      prefs: { experience: "no_experience" },
      gym: { equipment: ["dumbbells", "bench"], cardioTypes: ["cycling_stationary"] },
    });
    const warmup = p.weeks[0]!.days.find((d) => d.session)!.session!.warmup.map((e) => e.slug);
    expect(warmup[0]).toBe("cycling");
    expect(warmup).not.toContain("jumping-jack");
  });
});

describe("duration-aware generation", () => {
  it("keeps short sessions smaller than long ones", () => {
    const short = plan({ prefs: { durationMin: 30, experience: "beginner" } });
    const long = plan({ prefs: { durationMin: 90, experience: "beginner" } });
    const count = (p: GeneratedPlan) =>
      Math.max(...p.weeks[0]!.days.filter((d) => d.session).map((d) => d.session!.main.length));
    expect(count(short)).toBeLessThanOrEqual(count(long));
  });
});

describe("live progression engine", () => {
  const sets = (kg: number, ...reps: number[]) => reps.map((r) => ({ weightKg: kg, reps: r }));

  it("increases load at top of range", () => {
    expect(
      recommendLoad({ targetReps: "8-12", previous: { sets: sets(40, 12, 12, 12), effort: "just_right" } })!.action,
    ).toBe("increase");
  });

  it("reassesses dose after repeated misses", () => {
    const r = recommendSessionProgression({
      targetReps: "8-12",
      previous: { sets: sets(50, 6, 5, 5), effort: "too_heavy" },
      consecutiveMisses: 2,
    });
    expect(r).not.toBeNull();
    expect(r!.action).toBe("decrease");
    expect(r!.reassessDose).toBe(true);
  });
});
