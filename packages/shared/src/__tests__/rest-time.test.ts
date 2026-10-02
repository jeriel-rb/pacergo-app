import { describe, expect, it } from "vitest";
import { generateTrainingPlan, restSecFor, lightWorkRestSec } from "../plan/generate-plan";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

const rec = (slug: string, muscleGroups: string[]): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups,
  equipmentSettings: ["large_gym", "bodyweight_only"],
});

const COMPOUND = rec("bench-press", ["chest", "shoulders", "triceps"]);
const ISOLATION = rec("bicep-curl", ["biceps"]);

const prefs = (min: number, max: number, enabled = true) => ({
  restTimerEnabled: enabled,
  restTimerMinSec: min,
  restTimerMaxSec: max,
});

describe("restSecFor", () => {
  it("gives heavy compound work a longer rest than light isolation work", () => {
    const heavy = restSecFor({ record: COMPOUND, reps: "6-10", goal: null, prefs: prefs(60, 180) });
    const light = restSecFor({ record: ISOLATION, reps: "12-15", goal: null, prefs: prefs(60, 180) });
    expect(heavy).toBeGreaterThan(light);
    expect(light).toBeLessThan(90);
    expect(heavy).toBeGreaterThan(120);
  });

  it("always lands inside the chosen range, on 5-second steps", () => {
    for (const reps of ["6-10", "8-12", "12-15"]) {
      for (const record of [COMPOUND, ISOLATION]) {
        for (const goal of [null, "lose_weight", "build_muscle"] as const) {
          for (const [min, max] of [[10, 170], [30, 60], [120, 300], [60, 180]] as const) {
            const rest = restSecFor({ record, reps, goal, prefs: prefs(min, max) });
            expect(rest).toBeGreaterThanOrEqual(min);
            expect(rest).toBeLessThanOrEqual(max);
            expect(rest % 5).toBe(0);
          }
        }
      }
    }
  });

  it("scales with the slider: a wider range spreads rests further apart", () => {
    const spread = (min: number, max: number) =>
      restSecFor({ record: COMPOUND, reps: "6-10", goal: null, prefs: prefs(min, max) }) -
      restSecFor({ record: ISOLATION, reps: "12-15", goal: null, prefs: prefs(min, max) });
    expect(spread(10, 300)).toBeGreaterThan(spread(60, 90));
  });

  it("collapses to a single value when min equals max", () => {
    expect(restSecFor({ record: COMPOUND, reps: "6-10", goal: null, prefs: prefs(90, 90) })).toBe(90);
    expect(restSecFor({ record: ISOLATION, reps: "12-15", goal: null, prefs: prefs(90, 90) })).toBe(90);
  });

  it("nudges by goal: muscle gain rests longer than fat loss", () => {
    const args = { record: COMPOUND, reps: "8-12", prefs: prefs(30, 240) };
    expect(restSecFor({ ...args, goal: "build_muscle" })).toBeGreaterThan(
      restSecFor({ ...args, goal: "lose_weight" }),
    );
  });

  it("with the timer off, suggests rests over the recommended 60–180 s", () => {
    const off = restSecFor({ record: COMPOUND, reps: "6-10", goal: null, prefs: prefs(10, 20, false) });
    expect(off).toBeGreaterThanOrEqual(60);
    expect(off).toBeLessThanOrEqual(180);
  });
});

describe("rest in a generated plan", () => {
  const EXERCISES: ExerciseRecord[] = [
    rec("jumping-jack", ["cardio"]),
    rec("high-knees", ["cardio"]),
    rec("bodyweight-squat", ["quads"]),
    rec("doorway-chest-stretch", ["mobility"]),
    rec("childs-pose", ["mobility"]),
    rec("cross-body-shoulder-stretch", ["mobility"]),
    rec("seated-forward-fold-stretch", ["mobility"]),
    rec("bench-press", ["chest", "shoulders", "triceps"]),
    rec("cable_fly", ["chest"]),
    rec("overhead-press", ["shoulders", "triceps"]),
    rec("lateral-raise", ["shoulders"]),
    rec("cycling", ["cardio"]),
  ];

  const plan = (tp: Partial<TrainingPreferencesAnswers>) =>
    generateTrainingPlan({
      answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle" },
      trainingPreferences: {
        ...TRAINING_PREFERENCES_DEFAULT,
        experience: "intermediate",
        daysPerWeek: "3",
        workoutSplit: "ppl_full_body",
        durationMin: 60,
        ...tp,
      },
      gymEquipment: {
        ...GYM_EQUIPMENT_DEFAULT,
        gymType: "large_gym",
        addCardio: true,
        cardioTypes: ["cycling_stationary"],
      },
      exercises: EXERCISES,
    });

  const firstSession = (p: ReturnType<typeof plan>) => p.weeks[0]!.days.find((d) => d.session)!.session!;

  it("varies rest between exercises in the same session, inside the range", () => {
    const main = firstSession(plan({ restTimerMinSec: 40, restTimerMaxSec: 200 })).main;
    const rests = main.map((e) => e.restSec);
    expect(new Set(rests).size).toBeGreaterThan(1);
    for (const r of rests) {
      expect(r).toBeGreaterThanOrEqual(40);
      expect(r).toBeLessThanOrEqual(200);
    }
  });

  it("changes when the slider changes", () => {
    const narrow = firstSession(plan({ restTimerMinSec: 60, restTimerMaxSec: 90 })).main.map((e) => e.restSec);
    const wide = firstSession(plan({ restTimerMinSec: 60, restTimerMaxSec: 300 })).main.map((e) => e.restSec);
    expect(Math.max(...wide)).toBeGreaterThan(Math.max(...narrow));
  });

  it("makes warm-up and cool-down follow the slider's shortest rest", () => {
    for (const min of [10, 30, 90]) {
      const s = firstSession(plan({ restTimerMinSec: min, restTimerMaxSec: 300 }));
      expect(s.warmup.length).toBeGreaterThan(0); // guard: the loop below must not be vacuous
      expect(s.cooldown.length).toBeGreaterThan(0);
      for (const e of [...s.warmup, ...s.cooldown]) expect(e.restSec).toBe(min);
    }
  });

  it("wires cardio to the rest timer too (shortest rest, never a hard-coded 0)", () => {
    for (const min of [10, 45, 90]) {
      const cardio = firstSession(plan({ restTimerMinSec: min, restTimerMaxSec: 300 })).cardio;
      expect(cardio?.exercise.restSec).toBe(min);
    }
    const off = firstSession(plan({ restTimerEnabled: false, restTimerMinSec: 90 })).cardio;
    expect(off?.exercise.restSec).toBe(15);
  });

  it("uses a short fixed pause for warm-up and cool-down when the timer is off", () => {
    const s = firstSession(plan({ restTimerEnabled: false, restTimerMinSec: 90 }));
    expect(s.warmup.length).toBeGreaterThan(0);
    for (const e of [...s.warmup, ...s.cooldown]) expect(e.restSec).toBe(15);
    expect(lightWorkRestSec({ restTimerEnabled: false, restTimerMinSec: 90 })).toBe(15);
  });

  it("tells barbell lifts, bodyweight moves and single-muscle work apart", () => {
    const p = { restTimerEnabled: true, restTimerMinSec: 10, restTimerMaxSec: 160 };
    const rest = (slug: string, muscles: string[]) =>
      restSecFor({ record: rec(slug, muscles), reps: "8-12", goal: "build_muscle", prefs: p });
    const barbellBench = rest("barbell_bench-press", ["chest", "shoulders", "triceps"]);
    const declinePushUp = rest("decline_push-up", ["chest", "shoulders", "triceps"]);
    const overheadPress = rest("barbell_overhead-press", ["shoulders", "triceps"]);
    const lateralRaise = rest("dumbbell_lateral-raise", ["shoulders"]);
    expect(barbellBench).toBeGreaterThan(declinePushUp);
    expect(barbellBench).toBeGreaterThan(overheadPress);
    expect(overheadPress).toBeGreaterThan(lateralRaise);
    expect(new Set([barbellBench, declinePushUp, overheadPress, lateralRaise]).size).toBe(4);
  });
});
