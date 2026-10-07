import { describe, expect, it } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import { ADVANCED_SKILL_SLUGS, ISOLATION_SLUGS, exerciseDifficulty, TIMED_SLUGS, repsForExercise, suitsExperience } from "../plan/exercise-meta";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type OnboardingExperience,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

const rec = (slug: string, muscleGroups: string[], equipment: string[] = []): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups,
  equipmentSettings: ["large_gym"],
  equipment,
  hasInstructions: true,
  hasIllustration: true,
});

const LIB = [
  rec("jumping-jack", ["cardio"]),
  rec("high-knees", ["cardio"]),
  rec("bodyweight-squat", ["quads"]),
  // push
  rec("bench-press", ["chest", "triceps", "shoulders"], ["barbell"]),
  rec("incline-bench-press", ["upper_chest", "shoulders", "triceps"], ["barbell"]),
  rec("decline-bench-press", ["lower_chest", "triceps"], ["barbell"]),
  rec("overhead-press", ["shoulders", "triceps"], ["barbell"]),
  rec("front-raise", ["shoulders", "chest"], ["dumbbells"]),
  rec("lateral-raise", ["shoulders", "upper_back"], ["dumbbells"]),
  rec("close-grip-bench-press", ["triceps", "chest"], ["barbell"]),
  rec("tricep-pushdown", ["triceps"], ["cable_machine"]),
  // legs
  rec("squat", ["quads", "glutes"], ["barbell"]),
  rec("romanian-deadlift", ["hamstrings", "glutes"], ["barbell"]),
  rec("standing-calf-raise", ["calves"], ["calf_machine"]),
  rec("dragon-flag", ["lower_abs", "core"], ["bench"]),
  rec("plank", ["core", "abs"]),
  rec("dead-hang", ["forearms", "lats"], ["pull_up_bar"]),
];
const KIT = ["barbell", "dumbbells", "cable_machine", "calf_machine", "bench", "pull_up_bar"] as const;

const plan = (experience: OnboardingExperience, split: "push_pull_legs" | "full_body" = "push_pull_legs", count = 5) =>
  generateTrainingPlan({
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience,
      daysPerWeek: "3",
      trainingDays: [0, 2, 4],
      workoutSplit: split,
      durationMin: count >= 5 ? 60 : 45,
      variety: "fixed",
    },
    gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [...KIT] as never, addCardio: false },
    exercises: LIB,
  });

const day = (p: ReturnType<typeof plan>, focus: string) =>
  p.weeks[0]!.days.find((d) => d.session?.focus === focus)!.session!;
const everything = (p: ReturnType<typeof plan>) =>
  p.weeks.flatMap((w) => w.days.flatMap((d) => d.session?.main ?? []));

describe("exercise suitability by experience", () => {
  it("never gives advanced-skill moves to beginners or people with no experience", () => {
    for (const level of ["no_experience", "beginner"] as const) {
      const slugs = everything(plan(level, "full_body")).map((e) => e.slug);
      for (const skill of ADVANCED_SKILL_SLUGS) expect(slugs, `${level}: ${skill}`).not.toContain(skill);
    }
  });

  it("still allows them for advanced lifters", () => {
    expect(suitsExperience("dragon-flag", "advanced")).toBe(true);
    expect(suitsExperience("dragon-flag", "intermediate")).toBe(true);
    expect(suitsExperience("dragon-flag", "beginner")).toBe(false);
    expect(suitsExperience("bench-press", "no_experience")).toBe(true);
  });
});

describe("difficulty by experience level", () => {
  const rank = (slug: string) => exerciseDifficulty(slug);
  const calves = [
    rec("standing-calf-raise", ["calves"], ["calf_machine"]),
  ];
  const DIFFICULTY_LIB = [
    ...LIB,
    ...calves,
    rec("leg-press", ["quads"], ["leg_press"]),
    rec("goblet-squat", ["quads", "glutes"], ["dumbbells"]),
    rec("leg-curl", ["hamstrings"], ["leg_curl_machine"]),
    rec("machine-chest-press", ["chest", "triceps"], ["chest_press_machine"]),
    rec("machine-shoulder-press", ["shoulders", "triceps"], ["shoulder_press_machine"]),
    rec("lat-pulldown", ["lats", "biceps"], ["lat_pulldown"]),
    rec("seated-row", ["back", "biceps"], ["cable_machine"]),
    rec("pull-up", ["lats", "biceps"], ["pull_up_bar"]),
    rec("pec-deck", ["chest"], ["pec_deck"]),
    rec("cable-lateral-raise", ["shoulders"], ["cable_machine"]),
    rec("rope-tricep-pushdown", ["triceps"], ["cable_machine"]),
    rec("cable-curl", ["biceps"], ["cable_machine"]),
    rec("seated-leg-curl", ["hamstrings"], ["leg_curl_machine"]),
    rec("hip-abduction-machine", ["glutes"], ["hip_machine"]),
  ];
  const withKit = (experience: OnboardingExperience, variety: "fixed" | "dynamic") =>
    generateTrainingPlan({
      answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
      trainingPreferences: {
        ...TRAINING_PREFERENCES_DEFAULT,
        experience,
        daysPerWeek: "3",
        trainingDays: [0, 2, 4],
        workoutSplit: "push_pull_legs",
        durationMin: 60,
        variety,
      },
      gymEquipment: {
        ...GYM_EQUIPMENT_DEFAULT,
        gymType: "large_gym",
        equipment: [...KIT, "leg_press", "leg_curl_machine", "chest_press_machine", "shoulder_press_machine", "lat_pulldown", "pec_deck", "hip_machine"] as never,
        addCardio: false,
      },
      exercises: DIFFICULTY_LIB,
    });

  it("classifies a pull-up as challenging and the standing calf raise as foundational", () => {
    expect(rank("pull-up")).toBe(3);
    expect(rank("standing-calf-raise")).toBe(1);
    expect(rank("some-new-unreviewed-move")).toBe(2);
  });

  it("keeps beginners on machines and cables when those are available", () => {
    for (const level of ["no_experience", "beginner"] as const) {
      const slugs = everything(withKit(level, "dynamic")).map((e) => e.slug);
      expect(slugs).toContain("machine-chest-press");
      expect(slugs).toContain("leg-press");
      expect(slugs).not.toContain("bench-press");
      expect(slugs).not.toContain("pull-up");
      expect(slugs).not.toContain("squat");
    }
  });

  it("uses a pull-up only when a beginner has no easier lat exercise", () => {
    const thin = [rec("push-up", ["chest"]), rec("pike-push-up", ["shoulders"]), rec("pull-up", ["lats"], ["pull_up_bar"])];
    const p = generateTrainingPlan({
      answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
      trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, experience: "beginner", daysPerWeek: "3", trainingDays: [0, 2, 4], workoutSplit: "push_pull_legs", variety: "fixed" },
      gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: ["pull_up_bar"] as never, addCardio: false },
      exercises: thin,
    });
    const slugs = everything(p).map((e) => e.slug);
    expect(slugs).toContain("pike-push-up");
    expect(slugs).toContain("push-up");
    expect(slugs).toContain("pull-up");
  });

  it("keeps the standing calf raise for a beginner", () => {
    expect(everything(withKit("beginner", "fixed")).map((e) => e.slug)).toContain("standing-calf-raise");
  });

  it("leads each level with a different kind of lift, not the same list", () => {
    const lead = (level: OnboardingExperience, focus: string) =>
      withKit(level, "fixed").weeks[0]!.days.find((d) => d.session?.focus === focus)!.session!.main[0]!.slug;
    expect(lead("beginner", "push")).toBe("machine-chest-press");
    expect(lead("beginner", "legs")).toBe("leg-press");
    expect(lead("intermediate", "push")).toBe("bench-press");
    expect(lead("advanced", "push")).toBe("bench-press");
    expect(lead("advanced", "legs")).toBe("squat");
    expect(lead("beginner", "push")).not.toBe(lead("advanced", "push"));
  });
});

describe("per-exercise prescription", () => {
  it("prescribes holds for time, not reps", () => {
    for (const slug of TIMED_SLUGS) expect(repsForExercise(slug, "6-10", "build_muscle"), slug).toBe("30-45 sec");
    const all = everything(plan("advanced", "full_body")).filter((e) => e.slug === "dead-hang" || e.slug === "plank");
    for (const e of all) expect(e.reps).toBe("30-45 sec");
  });

  it("trains single-joint work in a higher rep range than the heavy lifts", () => {
    const push = day(plan("advanced"), "push").main;
    const bySlug = Object.fromEntries(push.map((e) => [e.slug, e.reps]));
    expect(bySlug["bench-press"]).toBe("8-10");
    for (const slug of ISOLATION_SLUGS) if (bySlug[slug]) expect(bySlug[slug], slug).toBe("10-15");
    expect(repsForExercise("lateral-raise", "6-10", "lose_weight")).toBe("12-15");
  });
});

describe("push-day balance", () => {
  const push = day(plan("advanced"), "push").main.map((e) => e.slug);

  it("doesn't spend three slots on chest before reaching shoulders and triceps", () => {
    const chest = push.filter((s) => ["bench-press", "incline-bench-press", "decline-bench-press"].includes(s));
    expect(chest.length).toBeLessThanOrEqual(2);
    expect(push).toContain("overhead-press");
    expect(push.some((s) => s === "tricep-pushdown" || s === "close-grip-bench-press")).toBe(true);
  });

  it("adds shoulder isolation after the press, preferring lateral raises to front raises", () => {
    expect(push).toContain("lateral-raise");
    expect(push.indexOf("lateral-raise")).toBeGreaterThan(push.indexOf("overhead-press"));
    expect(push).not.toContain("front-raise");
  });
});
