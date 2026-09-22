import { describe, expect, it } from "vitest";
import { MUSCLE_GROUP_TOKENS, PLAN_RULES_VERSION, generateTrainingPlan, needsLowImpact } from "../plan/generate-plan";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_MUSCLE_GROUPS,
  TRAINING_PREFERENCES_DEFAULT,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "../plan/generated-plan-types";

const ex = (slug: string, muscleGroups: string[], hasInstructions = true): ExerciseRecord => ({
  slug,
  nameEn: slug,
  nameZh: slug,
  muscleGroups,
  equipmentSettings: ["large_gym"],
  equipment: [],
  hasInstructions,
});

// A pool big enough that rotation and exclusion have something to work on.
const EXERCISES: ExerciseRecord[] = [
  ex("jumping-jack", ["cardio"]),
  ex("high-knees", ["cardio"]),
  ex("bodyweight-squat", ["quads", "glutes"]),
  ex("plank", ["core"]),
  ex("glute-bridge", ["glutes"]),
  // chest / push
  ex("a-bench-press", ["chest", "shoulders", "triceps"]),
  ex("b-incline-press", ["upper_chest", "shoulders"]),
  ex("c-dumbbell-fly", ["chest"]),
  ex("d-push-up", ["chest", "triceps"]),
  ex("e-cable-fly", ["chest"]),
  ex("f-overhead-press", ["shoulders", "triceps"]),
  ex("g-lateral-raise", ["shoulders"]),
  ex("h-tricep-pushdown", ["triceps"]),
  ex("i-dip", ["triceps", "chest"]),
  // pull
  ex("j-lat-pulldown", ["back", "biceps"]),
  ex("k-barbell-row", ["back", "biceps"]),
  ex("l-face-pull", ["rear_delts", "upper_back"]),
  ex("m-bicep-curl", ["biceps"]),
  // legs
  ex("n-squat", ["quads", "glutes", "core"]),
  ex("o-leg-press", ["quads", "glutes"]),
  ex("p-leg-curl", ["hamstrings"]),
  ex("q-calf-raise", ["calves"]),
  ex("r-lunge", ["quads", "glutes", "hamstrings"]),
  ex("s-hip-thrust", ["glutes", "hamstrings"]),
  ex("t-crunch", ["core"]),
  ex("u-stretch", ["mobility"]),
];

const ANSWERS: OnboardingAnswers = { ...ONBOARDING_ANSWERS_DEFAULT, goal: "stay_healthy" };
const PREFS: TrainingPreferencesAnswers = {
  ...TRAINING_PREFERENCES_DEFAULT,
  experience: "intermediate",
  daysPerWeek: "3",
  workoutSplit: "ppl_full_body",
  durationMin: 60,
  variety: "balanced",
};

const make = (a: Partial<OnboardingAnswers> = {}, p: Partial<TrainingPreferencesAnswers> = {}) =>
  generateTrainingPlan({
    answers: { ...ANSWERS, ...a },
    trainingPreferences: { ...PREFS, ...p },
    gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [], addCardio: false },
    exercises: EXERCISES,
  });

type Plan = ReturnType<typeof make>;
const mainOf = (plan: Plan, week: number, focus: string) =>
  plan.weeks[week]!.days.flatMap((d) => (d.session?.focus === focus ? d.session.main.map((e) => e.slug) : []));
const allMain = (plan: Plan) =>
  plan.weeks.flatMap((w) => w.days.flatMap((d) => d.session?.main.map((e) => e.slug) ?? []));
const firstSession = (plan: Plan) => plan.weeks[0]!.days.find((d) => d.session)!.session!;

describe("excluded muscles", () => {
  it("keeps exercises that work an excluded muscle out of every week", () => {
    const plan = make({}, { excludeMuscles: true, excludedMuscles: ["front_deltoid"] });
    const slugs = allMain(plan);
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) {
      expect(["a-bench-press", "b-incline-press", "f-overhead-press", "g-lateral-raise"]).not.toContain(s);
    }
  });

  it("ignores the list when the user answered No to excluding muscles", () => {
    const plan = make({}, { excludeMuscles: false, excludedMuscles: ["front_deltoid"] });
    expect(allMain(plan)).toContain("a-bench-press");
  });

  it("does not treat core as a reason to drop squats when abs are excluded", () => {
    const slugs = allMain(make({}, { excludeMuscles: true, excludedMuscles: ["abs"] }));
    expect(slugs).toContain("n-squat");
    expect(slugs).not.toContain("t-crunch");
  });

  it("maps every picker option to a token list", () => {
    for (const m of ONBOARDING_MUSCLE_GROUPS) expect(MUSCLE_GROUP_TOKENS[m], m).toBeDefined();
  });
});

describe("prioritized muscles", () => {
  it("puts the prioritized muscle's exercises first", () => {
    const plan = make({}, { prioritizeMuscles: true, prioritizedMuscles: ["front_deltoid"] });
    expect(mainOf(plan, 0, "push")[0]).toBe("f-overhead-press");
  });

  it("adds an extra exercise on sessions that train it, and only those", () => {
    const boosted = make({}, { prioritizeMuscles: true, prioritizedMuscles: ["front_deltoid"] });
    expect(mainOf(boosted, 0, "push").length).toBe(mainOf(make(), 0, "push").length + 1);
    expect(mainOf(boosted, 0, "legs").length).toBe(mainOf(make(), 0, "legs").length);
  });

  it("ignores the list when the user answered No", () => {
    expect(JSON.stringify(make({}, { prioritizeMuscles: false, prioritizedMuscles: ["front_deltoid"] }))).toEqual(
      JSON.stringify(make()),
    );
  });
});

describe("variety across the 4 weeks", () => {
  const weekly = (variety: TrainingPreferencesAnswers["variety"]) =>
    [0, 1, 2, 3].map((w) => mainOf(make({}, { variety }), w, "push"));

  it("fixed repeats the same exercises every week", () => {
    const [w1, ...rest] = weekly("fixed");
    for (const w of rest) expect(w).toEqual(w1);
  });

  it("balanced keeps some staples but rotates the rest", () => {
    const [w1, w2] = weekly("balanced") as [string[], string[]];
    expect(w2).not.toEqual(w1);
    const shared = w1.filter((s) => w2.includes(s));
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.length).toBeLessThan(w1.length);
  });

  it("dynamic changes more between weeks than balanced", () => {
    const overlap = (v: TrainingPreferencesAnswers["variety"]) => {
      const [w1, w2] = weekly(v) as [string[], string[]];
      return w1.filter((s) => w2.includes(s)).length;
    };
    expect(overlap("dynamic")).toBeLessThan(overlap("balanced"));
  });

  it("stays deterministic", () => {
    expect(JSON.stringify(make({}, { variety: "dynamic" }))).toEqual(JSON.stringify(make({}, { variety: "dynamic" })));
  });

  it("every week keeps the same day pattern", () => {
    const plan = make({}, { variety: "dynamic" });
    const pattern = plan.weeks[0]!.days.map((d) => d.isRestDay);
    for (const w of plan.weeks) expect(w.days.map((d) => d.isRestDay)).toEqual(pattern);
  });
});

describe("goal, obstacle and the options that shape volume", () => {
  const repsOf = (plan: Plan) => firstSession(plan).main[0]!.reps;

  it("goal sets the rep range", () => {
    expect(repsOf(make({ goal: "lose_weight" }))).toBe("12-15");
    expect(repsOf(make({ goal: "build_muscle" }, { experience: "advanced" }))).toBe("6-10");
    expect(repsOf(make({ goal: "build_muscle" }, { experience: "beginner" }))).toBe("10-12");
    expect(repsOf(make({ goal: "stay_healthy" }, { experience: "intermediate" }))).toBe("8-12");
  });

  it("experience sets the number of sets", () => {
    const sets = (experience: TrainingPreferencesAnswers["experience"]) =>
      firstSession(make({}, { experience })).main[0]!.sets;
    expect(sets("beginner")).toBeLessThan(sets("advanced"));
  });

  it("'lack of time' caps the main exercises even for long sessions", () => {
    const count = (o: OnboardingAnswers["obstacle"]) =>
      firstSession(make({ obstacle: o }, { durationMin: 90 })).main.length;
    expect(count("lack_of_time")).toBeLessThanOrEqual(4);
    expect(count(null)).toBeGreaterThan(4);
  });

  it("duration changes how many exercises a session has", () => {
    const count = (durationMin: number) => firstSession(make({}, { durationMin })).main.length;
    expect(count(90)).toBeGreaterThan(count(30));
  });

  it("days per week and split decide which days train and with what focus", () => {
    const trainingDays = (d: TrainingPreferencesAnswers["daysPerWeek"]) =>
      make({}, { daysPerWeek: d }).weeks[0]!.days.filter((x) => !x.isRestDay).length;
    expect(trainingDays("2")).toBe(2);
    expect(trainingDays("5")).toBe(5);
    expect(trainingDays("every_day")).toBe(7);
    const focuses = make({}, { workoutSplit: "ppl_upper_body", daysPerWeek: "4" })
      .weeks[0]!.days.filter((d) => d.session)
      .map((d) => d.session!.focus);
    expect(focuses).toEqual(["push", "pull", "legs", "upper"]);
  });
});

describe("finer muscle options", () => {
  it("excluding upper chest drops incline work but keeps flat pressing", () => {
    const slugs = allMain(make({}, { excludeMuscles: true, excludedMuscles: ["upper_chest"] }));
    expect(slugs).not.toContain("b-incline-press");
    expect(slugs).toContain("a-bench-press");
  });

  it("excluding middle chest keeps incline work (a different token)", () => {
    const slugs = allMain(make({}, { excludeMuscles: true, excludedMuscles: ["middle_chest"] }));
    expect(slugs).not.toContain("a-bench-press");
    expect(slugs).toContain("b-incline-press");
  });
});

describe("low-impact mode", () => {
  const POOL: ExerciseRecord[] = [
    ...EXERCISES,
    ex("v-jump-squat", ["quads", "glutes"]),
    ex("w-explosive-push-up", ["chest", "triceps"]),
  ];
  const build = (a: Partial<OnboardingAnswers>, cardio = false) =>
    generateTrainingPlan({
      answers: { ...ANSWERS, ...a },
      trainingPreferences: { ...PREFS, daysPerWeek: "every_day", variety: "dynamic" },
      gymEquipment: {
        ...GYM_EQUIPMENT_DEFAULT,
        gymType: "large_gym",
        equipment: [],
        addCardio: cardio,
        cardioTypes: cardio ? ["jump_rope", "rowing"] : [],
      },
      exercises: [...POOL, ex("jump-rope", ["cardio"]), ex("rowing", ["cardio"]), ex("arm-circles", ["mobility"]), ex("leg-swings-stretch", ["mobility"])],
    });

  const noImpact = (p: Plan) => {
    const slugs = allMain(p);
    expect(slugs.length).toBeGreaterThan(0);
    return !slugs.some((s) => /jump|explosive/.test(s));
  };

  it("is off by default: high-impact moves can appear", () => {
    expect(needsLowImpact({ ...ANSWERS })).toBe(false);
  });

  it("switches on for an injury, age 50+, or BMI 30+", () => {
    expect(needsLowImpact({ ...ANSWERS, obstacle: "injuries" })).toBe(true);
    expect(needsLowImpact({ ...ANSWERS, age: 49 })).toBe(false);
    expect(needsLowImpact({ ...ANSWERS, age: 50 })).toBe(true);
    expect(needsLowImpact({ ...ANSWERS, heightCm: 170, weightKg: 80 })).toBe(false); // BMI 27.7
    expect(needsLowImpact({ ...ANSWERS, heightCm: 170, weightKg: 90 })).toBe(true); // BMI 31.1
  });

  it("keeps jumping and explosive moves out of every session", () => {
    expect(noImpact(build({ obstacle: "injuries" }))).toBe(true);
    expect(noImpact(build({ age: 62 }))).toBe(true);
    expect(noImpact(build({ heightCm: 170, weightKg: 95 }))).toBe(true);
  });

  it("swaps the jumping warm-up for a gentle one and drops jump rope", () => {
    const plan = build({ obstacle: "injuries" }, true);
    const session = firstSession(plan);
    expect(session.warmup.map((e) => e.slug)).toEqual(["arm-circles", "leg-swings-stretch", "bodyweight-squat"]);
    const cardio = plan.weeks.flatMap((w) => w.days.map((d) => d.session?.cardio?.exercise.slug)).filter(Boolean);
    expect(cardio.length).toBeGreaterThan(0);
    expect(cardio).not.toContain("jump-rope");
  });

  it("uses lighter, higher-rep sets for an injury", () => {
    expect(firstSession(build({ obstacle: "injuries", goal: "build_muscle" })).main[0]!.reps).toBe("12-15");
  });
});

describe("plan rules version", () => {
  it("stamps every generated plan so older saved plans can be refreshed", () => {
    expect(make().rulesVersion).toBe(PLAN_RULES_VERSION);
  });
});

describe("progressive overload across the 4 weeks", () => {
  const setsInWeek = (plan: Plan, week: number) =>
    plan.weeks[week]!.days.flatMap((d) => d.session?.main.map((e) => e.sets) ?? []);

  it("adds one set to every main lift in weeks 3 and 4", () => {
    const plan = make();
    const base = setsInWeek(plan, 0);
    expect(base.length).toBeGreaterThan(0);
    expect(setsInWeek(plan, 1)).toEqual(base);
    expect(setsInWeek(plan, 2)).toEqual(base.map((s) => s + 1));
    expect(setsInWeek(plan, 3)).toEqual(base.map((s) => s + 1));
  });

  it("leaves warm-up, cool-down and cardio alone", () => {
    const plan = generateTrainingPlan({
      answers: ANSWERS,
      trainingPreferences: PREFS,
      gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym", equipment: [], addCardio: true, cardioTypes: ["treadmill"] },
      exercises: [...EXERCISES, ex("running", ["cardio"])],
    });
    for (const day of plan.weeks[3]!.days) {
      const s = day.session;
      if (!s) continue;
      for (const e of [...s.warmup, ...s.cooldown, ...(s.cardio ? [s.cardio.exercise] : [])]) expect(e.sets).toBe(1);
    }
  });

  it("stays flat for 'lack of time' and injuries, whose sessions shouldn't grow", () => {
    for (const obstacle of ["lack_of_time", "injuries"] as const) {
      const plan = make({ obstacle });
      expect(setsInWeek(plan, 3)).toEqual(setsInWeek(plan, 0));
    }
  });
});
