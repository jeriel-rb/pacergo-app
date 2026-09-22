import { describe, expect, it } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

const ex = (
  slug: string,
  muscleGroups: string[],
  equipment: string[] | undefined,
  hasInstructions = true,
): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups,
  equipmentSettings: ["large_gym", "small_gym", "garage_gym", "bodyweight_only"],
  equipment,
  hasInstructions,
});

const EXERCISES: ExerciseRecord[] = [
  ex("jumping-jack", ["cardio"], []),
  ex("high-knees", ["cardio"], []),
  ex("bodyweight-squat", ["quads"], []),
  ex("plank", ["core"], []),
  ex("glute-bridge", ["glutes"], []),
  ex("push-up", ["chest", "triceps"], []),
  ex("bench-press", ["chest", "shoulders", "triceps"], ["barbell"]),
  ex("dumbbell-fly", ["chest"], ["dumbbells"]),
  ex("cable-fly", ["chest"], ["cable_machine"]),
  ex("archer-push-up", ["chest", "triceps"], [], false),
  ex("doorway-row", ["back", "biceps"], ["doorway"], false),
  ex("lat-pulldown", ["back", "biceps"], ["lat_pulldown"]),
];

const plan = (equipment: string[], split: "ppl_full_body" | "ai_custom" = "ppl_full_body") =>
  generateTrainingPlan({
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: "beginner",
      daysPerWeek: "4",
      workoutSplit: split,
      durationMin: 90,
    },
    gymEquipment: {
      ...GYM_EQUIPMENT_DEFAULT,
      gymType: "large_gym",
      equipment: equipment as never,
      addCardio: false,
    },
    exercises: EXERCISES,
  });

const mainSlugs = (p: ReturnType<typeof plan>, focus: string) =>
  p.weeks[0]!.days.flatMap((d) => (d.session && d.session.focus === focus ? d.session.main.map((e) => e.slug) : []));

describe("equipment-driven exercise pool", () => {
  it("only picks exercises whose equipment the user ticked", () => {
    const withBarbell = mainSlugs(plan(["barbell"]), "push");
    const without = mainSlugs(plan(["dumbbells"]), "push");
    expect(withBarbell).toContain("bench-press");
    expect(without).not.toContain("bench-press");
    expect(without).toContain("dumbbell-fly");
  });

  it("falls back to bodyweight moves when nothing is ticked", () => {
    const none = mainSlugs(plan([]), "push");
    expect(none.length).toBeGreaterThan(0);
    for (const slug of none) expect(["push-up", "archer-push-up"]).toContain(slug);
  });

  it("does not ignore the selection: changing it changes the plan", () => {
    expect(JSON.stringify(plan(["barbell", "dumbbells"]))).not.toEqual(JSON.stringify(plan(["cable_machine"])));
  });

  it("prefers exercises that have written instructions over ones that don't", () => {
    // push-up has steps, archer-push-up doesn't: with room for both, steps come first.
    const picks = mainSlugs(plan([]), "push");
    expect(picks.indexOf("push-up")).toBeLessThan(picks.indexOf("archer-push-up") === -1 ? 99 : picks.indexOf("archer-push-up"));
  });

  it("can build a pull day for a bodyweight-only user (door rows)", () => {
    expect(mainSlugs(plan(["doorway"]), "pull")).toContain("doorway-row");
  });

  it("falls back to gym type for data without an equipment field (older rows)", () => {
    const legacy = EXERCISES.map((e) => ({ ...e, equipment: undefined }));
    const p = generateTrainingPlan({
      answers: ONBOARDING_ANSWERS_DEFAULT,
      trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, experience: "beginner", daysPerWeek: "3" },
      gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [], addCardio: false },
      exercises: legacy,
    });
    expect(p.weeks[0]!.days.some((d) => d.session && d.session.main.length > 0)).toBe(true);
  });
});
