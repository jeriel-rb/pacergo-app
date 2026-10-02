import { describe, expect, it } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import { QA_EXCLUDED_EXERCISES, isAiEligible } from "../plan/exercise-qa";
import { STRETCH_LIBRARY, selectCooldown } from "../plan/stretch-library";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord, GeneratedSession } from "../plan/generated-plan-types";

const rec = (slug: string, muscleGroups: string[], equipment: string[] = [], extra: Partial<ExerciseRecord> = {}): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups,
  equipmentSettings: ["large_gym", "bodyweight_only"],
  equipment,
  hasInstructions: true,
  hasIllustration: true,
  shortCue: { en: `How to ${slug}.`, zh: `${slug} 方式。` },
  ...extra,
});

const STRETCHES = STRETCH_LIBRARY.map((s) =>
  rec(s.slug, ["mobility"], s.slug === "doorway-chest-stretch" ? ["doorway"] : []),
);

const LIFTS = [
  rec("jumping-jack", ["cardio"]),
  rec("high-knees", ["cardio"]),
  rec("bodyweight-squat", ["quads"]),
  // Things that are NOT stretches and must never be used as one:
  rec("plank", ["core", "abs", "shoulders"]),
  rec("glute-bridge", ["glutes", "hamstrings"]),
  // push
  rec("bench-press", ["chest", "triceps", "shoulders"], ["barbell"]),
  rec("overhead-press", ["shoulders", "triceps"], ["barbell"]),
  rec("tricep-pushdown", ["triceps", "shoulders"], ["cable_machine"]),
  rec("dip", ["triceps", "chest"], ["dip_station"]),
  // pull
  rec("barbell-row", ["back", "biceps"], ["barbell"]),
  rec("lat-pulldown", ["lats", "biceps"], ["lat_pulldown"]),
  rec("face-pull", ["upper_back", "rear_delts"], ["cable_machine"]),
  // legs
  rec("squat", ["quads", "glutes"], ["barbell"]),
  rec("romanian-deadlift", ["hamstrings", "glutes"], ["barbell"]),
  rec("hip-thrust", ["glutes", "hamstrings"], ["barbell"]),
  rec("standing-calf-raise", ["calves"], ["calf_machine"]),
];

const FULL_KIT = ["barbell", "cable_machine", "lat_pulldown", "dip_station", "calf_machine", "doorway"] as const;

const build = (opts: { exercises?: ExerciseRecord[]; equipment?: readonly string[]; tp?: Partial<TrainingPreferencesAnswers> } = {}) =>
  generateTrainingPlan({
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: "intermediate",
      daysPerWeek: "3",
      trainingDays: [0, 2, 4],
      workoutSplit: "push_pull_legs",
      durationMin: 60,
      variety: "fixed",
      ...opts.tp,
    },
    gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [...(opts.equipment ?? FULL_KIT)] as never, addCardio: false },
    exercises: opts.exercises ?? [...LIFTS, ...STRETCHES],
  });

const sessionFor = (plan: ReturnType<typeof build>, focus: string): GeneratedSession =>
  plan.weeks[0]!.days.find((d) => d.session?.focus === focus)!.session!;
const slugs = (s: GeneratedSession) => s.cooldown.map((e) => e.slug);

describe("recovery / stretching cooldown", () => {
  const plan = build();

  it("is made of real stretches only — never plank or glute bridge", () => {
    const library = new Set(STRETCH_LIBRARY.map((s) => s.slug));
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const e of day.session?.cooldown ?? []) {
          expect(library.has(e.slug), e.slug).toBe(true);
          expect(["plank", "glute-bridge"]).not.toContain(e.slug);
        }
      }
    }
  });

  it("follows the muscles trained: chest / shoulders / triceps day", () => {
    const cooldown = slugs(sessionFor(plan, "push"));
    expect(cooldown).toContain("doorway-chest-stretch");
    expect(cooldown).toContain("cross-body-shoulder-stretch");
    expect(cooldown).not.toContain("wall-calf-stretch");
    expect(cooldown).not.toContain("standing-quad-stretch");
  });

  it("follows the muscles trained: back / lats / biceps day", () => {
    const cooldown = slugs(sessionFor(plan, "pull"));
    expect(cooldown).toContain("childs-pose"); // lats / back
    expect(cooldown).not.toContain("wall-calf-stretch");
  });

  it("follows the muscles trained: legs / glutes / hamstrings day", () => {
    const cooldown = slugs(sessionFor(plan, "legs"));
    expect(cooldown).toContain("hamstring-stretch"); // also covers calves
    expect(cooldown).toContain("kneeling-hip-flexor-stretch"); // quads / glutes
    expect(cooldown).not.toContain("doorway-chest-stretch");
    expect(cooldown).not.toContain("cross-body-shoulder-stretch");
  });

  it("differs between workouts", () => {
    const sets = ["push", "pull", "legs"].map((f) => slugs(sessionFor(plan, f)).join(","));
    expect(new Set(sets).size).toBe(3);
  });

  it("shows duration, side, a short cue, and sets", () => {
    const legs = sessionFor(plan, "legs").cooldown;
    const hip = legs.find((e) => e.slug === "kneeling-hip-flexor-stretch")!;
    expect(hip).toMatchObject({ sets: 1, reps: "30 sec", perSide: true });
    expect(hip.cue?.en).toBeTruthy();
    expect(legs.find((e) => e.slug === "seated-forward-fold-stretch" || e.slug === "childs-pose")?.perSide).toBeUndefined();
    for (const e of legs) expect(e.reps).toMatch(/\d/);
  });

  it("uses 4 stretches normally and 3 for short sessions", () => {
    expect(sessionFor(plan, "legs").cooldown).toHaveLength(4);
    expect(sessionFor(build({ tp: { durationMin: 30 } }), "legs").cooldown).toHaveLength(3);
  });

  it("tops up with general stretches when the muscles trained match few", () => {
    const only = selectCooldown({ main: [{ muscleGroups: ["triceps"] }], available: STRETCHES, count: 3 });
    expect(only).toHaveLength(3);
  });

  it("skips a stretch whose equipment the user doesn't have (doorway)", () => {
    const noDoorway = build({ equipment: FULL_KIT.filter((e) => e !== "doorway") });
    for (const week of noDoorway.weeks) {
      for (const day of week.days) expect(day.session?.cooldown.map((e) => e.slug) ?? []).not.toContain("doorway-chest-stretch");
    }
  });

  it("is never empty for a user whose library has none (no stretches → no cooldown)", () => {
    const none = build({ exercises: LIFTS });
    expect(sessionFor(none, "push").cooldown).toEqual([]);
  });
});

describe("exercise QA gate", () => {
  it("every excluded exercise states why", () => {
    for (const [slug, reason] of Object.entries(QA_EXCLUDED_EXERCISES)) {
      expect(reason.length, slug).toBeGreaterThan(10);
    }
  });

  it("keeps a failing exercise out of the plan even when its equipment is available", () => {
    const plan = build();
    const all = plan.weeks.flatMap((w) => w.days.flatMap((d) => [...(d.session?.main ?? []), ...(d.session?.cooldown ?? [])]));
    expect(all.map((e) => e.slug)).not.toContain("dip");
    expect(isAiEligible(rec("dip", ["triceps"]))).toBe(false);
    expect(isAiEligible(rec("bench-press", ["chest"]))).toBe(true);
  });

  it("requires instructions, muscle mapping and an illustration", () => {
    expect(isAiEligible(rec("x", ["chest"], [], { hasInstructions: false }))).toBe(false);
    expect(isAiEligible(rec("x", [], []))).toBe(false);
    expect(isAiEligible(rec("x", ["chest"], [], { hasIllustration: false }))).toBe(false);
    // Older data without the flags isn't blocked.
    expect(isAiEligible({ slug: "x", muscleGroups: ["chest"] })).toBe(true);
  });
});
