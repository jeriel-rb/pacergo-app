import { describe, it, expect } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import { longestConsecutiveRun, recommendSplit } from "../plan/split-recommendation";
import { experienceFit, exerciseModality } from "../plan/exercise-fit";
import { upgradeLegacyEquipment } from "../onboarding/equipment-catalog";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_EQUIPMENT,
  TRAINING_PREFERENCES_DEFAULT,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

const ANSWERS: OnboardingAnswers = { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", age: 30, heightCm: 180, weightKg: 80 };
const TP: TrainingPreferencesAnswers = {
  ...TRAINING_PREFERENCES_DEFAULT,
  experience: "advanced",
  daysPerWeek: "4",
  trainingDays: [0, 1, 3, 4],
  durationMin: 60,
  variety: "fixed",
};
const LARGE_GYM: GymEquipmentAnswers = { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [...ONBOARDING_EQUIPMENT] };

const rec = (over: { answers?: Partial<OnboardingAnswers>; tp?: Partial<TrainingPreferencesAnswers>; ge?: Partial<GymEquipmentAnswers> }) =>
  recommendSplit({
    answers: { ...ANSWERS, ...over.answers },
    trainingPreferences: { ...TP, ...over.tp },
    gymEquipment: { ...LARGE_GYM, ...over.ge },
  });

describe("recommendSplit", () => {
  it("uses weekly frequency", () => {
    expect(rec({ tp: { daysPerWeek: "2", trainingDays: [1, 3] } }).split).toBe("full_body");
    expect(rec({ tp: { daysPerWeek: "5", trainingDays: [0, 1, 2, 3, 4] } }).split).toBe("ppl_upper_lower");
    expect(rec({ tp: { daysPerWeek: "6", trainingDays: [0, 1, 2, 3, 4, 5] } }).split).toBe("push_pull_legs");
  });

  it("uses experience: advanced muscle-builders get PPL + upper on 4 days, beginners upper/lower", () => {
    expect(rec({}).split).toBe("ppl_upper");
    expect(rec({ tp: { experience: "basic" } }).split).toBe("upper_lower");
  });

  it("uses the goal", () => {
    expect(rec({ tp: { daysPerWeek: "3", trainingDays: [0, 2, 4], experience: "intermediate" } }).split).toBe(
      "push_pull_legs",
    );
    expect(
      rec({ answers: { goal: "lose_weight" }, tp: { daysPerWeek: "3", trainingDays: [0, 2, 4], experience: "intermediate" } })
        .split,
    ).toBe("full_body");
  });

  it("uses the selected days: back-to-back days avoid repeated full-body sessions", () => {
    const spread = rec({ tp: { daysPerWeek: "3", trainingDays: [0, 2, 4], experience: "basic" } });
    const together = rec({ tp: { daysPerWeek: "3", trainingDays: [0, 1, 2], experience: "basic" } });
    expect(spread.split).toBe("full_body");
    expect(together.split).toBe("upper_lower");
    expect(together.consecutiveDays).toBe(true);
  });

  it("uses equipment: limited kits avoid body-part splits", () => {
    const r = rec({ ge: { gymType: "bodyweight_only", equipment: ["chair"] } });
    expect(r.split).toBe("upper_lower");
    expect(r.limitedEquipment).toBe(true);
  });

  it("treats Sunday → Monday as consecutive", () => {
    expect(longestConsecutiveRun([5, 6, 0])).toBe(3);
    expect(longestConsecutiveRun([0, 2, 4])).toBe(1);
  });
});

// Shoulder (lateral raise) and chest fixtures across equipment types.
const EX: ExerciseRecord[] = [
  { slug: "jumping-jack", nameEn: "Jumping Jacks", nameZh: "開合跳", muscleGroups: ["cardio"], equipmentSettings: [], equipment: [] },
  { slug: "machine-lateral-raise", nameEn: "Machine Lateral Raise", nameZh: "", muscleGroups: ["shoulders"], equipmentSettings: [], equipment: ["lateral_raise_machine"] },
  { slug: "cable-lateral-raise", nameEn: "Cable Lateral Raise", nameZh: "", muscleGroups: ["shoulders"], equipmentSettings: [], equipment: ["cable_machine"] },
  { slug: "dumbbell-lateral-raise", nameEn: "Dumbbell Lateral Raise", nameZh: "", muscleGroups: ["shoulders"], equipmentSettings: [], equipment: ["dumbbells"] },
  { slug: "banded-lateral-raise", nameEn: "Band Lateral Raise", nameZh: "", muscleGroups: ["shoulders"], equipmentSettings: [], equipment: ["resistance_bands"] },
  { slug: "bench-press", nameEn: "Bench Press", nameZh: "", muscleGroups: ["chest", "triceps", "shoulders"], equipmentSettings: [], equipment: ["barbell"] },
  { slug: "machine-chest-press", nameEn: "Machine Chest Press", nameZh: "", muscleGroups: ["chest", "triceps"], equipmentSettings: [], equipment: ["chest_press_machine"] },
  { slug: "push-up", nameEn: "Push-Up", nameZh: "", muscleGroups: ["chest", "triceps"], equipmentSettings: [], equipment: [] },
  { slug: "resistance-band-clamshell", nameEn: "Band Clamshell", nameZh: "", muscleGroups: ["glutes"], equipmentSettings: [], equipment: ["resistance_bands"] },
  { slug: "hip-thrust", nameEn: "Hip Thrust", nameZh: "", muscleGroups: ["glutes", "hamstrings"], equipmentSettings: [], equipment: ["barbell"] },
  { slug: "leg-press", nameEn: "Leg Press", nameZh: "", muscleGroups: ["quads", "glutes"], equipmentSettings: [], equipment: ["leg_press"] },
];

const mainSlugs = (experience: TrainingPreferencesAnswers["experience"], ge: GymEquipmentAnswers = LARGE_GYM) => {
  const plan = generateTrainingPlan({
    answers: ANSWERS,
    trainingPreferences: { ...TP, experience, daysPerWeek: "2", trainingDays: [1, 3], workoutSplit: "full_body" },
    gymEquipment: ge,
    exercises: EX,
  });
  return plan.weeks[0]!.days.find((d) => d.session)!.session!.main.map((e) => e.slug);
};

describe("experience-aware exercise selection", () => {
  it("ranks loaded compound lifts above bands for advanced lifters", () => {
    expect(experienceFit(EX[5]!, "advanced")).toBeGreaterThan(experienceFit(EX[8]!, "advanced"));
    const slugs = mainSlugs("advanced");
    expect(slugs[0]).toBe("bench-press");
    expect(slugs).not.toContain("resistance-band-clamshell");
  });

  it("gives beginners and advanced lifters different exercises, not just more sets", () => {
    expect(mainSlugs("no_experience")).not.toEqual(mainSlugs("advanced"));
    expect(mainSlugs("no_experience")).not.toContain("bench-press");
  });

  it("still uses band/bodyweight work when nothing loaded is available", () => {
    const slugs = mainSlugs("advanced", { ...GYM_EQUIPMENT_DEFAULT, gymType: "bodyweight_only", equipment: ["resistance_bands"] });
    expect(slugs).toContain("push-up");
    expect(slugs.every((s) => !["bench-press", "leg-press", "hip-thrust"].includes(s))).toBe(true);
  });

  it("classifies loading from equipment", () => {
    expect(exerciseModality(EX[1]!)).toBe("machine");
    expect(exerciseModality(EX[4]!)).toBe("band");
    expect(exerciseModality(EX[7]!)).toBe("bodyweight");
  });
});

describe("equipment is a hard constraint with substitution", () => {
  it("never picks a deselected machine and substitutes the same muscle", () => {
    const noLateralMachine = { ...LARGE_GYM, equipment: LARGE_GYM.equipment.filter((e) => e !== "lateral_raise_machine") };
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TP, workoutSplit: "push_pull_legs", daysPerWeek: "3", trainingDays: [0, 2, 4] },
      gymEquipment: noLateralMachine,
      exercises: EX,
    });
    const all = plan.weeks.flatMap((w) => w.days.flatMap((d) => d.session?.main.map((e) => e.slug) ?? []));
    expect(all).not.toContain("machine-lateral-raise");
    expect(all.some((s) => s === "cable-lateral-raise" || s === "dumbbell-lateral-raise")).toBe(true);
  });

  it("carries selections saved before a machine was split out", () => {
    const old = upgradeLegacyEquipment({ ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: ["shoulder_press_machine", "dumbbells", "barbell", "bench", "cable_machine"] });
    expect(old.equipment).toContain("lateral_raise_machine");
    const current = upgradeLegacyEquipment({ ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: ["shoulder_press_machine", "chest_supported_row_machine"] });
    expect(current.equipment).not.toContain("lateral_raise_machine");
  });
});

describe("generator follows the recommended split when none is stored", () => {
  it("uses recommendSplit for ai_custom / unset", () => {
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TP, workoutSplit: null },
      gymEquipment: LARGE_GYM,
      exercises: EX,
    });
    const focuses = plan.weeks[0]!.days.filter((d) => d.session).map((d) => d.session!.focus);
    expect(focuses).toEqual(["push", "pull", "legs", "upper"]);
  });
});
