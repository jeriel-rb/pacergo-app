import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../../onboarding/equipment-catalog";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingGymType,
  type TrainingPreferencesAnswers,
} from "../../onboarding/onboarding-types";
import { generateTrainingPlan } from "../../plan/generate-plan";
import type { GeneratedPlan } from "../../plan/generated-plan-types";
import { loadMigrationCatalog } from "../helpers/migration-catalog";

/**
 * Product-owner sessions. Each name is one profile we are willing to stand
 * behind. The expected file is the exact main-lift list for all four weeks,
 * generated from the real catalog. A change to selection has to update that
 * file on purpose.
 *
 * LiftMate's useful idea is here as a rule, not as their catalog: one slot
 * per pattern, and a trained lifter opens on the staple. The week axis is
 * ours. Their mandatory deload and their rep table are not copied.
 */
const CATALOG = loadMigrationCatalog();
const EXPECTED = JSON.parse(
  readFileSync(fileURLToPath(new URL("./expected-sessions.json", import.meta.url)), "utf8"),
) as Record<string, string[][]>;

function gym(type: OnboardingGymType): GymEquipmentAnswers {
  return {
    ...GYM_EQUIPMENT_DEFAULT,
    gymType: type,
    equipment: [...EQUIPMENT_PRESETS[type]],
    addCardio: false,
    cardioTypes: [],
  };
}

function answers(over: Partial<OnboardingAnswers>): OnboardingAnswers {
  return { ...ONBOARDING_ANSWERS_DEFAULT, age: 30, heightCm: 175, weightKg: 75, goal: "build_muscle", ...over };
}

function prefs(over: Partial<TrainingPreferencesAnswers>): TrainingPreferencesAnswers {
  return {
    ...TRAINING_PREFERENCES_DEFAULT,
    experience: "intermediate",
    daysPerWeek: "4",
    durationMin: 60,
    variety: "balanced",
    workoutSplit: "ai_custom",
    ...over,
  };
}

const PERSONAS = {
  "trained-chest": {
    answers: answers({ goal: "build_muscle" }),
    prefs: prefs({
      experience: "intermediate",
      prioritizeMuscles: true,
      prioritizedMuscles: ["middle_chest", "upper_chest"],
    }),
    gym: gym("large_gym"),
  },
  "novice-home": {
    answers: answers({ goal: "stay_healthy", obstacle: "never_tried" }),
    prefs: prefs({ experience: "beginner", daysPerWeek: "3", durationMin: 45 }),
    gym: gym("bodyweight_only"),
  },
  "basic-gym": {
    answers: answers({ goal: "build_muscle" }),
    prefs: prefs({ experience: "basic" }),
    gym: gym("large_gym"),
  },
  "advanced-fixed": {
    answers: answers({ goal: "build_muscle" }),
    prefs: prefs({ experience: "advanced", variety: "fixed" }),
    gym: gym("large_gym"),
  },
  "quads-excluded": {
    answers: answers({ goal: "build_muscle" }),
    prefs: prefs({
      experience: "basic",
      excludeMuscles: true,
      excludedMuscles: ["quadriceps"],
    }),
    gym: gym("large_gym"),
  },
} as const;

function sessions(plan: GeneratedPlan): string[][] {
  return plan.weeks.map((w) =>
    w.days.flatMap((d) => (d.session ? [`${d.dayIndex} ${d.session.focus}: ${d.session.main.map((e) => e.slug).join(", ")}`] : [])),
  );
}

describe("golden plans", () => {
  for (const [name, persona] of Object.entries(PERSONAS)) {
    it(name, () => {
      const plan = generateTrainingPlan({
        answers: persona.answers,
        trainingPreferences: persona.prefs,
        gymEquipment: persona.gym,
        exercises: CATALOG,
      });
      expect(sessions(plan)).toEqual(EXPECTED[name]);
    });
  }

  it("opens a trained chest plan on the barbell bench, and keeps a novice off it", () => {
    const trained = EXPECTED["trained-chest"]![0]![0]!;
    expect(trained.startsWith("0 upper: bench-press,")).toBe(true);
    const home = EXPECTED["novice-home"]!.flat().join(" ");
    expect(home.includes("bench-press")).toBe(false);
    expect(EXPECTED["basic-gym"]![0]![0]!.startsWith("0 upper: machine-chest-press,")).toBe(true);
  });

  it("drops squats and leg presses when the quads are excluded", () => {
    const text = EXPECTED["quads-excluded"]!.flat().join(" ");
    expect(text).not.toMatch(/(^|[, ])((front|hack|goblet|smith-machine)-)?squat/);
    expect(text).not.toMatch(/leg-press(?!-calf)/);
  });
});
