import { describe, it, expect } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import {
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  GYM_EQUIPMENT_DEFAULT,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
  type GymEquipmentAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

// A small fixture standing in for the real 81-row `exercises` catalog —
// covers every muscle-group cluster the composer selects from, across both
// equipment settings used below, plus the fixed warm-up/cool-down slugs.
const EXERCISES: ExerciseRecord[] = [
  { slug: "jumping-jack", nameEn: "Jumping Jacks", nameZh: "開合跳", muscleGroups: ["cardio"], equipmentSettings: ["bodyweight_only", "large_gym"] },
  { slug: "high-knees", nameEn: "High Knees", nameZh: "高抬腿", muscleGroups: ["cardio"], equipmentSettings: ["bodyweight_only", "large_gym"] },
  { slug: "bodyweight-squat", nameEn: "Bodyweight Squat", nameZh: "徒手深蹲", muscleGroups: ["quads"], equipmentSettings: ["bodyweight_only", "large_gym"] },
  { slug: "plank", nameEn: "Plank", nameZh: "棒式", muscleGroups: ["core"], equipmentSettings: ["bodyweight_only", "large_gym"] },
  { slug: "glute-bridge", nameEn: "Glute Bridge", nameZh: "臀橋", muscleGroups: ["glutes"], equipmentSettings: ["bodyweight_only", "large_gym"] },
  { slug: "push-up", nameEn: "Push-Up", nameZh: "伏地挺身", muscleGroups: ["chest", "triceps"], equipmentSettings: ["bodyweight_only"] },
  { slug: "pull-up", nameEn: "Pull-Up", nameZh: "引體向上", muscleGroups: ["back", "biceps"], equipmentSettings: ["bodyweight_only"] },
  { slug: "walking-lunge", nameEn: "Walking Lunge", nameZh: "走動式弓箭步", muscleGroups: ["quads", "glutes"], equipmentSettings: ["bodyweight_only"] },
  { slug: "bench-press", nameEn: "Bench Press", nameZh: "臥推", muscleGroups: ["chest", "shoulders"], equipmentSettings: ["large_gym"] },
  { slug: "lat-pulldown", nameEn: "Lat Pulldown", nameZh: "滑輪下拉", muscleGroups: ["back", "biceps"], equipmentSettings: ["large_gym"] },
  { slug: "leg-press", nameEn: "Leg Press", nameZh: "腿推機", muscleGroups: ["quads", "glutes"], equipmentSettings: ["large_gym"] },
  { slug: "cycling", nameEn: "Stationary Bike", nameZh: "室內飛輪", muscleGroups: ["cardio"], equipmentSettings: ["large_gym"] },
];

const ANSWERS: OnboardingAnswers = { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", gender: "male", age: 30, heightCm: 175, weightKg: 75 };
const TRAINING: TrainingPreferencesAnswers = { ...TRAINING_PREFERENCES_DEFAULT, experience: "intermediate", daysPerWeek: "3", workoutSplit: "ppl_full_body", durationMin: 45 };
const GYM: GymEquipmentAnswers = { ...GYM_EQUIPMENT_DEFAULT, gymType: "bodyweight_only" };

describe("generateTrainingPlan", () => {
  it("generates exactly 4 weeks of 7 days each, with no drip-release", () => {
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: TRAINING,
      gymEquipment: GYM,
      exercises: EXERCISES,
    });
    expect(plan.weeks).toHaveLength(4);
    for (const week of plan.weeks) expect(week.days).toHaveLength(7);
  });

  it("is deterministic: identical inputs produce a byte-identical plan", () => {
    const a = generateTrainingPlan({ answers: ANSWERS, trainingPreferences: TRAINING, gymEquipment: GYM, exercises: EXERCISES });
    const b = generateTrainingPlan({ answers: ANSWERS, trainingPreferences: TRAINING, gymEquipment: GYM, exercises: EXERCISES });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("keeps the exercise list stable when variety is fixed, and does not stamp an effort target", () => {
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, variety: "fixed" },
      gymEquipment: GYM,
      exercises: EXERCISES,
    });
    const mainSlugs = (w: number) => plan.weeks[w]!.days.flatMap((d) => d.session?.main.map((e) => e.slug) ?? []);
    expect(mainSlugs(0).length).toBeGreaterThan(0);
    expect(mainSlugs(2)).toEqual(mainSlugs(0));
    const first = plan.weeks[0]!.days.find((d) => d.session)!.session!.main[0]!;
    expect(first).not.toHaveProperty("rirTarget");
  });

  it("respects the chosen training frequency's rest-day pattern", () => {
    const twoDay = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, daysPerWeek: "2" },
      gymEquipment: GYM,
      exercises: EXERCISES,
    });
    const trainingDays = twoDay.weeks[0]!.days.filter((d) => !d.isRestDay);
    expect(trainingDays).toHaveLength(2);

    const everyDay = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, daysPerWeek: "every_day" },
      gymEquipment: GYM,
      exercises: EXERCISES,
    });
    expect(everyDay.weeks[0]!.days.every((d) => !d.isRestDay)).toBe(true);
  });

  it("trains on the user's selected weekdays when given", () => {
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, daysPerWeek: "3", trainingDays: [1, 3, 5] },
      gymEquipment: GYM,
      exercises: EXERCISES,
    });
    const days = plan.weeks[0]!.days.filter((d) => !d.isRestDay).map((d) => d.dayIndex);
    expect(days).toEqual([1, 3, 5]);
  });

  it("varies by equipment setting: bodyweight-only and large-gym pick different exercises", () => {
    const bodyweight = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: TRAINING,
      gymEquipment: { ...GYM, gymType: "bodyweight_only" },
      exercises: EXERCISES,
    });
    const largeGym = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: TRAINING,
      gymEquipment: { ...GYM, gymType: "large_gym" },
      exercises: EXERCISES,
    });
    expect(JSON.stringify(bodyweight)).not.toEqual(JSON.stringify(largeGym));
  });

  it("varies by workout split: PPL+full-body and PPL+upper-body diverge on the 4th training day", () => {
    // Both splits share the same first 3 slots (push, pull, legs) — the
    // difference only shows up once a week has a 4th training day.
    const fullBody = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, workoutSplit: "ppl_full_body", daysPerWeek: "4" },
      gymEquipment: { ...GYM, gymType: "large_gym" },
      exercises: EXERCISES,
    });
    const upperBody = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, workoutSplit: "ppl_upper_body", daysPerWeek: "4" },
      gymEquipment: { ...GYM, gymType: "large_gym" },
      exercises: EXERCISES,
    });
    expect(JSON.stringify(fullBody)).not.toEqual(JSON.stringify(upperBody));
  });

  it("varies sets/reps/rest by experience level", () => {
    const beginner = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, experience: "basic" },
      gymEquipment: { ...GYM, gymType: "large_gym" },
      exercises: EXERCISES,
    });
    const advanced = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: { ...TRAINING, experience: "advanced" },
      gymEquipment: { ...GYM, gymType: "large_gym" },
      exercises: EXERCISES,
    });
    const beginnerMain = beginner.weeks[0]!.days.find((d) => d.session)!.session!.main[0]!;
    const advancedMain = advanced.weeks[0]!.days.find((d) => d.session)!.session!.main[0]!;
    expect(beginnerMain.sets).not.toEqual(advancedMain.sets);
  });

  it("inserts a cardio block only when addCardio is true, at the chosen placement", () => {
    const withCardio = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: TRAINING,
      gymEquipment: {
        ...GYM,
        gymType: "large_gym",
        addCardio: true,
        cardioPlacement: "start",
        cardioTypes: ["cycling_stationary"],
      },
      exercises: EXERCISES,
    });
    const withoutCardio = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: TRAINING,
      gymEquipment: { ...GYM, gymType: "large_gym", addCardio: false },
      exercises: EXERCISES,
    });
    const trainingDay = withCardio.weeks[0]!.days.find((d) => d.session)!;
    expect(trainingDay.session!.cardio).not.toBeNull();
    expect(trainingDay.session!.cardio!.placement).toBe("start");
    expect(trainingDay.session!.cardio!.exercise.slug).toBe("cycling");

    const trainingDayNoCardio = withoutCardio.weeks[0]!.days.find((d) => d.session)!;
    expect(trainingDayNoCardio.session!.cardio).toBeNull();
  });
});
