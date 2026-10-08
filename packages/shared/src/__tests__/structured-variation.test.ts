import { describe, expect, it } from "vitest";
import { generateTrainingPlan, PLAN_RULES_VERSION } from "../plan/generate-plan";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type OnboardingEquipment,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord, GeneratedPlan } from "../plan/generated-plan-types";

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

/** Rich enough catalog for chest/back A vs B emphasis. */
const CATALOG: ExerciseRecord[] = [
  ex("barbell-bench-press", ["chest", "triceps", "shoulders"], ["barbell", "bench"]),
  ex("incline-barbell-bench-press", ["upper_chest", "shoulders", "triceps"], ["barbell", "bench"]),
  ex("dumbbell-bench-press", ["chest", "triceps"], ["dumbbells", "bench"]),
  ex("incline-dumbbell-press", ["upper_chest", "triceps"], ["dumbbells", "bench"]),
  ex("machine-chest-press", ["chest", "triceps"], ["chest_press_machine"]),
  ex("cable-fly", ["chest"], ["cable_machine"]),
  ex("low-to-high-cable-fly", ["upper_chest", "chest"], ["cable_machine"]),
  ex("barbell-row", ["back", "biceps"], ["barbell"]),
  ex("chest-supported-row", ["back", "biceps"], ["chest_supported_row_machine"]),
  ex("lat-pulldown", ["lats", "biceps"], ["lat_pulldown"]),
  ex("pull-up", ["lats", "biceps"], ["pull_up_bar"]),
  ex("overhead-press", ["shoulders", "triceps"], ["barbell"]),
  ex("machine-shoulder-press", ["shoulders", "triceps"], ["shoulder_press_machine"]),
  ex("lateral-raise", ["shoulders"], ["dumbbells"]),
  ex("dumbbell-curl", ["biceps"], ["dumbbells"]),
  ex("tricep-pushdown", ["triceps"], ["cable_machine"]),
  ex("barbell-squat", ["quads", "glutes"], ["barbell", "squat_rack"]),
  ex("leg-press", ["quads", "glutes"], ["leg_press"]),
  ex("romanian-deadlift", ["hamstrings", "glutes"], ["barbell"]),
  ex("leg-curl", ["hamstrings"], ["lying_leg_curl_machine"]),
  ex("hip-thrust", ["glutes"], ["barbell", "bench"]),
  ex("standing-calf-raise", ["calves"], ["calf_machine"]),
  ex("crunch", ["abs", "core"], []),
  ex("plank", ["core", "abs"], []),
  ex("arm-circles", ["cardio"], []),
  ex("leg-swings-stretch", ["cardio"], []),
  ex("bodyweight-squat", ["quads"], []),
  ex("childs-pose", ["mobility"], []),
  ex("doorway-chest-stretch", ["mobility"], ["doorway"]),
  ex("kneeling-hip-flexor-stretch", ["mobility"], []),
  ex("hamstring-stretch", ["mobility"], []),
  ex("cross-body-shoulder-stretch", ["mobility"], []),
];

const KIT: OnboardingEquipment[] = [
  "barbell",
  "dumbbells",
  "bench",
  "squat_rack",
  "cable_machine",
  "lat_pulldown",
  "chest_press_machine",
  "shoulder_press_machine",
  "chest_supported_row_machine",
  "leg_press",
  "lying_leg_curl_machine",
  "calf_machine",
  "pull_up_bar",
  "doorway",
];

function plan(opts: {
  daysPerWeek?: "2" | "3" | "4" | "5" | "6" | "every_day";
  split?: "upper_lower" | "full_body" | "push_pull_legs";
  variety?: "fixed" | "balanced" | "dynamic";
  history?: { recentSlugs?: string[]; strugglingSlugs?: string[] };
} = {}): GeneratedPlan {
  return generateTrainingPlan({
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", gender: "male", age: 28, heightCm: 178, weightKg: 78 },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: "intermediate",
      daysPerWeek: opts.daysPerWeek ?? "4",
      trainingDays: opts.daysPerWeek === "2" ? [1, 4] : opts.daysPerWeek === "3" ? [0, 2, 4] : [0, 1, 2, 3],
      workoutSplit: opts.split ?? "upper_lower",
      variety: opts.variety ?? "balanced",
      durationMin: 60,
    },
    gymEquipment: {
      ...GYM_EQUIPMENT_DEFAULT,
      gymType: "large_gym",
      equipment: KIT,
      addCardio: false,
    },
    exercises: CATALOG,
    performanceHistory: opts.history,
  });
}

function focusSessions(p: GeneratedPlan, focus: string, week = 0) {
  return p.weeks[week]!.days
    .filter((d) => d.session?.focus === focus)
    .map((d) => d.session!.main.map((e) => e.slug));
}

describe("structured within-week variation", () => {
  it("stamps the current rules version", () => {
    expect(plan().rulesVersion).toBe(PLAN_RULES_VERSION);
  });

  it("makes same-focus days in a week use different main lineups (Exposure A vs B)", () => {
    const uppers = focusSessions(plan({ daysPerWeek: "4", split: "upper_lower" }), "upper");
    expect(uppers.length).toBeGreaterThanOrEqual(2);
    expect(uppers[0]).not.toEqual(uppers[1]);
    // Not a total remix — some overlap (measurable core) is allowed, but not a clone.
    const shared = uppers[0]!.filter((s) => uppers[1]!.includes(s));
    expect(shared.length).toBeLessThan(uppers[0]!.length);
  });

  it("keeps a once-per-week focus as a single exposure (no forced remix)", () => {
    const pushes = focusSessions(
      plan({ daysPerWeek: "3", split: "push_pull_legs", variety: "fixed" }),
      "push",
    );
    expect(pushes).toHaveLength(1);
  });

  it("full-body 3×/week produces distinct sessions, not three clones", () => {
    const days = focusSessions(plan({ daysPerWeek: "3", split: "full_body", variety: "balanced" }), "full_body");
    expect(days).toHaveLength(3);
    expect(new Set(days.map((d) => d.join("|"))).size).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic — same history + answers → same plan", () => {
    const h = { recentSlugs: ["barbell-bench-press", "barbell-row"], strugglingSlugs: ["overhead-press"] };
    const a = plan({ history: h });
    const b = plan({ history: h });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("history can steer later exposures away from recently logged leads", () => {
    const plain = focusSessions(plan({ daysPerWeek: "4", split: "upper_lower", variety: "fixed" }), "upper");
    const withHistory = focusSessions(
      plan({
        daysPerWeek: "4",
        split: "upper_lower",
        variety: "fixed",
        history: { recentSlugs: plain[1] ?? [], strugglingSlugs: plain[1] ?? [] },
      }),
      "upper",
    );
    // Exposure B should not be forced onto the same recently hammered lead set.
    expect(withHistory[1]).not.toEqual(plain[1]);
  });

  it("fixed variety keeps Exposure A stable across weeks for overload tracking", () => {
    const p = plan({ daysPerWeek: "4", split: "upper_lower", variety: "fixed" });
    const w1 = focusSessions(p, "upper", 0)[0];
    const w4 = focusSessions(p, "upper", 3)[0];
    expect(w1).toEqual(w4);
  });
});
