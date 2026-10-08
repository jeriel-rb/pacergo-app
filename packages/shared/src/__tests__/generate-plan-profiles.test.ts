import { describe, it, expect } from "vitest";
import { generateTrainingPlan, needsLowImpact, PLAN_RULES_VERSION } from "../plan/generate-plan";
import { QA_EXCLUDED_EXERCISES } from "../plan/exercise-qa";
import { STRETCH_LIBRARY } from "../plan/stretch-library";
import { ADVANCED_SKILL_SLUGS } from "../plan/exercise-meta";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_EXPERIENCES,
  ONBOARDING_GOALS,
  ONBOARDING_OBSTACLES,
  ONBOARDING_VARIETIES,
  REST_TIMER_MAX_SEC,
  REST_TIMER_MIN_SEC,
  TRAINING_PREFERENCES_DEFAULT,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingEquipment,
  type OnboardingExperience,
  type TrainingPreferencesAnswers,
  type TrainingSplit,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord, GeneratedPlan } from "../plan/generated-plan-types";

// ── A synthetic catalog that mirrors the real one's shape ──────────────────
// Every main muscle has several exercises across equipment tiers, plus a few
// high-impact, advanced-skill and QA-excluded moves to prove they get filtered.
const ex = (
  slug: string,
  muscles: string[],
  equipment: string[],
  extra: Partial<ExerciseRecord> = {},
): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups: muscles,
  equipmentSettings: [],
  equipment,
  hasInstructions: true,
  hasIllustration: true,
  ...extra,
});

const MAIN: ExerciseRecord[] = [
  // chest
  ex("barbell-bench-press", ["chest", "triceps", "shoulders"], ["barbell", "bench"]),
  ex("dumbbell-bench-press", ["chest", "triceps"], ["dumbbells", "bench"]),
  ex("push-up", ["chest", "triceps"], []),
  ex("cable-fly", ["chest"], ["cable_machine"]),
  ex("incline-push-up", ["upper_chest", "triceps"], []),
  // back
  ex("barbell-row", ["back", "biceps"], ["barbell"]),
  ex("dumbbell-row", ["back", "biceps"], ["dumbbells"]),
  ex("pull-up", ["lats", "biceps"], ["pull_up_bar"]),
  ex("inverted-row", ["back", "biceps"], []),
  ex("lat-pulldown", ["lats", "biceps"], ["cable_machine"]),
  // shoulders / arms
  ex("overhead-press", ["shoulders", "triceps"], ["barbell"]),
  ex("dumbbell-lateral-raise", ["shoulders"], ["dumbbells"]),
  ex("pike-push-up", ["shoulders", "triceps"], []),
  ex("rear-delt-fly", ["rear_delts"], ["dumbbells"]),
  ex("dumbbell-curl", ["biceps"], ["dumbbells"]),
  ex("chin-up", ["biceps", "lats"], ["pull_up_bar"]),
  ex("triceps-pushdown", ["triceps"], ["cable_machine"]),
  ex("bench-dip", ["triceps", "chest"], ["bench"]),
  // legs
  ex("barbell-squat", ["quads", "glutes", "hamstrings"], ["barbell", "squat_rack"]),
  ex("goblet-squat", ["quads", "glutes"], ["dumbbells", "kettlebell"]),
  ex("bodyweight-lunge", ["quads", "glutes"], []),
  ex("romanian-deadlift", ["hamstrings", "glutes"], ["barbell", "dumbbells"]),
  ex("glute-bridge-lift", ["glutes", "hamstrings"], []),
  ex("hip-thrust", ["glutes", "hamstrings"], ["barbell", "bench"]),
  ex("standing-calf-raise", ["calves"], []),
  ex("leg-curl", ["hamstrings"], ["leg_curl_machine"]),
  // core
  ex("crunch", ["abs", "core"], []),
  ex("hanging-leg-raise", ["lower_abs", "abs"], ["pull_up_bar"]),
  // high-impact — must vanish in low-impact mode
  ex("jump-squat", ["quads", "glutes"], []),
  ex("burpee", ["full_body", "chest"], []),
  ex("box-jump", ["quads", "glutes"], []),
  // advanced-skill — must vanish for beginners
  ...[...ADVANCED_SKILL_SLUGS].slice(0, 6).map((s) => ex(s, ["back", "biceps"], [])),
  // quality-gated — must never be selected
  ex("no-instructions-curl", ["biceps"], ["dumbbells"], { hasInstructions: false }),
  ex("no-art-row", ["back"], [], { hasIllustration: false }),
  ex("no-muscle-move", [], []),
  ...Object.keys(QA_EXCLUDED_EXERCISES).map((s) => ex(s, ["biceps", "chest", "back"], [])),
];
const WARMUP: ExerciseRecord[] = ["jumping-jack", "high-knees", "bodyweight-squat", "arm-circles", "leg-swings-stretch"].map(
  (s) => ex(s, ["cardio"], []),
);
const STRETCHES: ExerciseRecord[] = STRETCH_LIBRARY.map((s) => ex(s.slug, ["mobility"], s.slug === "doorway-chest-stretch" ? ["doorway"] : []));
const CARDIO: ExerciseRecord[] = ["running", "cycling", "rowing", "jump-rope"].map((s) =>
  ex(s, ["cardio"], [s === "running" ? "treadmill" : s === "cycling" ? "cycling_stationary" : s === "rowing" ? "rowing" : "jump_rope"]),
);
const CATALOG = [...MAIN, ...WARMUP, ...STRETCHES, ...CARDIO];

const ALL_EQUIPMENT: OnboardingEquipment[] = [...(GYM_EQUIPMENT_DEFAULT.equipment as OnboardingEquipment[])];

// ── Profile builders ───────────────────────────────────────────────────────
interface Profile {
  answers?: Partial<OnboardingAnswers>;
  prefs?: Partial<TrainingPreferencesAnswers>;
  gym?: Partial<GymEquipmentAnswers>;
}
function plan(p: Profile = {}, exercises: readonly ExerciseRecord[] = CATALOG): GeneratedPlan {
  return generateTrainingPlan({
    answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", gender: "male", age: 30, heightCm: 178, weightKg: 75, ...p.answers },
    trainingPreferences: {
      ...TRAINING_PREFERENCES_DEFAULT,
      experience: "intermediate",
      daysPerWeek: "4",
      workoutSplit: "upper_lower",
      variety: "balanced",
      durationMin: 60,
      ...p.prefs,
    },
    gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: ALL_EQUIPMENT, addCardio: false, ...p.gym },
    exercises,
  });
}

const sessions = (pl: GeneratedPlan) => pl.weeks.flatMap((w) => w.days.flatMap((d) => (d.session ? [d.session] : [])));
const mainSlugs = (pl: GeneratedPlan) => sessions(pl).flatMap((s) => s.main.map((e) => e.slug));
const allSlugs = (pl: GeneratedPlan) =>
  sessions(pl).flatMap((s) => [...s.warmup, ...s.main, ...s.cooldown, ...(s.cardio ? [s.cardio.exercise] : [])].map((e) => e.slug));
const bySlug = new Map(CATALOG.map((e) => [e.slug, e]));

describe("plan shape for every profile dimension", () => {
  it("always has 4 weeks × 7 days, the current rules version and the chosen duration", () => {
    for (const goal of ONBOARDING_GOALS)
      for (const experience of ONBOARDING_EXPERIENCES) {
        const p = plan({ answers: { goal }, prefs: { experience, durationMin: 45 } });
        expect(p.weeks).toHaveLength(4);
        p.weeks.forEach((w, i) => {
          expect(w.weekIndex).toBe(i + 1);
          expect(w.days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        });
        expect(p.rulesVersion).toBe(PLAN_RULES_VERSION);
        expect(p.sessionDurationMin).toBe(45);
      }
  });

  it("a bare default profile (nothing answered yet) still produces a valid plan", () => {
    const p = generateTrainingPlan({
      answers: ONBOARDING_ANSWERS_DEFAULT,
      trainingPreferences: TRAINING_PREFERENCES_DEFAULT,
      gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, equipment: [] },
      exercises: CATALOG,
    });
    expect(p.weeks).toHaveLength(4);
    expect(sessions(p).length).toBeGreaterThan(0);
    for (const s of sessions(p)) expect(s.main.length).toBeGreaterThan(0);
  });

  it.each(["2", "3", "4", "5", "6", "every_day"] as const)("trains the right number of days when frequency is %s", (daysPerWeek) => {
    const expected = daysPerWeek === "every_day" ? 7 : Number(daysPerWeek);
    const p = plan({ prefs: { daysPerWeek, trainingDays: [] } });
    for (const w of p.weeks) {
      expect(w.days.filter((d) => !d.isRestDay)).toHaveLength(expected);
      for (const d of w.days) expect(d.isRestDay).toBe(d.session === null);
    }
  });

  it.each<TrainingSplit>(["full_body", "upper_lower", "push_pull_legs", "ppl_upper", "ppl_upper_lower"])(
    "split %s cycles its day types in order",
    (workoutSplit) => {
      const p = plan({ prefs: { workoutSplit, daysPerWeek: "5" } });
      const focuses = p.weeks[0]!.days.filter((d) => d.session).map((d) => d.session!.focus);
      const seq: Record<TrainingSplit, string[]> = {
        full_body: ["full_body"],
        upper_lower: ["upper", "lower"],
        push_pull_legs: ["push", "pull", "legs"],
        ppl_upper: ["push", "pull", "legs", "upper"],
        ppl_upper_lower: ["push", "pull", "legs", "upper", "lower"],
      };
      focuses.forEach((f, i) => expect(f).toBe(seq[workoutSplit][i % seq[workoutSplit].length]));
    },
  );

  it("unset / ai_custom split falls back to a recommended one (never throws, never empty)", () => {
    for (const workoutSplit of [null, "ai_custom"] as const)
      expect(sessions(plan({ prefs: { workoutSplit } })).length).toBeGreaterThan(0);
  });
});

describe("goal, experience and obstacle drive the prescription", () => {
  const firstMain = (p: GeneratedPlan) => sessions(p)[0]!.main;

  it("sets scale with experience (Beginner ≠ Basic)", () => {
    const sets = (experience: OnboardingExperience) => firstMain(plan({ prefs: { experience } }))[0]!.sets;
    expect(sets("no_experience")).toBe(2);
    expect(sets("beginner")).toBe(3);
    expect(sets("intermediate")).toBe(3);
    expect(sets("advanced")).toBe(4);
  });

  it("fat-loss goes high-rep, injuries go high-rep, advanced muscle gain goes heavy", () => {
    const compoundReps = (p: Profile) => firstMain(plan(p))[0]!.reps; // the lead lift is a compound
    expect(compoundReps({ answers: { goal: "lose_weight" } })).toBe("12-15");
    expect(compoundReps({ answers: { goal: "build_muscle", obstacle: "injuries" } })).toBe("12-15");
    expect(compoundReps({ answers: { goal: "build_muscle" }, prefs: { experience: "advanced" } })).toBe("6-10");
  });

  it("mild set ramp only when eligible; novices and obstacles stay flat", () => {
    const mainSets = (p: GeneratedPlan, w: number) => p.weeks[w]!.days.flatMap((d) => d.session?.main.map((e) => e.sets) ?? []);
    const novice = plan({ prefs: { experience: "no_experience" } });
    expect(mainSets(novice, 3)).toEqual(mainSets(novice, 0));
    const intermediate = plan({ prefs: { experience: "intermediate" }, answers: { goal: "build_muscle" } });
    // Week 3 (index 2) may add a set; week 4 consolidates back for intermediate+.
    expect(mainSets(intermediate, 2)).toEqual(mainSets(intermediate, 0).map((s) => s + 1));
    expect(mainSets(intermediate, 3)).toEqual(mainSets(intermediate, 0));
    for (const obstacle of ["lack_of_time", "injuries"] as const) {
      const p = plan({ answers: { obstacle } });
      expect(mainSets(p, 3)).toEqual(mainSets(p, 0));
    }
  });

  it("session length controls exercise count (3–6, capped at 4 for lack_of_time)", () => {
    const count = (durationMin: number, obstacle: OnboardingAnswers["obstacle"] = null) =>
      Math.max(...sessions(plan({ answers: { obstacle }, prefs: { durationMin } })).map((s) => s.main.length));
    expect(count(15)).toBeGreaterThanOrEqual(3);
    expect(count(30)).toBeLessThanOrEqual(count(90));
    expect(count(120)).toBeLessThanOrEqual(7);
    expect(count(120, "lack_of_time")).toBeLessThanOrEqual(4);
  });

  it("every obstacle × goal × experience combination yields a complete plan", () => {
    for (const obstacle of ONBOARDING_OBSTACLES)
      for (const goal of ONBOARDING_GOALS)
        for (const experience of ONBOARDING_EXPERIENCES) {
          const p = plan({ answers: { obstacle, goal }, prefs: { experience } });
          for (const s of sessions(p)) {
            expect(s.main.length, `${obstacle}/${goal}/${experience}`).toBeGreaterThanOrEqual(3);
            expect(s.warmup.length, `${obstacle}/${goal}/${experience} warm-up`).toBe(2);
            expect(s.cooldown.length).toBeGreaterThan(0);
          }
        }
  });
});

describe("safety: low-impact mode", () => {
  const IMPACT = /jump|burpee/;

  it("triggers on injuries, age ≥ 50 and BMI ≥ 30, and nothing else", () => {
    const a = (o: Partial<OnboardingAnswers>) => ({ ...ONBOARDING_ANSWERS_DEFAULT, age: 30, heightCm: 178, weightKg: 75, ...o });
    expect(needsLowImpact(a({}))).toBe(false);
    expect(needsLowImpact(a({ obstacle: "injuries" }))).toBe(true);
    expect(needsLowImpact(a({ age: 49 }))).toBe(false);
    expect(needsLowImpact(a({ age: 50 }))).toBe(true);
    expect(needsLowImpact(a({ weightKg: 95, heightCm: 175 }))).toBe(true); // BMI 31
    expect(needsLowImpact(a({ weightKg: 91.5, heightCm: 175 }))).toBe(false); // BMI 29.9
    expect(needsLowImpact(a({ age: null, heightCm: null, weightKg: null }))).toBe(false);
  });

  it("strips every impact move and swaps in the gentle warm-up", () => {
    const profiles: Partial<OnboardingAnswers>[] = [{ obstacle: "injuries" }, { age: 62 }, { heightCm: 170, weightKg: 100 }];
    for (const answers of profiles) {
      const slugs = allSlugs(plan({ answers, gym: { addCardio: true, cardioTypes: ["jump_rope", "rowing"] } }));
      expect(slugs.filter((s) => IMPACT.test(s)), JSON.stringify(answers)).toEqual([]);
      expect(slugs).not.toContain("jumping-jack");
      expect(slugs).not.toContain("high-knees");
      expect(slugs).toContain("arm-circles");
    }
  });

  it("a healthy intermediate without machines may still get an impact Raise", () => {
    expect(
      allSlugs(
        plan({
          prefs: { experience: "intermediate" },
          answers: { goal: "build_muscle" },
          gym: { equipment: ["dumbbells", "bench", "barbell", "squat_rack"] },
        }),
      ),
    ).toContain("jumping-jack");
  });
});

describe("hard filters: equipment, experience, QA, excluded muscles", () => {
  it("equipment is a hard filter: only exercises the user can do are ever used", () => {
    const kits: OnboardingEquipment[][] = [[], ["dumbbells"], ["dumbbells", "bench"], ["barbell", "bench", "squat_rack"], ["pull_up_bar"], ALL_EQUIPMENT];
    for (const equipment of kits) {
      const have = new Set<string>(equipment);
      for (const slug of [...mainSlugs(plan({ gym: { equipment } })), ...allSlugs(plan({ gym: { equipment } }))]) {
        const need = bySlug.get(slug)!.equipment!;
        expect(need.length === 0 || need.some((n) => have.has(n)), `${slug} with [${equipment}]`).toBe(true);
      }
    }
  });

  it("bodyweight-only users never get a machine or free weight", () => {
    const slugs = mainSlugs(plan({ gym: { gymType: "bodyweight_only", equipment: [] } }));
    for (const s of slugs) expect(bySlug.get(s)!.equipment).toEqual([]);
  });

  it("beginners never get advanced-skill moves; advanced lifters may", () => {
    for (const experience of ["no_experience", "beginner"] as const)
      expect(mainSlugs(plan({ prefs: { experience } })).filter((s) => ADVANCED_SKILL_SLUGS.has(s))).toEqual([]);
  });

  it("never selects exercises that failed QA, lack instructions/illustration, or have no muscle mapping", () => {
    const banned = new Set([
      ...Object.keys(QA_EXCLUDED_EXERCISES),
      "no-instructions-curl",
      "no-art-row",
      "no-muscle-move",
    ]);
    for (const goal of ONBOARDING_GOALS)
      for (const variety of ONBOARDING_VARIETIES)
        expect(allSlugs(plan({ answers: { goal }, prefs: { variety, daysPerWeek: "every_day" } })).filter((s) => banned.has(s))).toEqual([]);
  });

  it("excluded muscles are honoured, with no exercise whose main muscle is excluded", () => {
    const p = plan({ prefs: { excludeMuscles: true, excludedMuscles: ["biceps", "middle_chest"], daysPerWeek: "5", workoutSplit: "push_pull_legs" } });
    for (const slug of mainSlugs(p)) {
      expect(bySlug.get(slug)!.muscleGroups[0], slug).not.toBe("biceps");
      expect(bySlug.get(slug)!.muscleGroups[0], slug).not.toBe("chest");
    }
  });

  it("excluded muscles are ignored when the toggle is off", () => {
    const withToggleOff = plan({ prefs: { excludeMuscles: false, excludedMuscles: ["biceps"] } });
    const baseline = plan();
    expect(JSON.stringify(withToggleOff)).toBe(JSON.stringify(baseline));
  });

  it("excluding abs does not strip squats (core is only secondary)", () => {
    const p = plan({ prefs: { excludeMuscles: true, excludedMuscles: ["abs"], workoutSplit: "push_pull_legs", daysPerWeek: "3" } });
    expect(mainSlugs(p).some((s) => /squat|lunge|bridge|deadlift/.test(s))).toBe(true);
  });
});

describe("priorities and variety", () => {
  it("a prioritized muscle leads its session and earns an extra exercise", () => {
    const base = plan({ prefs: { workoutSplit: "push_pull_legs", daysPerWeek: "3", durationMin: 60 } });
    const prio = plan({
      prefs: { workoutSplit: "push_pull_legs", daysPerWeek: "3", durationMin: 60, prioritizeMuscles: true, prioritizedMuscles: ["biceps"] },
    });
    const pull = (pl: GeneratedPlan) => sessions(pl).find((s) => s.focus === "pull")!;
    expect(pull(prio).main.length).toBeGreaterThanOrEqual(pull(base).main.length);
    expect(bySlug.get(pull(prio).main[0]!.slug)!.muscleGroups[0]).toBe("biceps");
  });

  it("'fixed' keeps week 1; 'balanced' steps to harder variations", () => {
    const pick = (variety: "fixed" | "balanced" | "dynamic") => {
      const p = plan({ prefs: { variety, workoutSplit: "push_pull_legs", daysPerWeek: "3", trainingDays: [], durationMin: 90 } });
      return p.weeks.map((w) => w.days.find((d) => d.session?.focus === "push")!.session!.main.map((e) => e.slug));
    };
    const fixed = pick("fixed");
    for (const w of fixed) expect(w).toEqual(fixed[0]);
    const balanced = pick("balanced");
    expect(balanced[0]).toEqual(fixed[0]);
    expect(JSON.stringify(balanced)).not.toEqual(JSON.stringify(fixed));
  });

  it("no session repeats an exercise within itself", () => {
    for (const variety of ONBOARDING_VARIETIES)
      for (const s of sessions(plan({ prefs: { variety, daysPerWeek: "every_day", workoutSplit: "ppl_upper_lower" } }))) {
        const slugs = s.main.map((e) => e.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
  });
});

describe("rest timer", () => {
  it("every rest is a 5-second multiple inside the user's range", () => {
    for (const [min, max] of [[30, 60], [60, 180], [120, 300], [REST_TIMER_MIN_SEC, REST_TIMER_MAX_SEC]] as const) {
      const p = plan({ prefs: { restTimerEnabled: true, restTimerMinSec: min, restTimerMaxSec: max } });
      for (const s of sessions(p))
        for (const e of [...s.main, ...s.warmup, ...s.cooldown]) {
          expect(e.restSec).toBeGreaterThanOrEqual(min);
          expect(e.restSec).toBeLessThanOrEqual(max);
          expect(e.restSec % 5).toBe(0);
        }
    }
  });

  it("light work rests at the minimum; with the timer off, main lifts stay within 60–180 s", () => {
    const on = plan({ prefs: { restTimerEnabled: true, restTimerMinSec: 45, restTimerMaxSec: 120 } });
    for (const s of sessions(on)) for (const e of [...s.warmup, ...s.cooldown]) expect(e.restSec).toBe(45);
    const off = plan({ prefs: { restTimerEnabled: false } });
    for (const s of sessions(off)) {
      for (const e of s.main) expect(e.restSec).toBeGreaterThanOrEqual(60), expect(e.restSec).toBeLessThanOrEqual(180);
      for (const e of s.warmup) expect(e.restSec).toBe(15);
    }
  });
});

describe("cardio and cooldown", () => {
  it("cardio appears only when requested, uses the chosen types and placement", () => {
    const none = plan({ gym: { addCardio: false, cardioTypes: ["rowing"] } });
    expect(sessions(none).every((s) => s.cardio === null)).toBe(true);
    const some = plan({ gym: { addCardio: true, cardioTypes: ["rowing", "cycling_stationary"], cardioPlacement: "start" } });
    for (const s of sessions(some)) {
      expect(s.cardio!.placement).toBe("start");
      expect(["rowing", "cycling"]).toContain(s.cardio!.exercise.slug);
    }
    expect(sessions(plan({ gym: { addCardio: true, cardioTypes: [] } })).every((s) => s.cardio === null)).toBe(true);
  });

  it("cooldowns are real stretches only, deduped, and short for short sessions", () => {
    const stretch = new Set(STRETCH_LIBRARY.map((s) => s.slug));
    for (const s of sessions(plan())) {
      const slugs = s.cooldown.map((e) => e.slug);
      expect(slugs.every((x) => stretch.has(x))).toBe(true);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.length).toBe(4);
    }
    for (const s of sessions(plan({ prefs: { durationMin: 30 } }))) expect(s.cooldown.length).toBeLessThanOrEqual(3);
    for (const s of sessions(plan({ answers: { obstacle: "lack_of_time" } }))) expect(s.cooldown.length).toBeLessThanOrEqual(3);
  });

  it("a stretch needing equipment the user lacks is dropped", () => {
    const withDoorway = allSlugs(plan({ gym: { equipment: ["doorway"] as unknown as OnboardingEquipment[] }, prefs: { workoutSplit: "push_pull_legs", daysPerWeek: "3" } }));
    const without = allSlugs(plan({ gym: { equipment: [] }, prefs: { workoutSplit: "push_pull_legs", daysPerWeek: "3" } }));
    expect(without).not.toContain("doorway-chest-stretch");
    expect(withDoorway.length).toBeGreaterThan(0);
  });
});

describe("determinism, purity and robustness", () => {
  it("is byte-identical across repeated runs for varied profiles", () => {
    for (const goal of ONBOARDING_GOALS)
      for (const experience of ONBOARDING_EXPERIENCES) {
        const p: Profile = { answers: { goal }, prefs: { experience } };
        expect(JSON.stringify(plan(p))).toBe(JSON.stringify(plan(p)));
      }
  });

  it("does not depend on catalog row order", () => {
    const shuffled = [...CATALOG].reverse();
    expect(JSON.stringify(plan({}, shuffled))).toBe(JSON.stringify(plan({}, CATALOG)));
  });

  it("does not mutate its inputs", () => {
    const frozen = CATALOG.map((e) => Object.freeze({ ...e, muscleGroups: Object.freeze([...e.muscleGroups]) as unknown as string[] }));
    expect(() => plan({}, frozen)).not.toThrow();
  });

  it("every exercise in the plan exists in the catalog and carries a valid prescription", () => {
    const p = plan({ gym: { addCardio: true, cardioTypes: ["rowing"] }, prefs: { daysPerWeek: "every_day" } });
    for (const slug of allSlugs(p)) expect(bySlug.has(slug), slug).toBe(true);
    for (const s of sessions(p))
      for (const e of [...s.main, ...s.warmup, ...s.cooldown]) {
        expect(e.sets).toBeGreaterThan(0);
        expect(e.reps.length).toBeGreaterThan(0);
        expect(e.restSec).toBeGreaterThan(0);
        expect(e.name.en).toBeTruthy();
      }
  });

  it("survives a catalog with nothing usable (returns structure, no crash)", () => {
    const p = plan({}, []);
    expect(p.weeks).toHaveLength(4);
    expect(sessions(p).every((s) => s.main.length === 0)).toBe(true);
  });

  it("survives a very small catalog without duplicating or throwing", () => {
    const tiny = [MAIN[0]!, MAIN[2]!, ...WARMUP];
    const p = plan({ gym: { equipment: ALL_EQUIPMENT } }, tiny);
    for (const s of sessions(p)) {
      const slugs = s.main.map((e) => e.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("tolerates legacy saved data: no variety/experience/duration, unknown split value", () => {
    const legacy = generateTrainingPlan({
      answers: ONBOARDING_ANSWERS_DEFAULT,
      trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, workoutSplit: "ppl_full_body", variety: null, experience: null, durationMin: null },
      gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "bodyweight_only", equipment: [] },
      exercises: CATALOG,
    });
    expect(legacy.sessionDurationMin).toBe(45);
    expect(sessions(legacy).length).toBeGreaterThan(0);
  });
});
