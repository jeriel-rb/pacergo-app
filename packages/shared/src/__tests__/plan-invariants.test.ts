import { describe, expect, it } from "vitest";
import {
  MUSCLE_GROUP_TOKENS,
  PLAN_RULES_VERSION,
  PLAN_SELECTABLE_MUSCLE_GROUPS,
  WARMUP_MOVE_COUNT,
  generateTrainingPlan,
  needsLowImpact,
} from "../plan/generate-plan";
import { exerciseDifficulty, ADVANCED_SKILL_SLUGS, ISOLATION_SLUGS } from "../plan/exercise-meta";
import { isAiEligible } from "../plan/exercise-qa";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_EXPERIENCES,
  ONBOARDING_GOALS,
  TRAINING_PREFERENCES_DEFAULT,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingExperience,
  type OnboardingMuscleGroup,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { ExerciseRecord, GeneratedPlan } from "../plan/generated-plan-types";
import { loadMigrationCatalog } from "./helpers/migration-catalog";

/**
 * Invariants checked against the real exercise catalog, read straight from the
 * generated block in backend/migrations/0001_init.sql (a hand-made catalog is
 * what let these slip through before). Every defect found in the
 * audit of saved plans has a check here: unreachable priorities, exclusions that
 * emptied a session, running prescribed to low-impact users, technical lifts
 * for novices, near-identical moves stacked in one session, long rests on
 * unloaded work.
 */
const CATALOG = loadMigrationCatalog();
const ELIGIBLE = CATALOG.filter(isAiEligible);
const BY_SLUG = new Map(CATALOG.map((e) => [e.slug, e]));
const mainMuscle = (slug: string) => BY_SLUG.get(slug)?.muscleGroups[0] ?? "";
const CHEST_FAMILY = new Set(["chest", "upper_chest", "lower_chest"]);

const FULL_GYM: GymEquipmentAnswers = {
  ...GYM_EQUIPMENT_DEFAULT,
  gymType: "large_gym",
  addCardio: true,
  cardioTypes: ["treadmill", "elliptical", "stair_climber"],
};
const HOME: GymEquipmentAnswers = {
  ...GYM_EQUIPMENT_DEFAULT,
  gymType: "bodyweight_only",
  equipment: ["chair", "towel", "doorway", "step_box"],
  addCardio: false,
  cardioTypes: [],
};

const BODIES: Record<string, Pick<OnboardingAnswers, "age" | "heightCm" | "weightKg">> = {
  typical: { age: 30, heightCm: 175, weightKg: 70 },
  heavy: { age: 37, heightCm: 180, weightKg: 103 }, // BMI 31.8 → low-impact
  senior: { age: 55, heightCm: 170, weightKg: 70 },
  underweight: { age: 25, heightCm: 168, weightKg: 52 }, // BMI 18.4
  severelyThin: { age: 25, heightCm: 168, weightKg: 45 }, // BMI 15.9
};

const answers = (over: Partial<OnboardingAnswers> = {}): OnboardingAnswers => ({
  ...ONBOARDING_ANSWERS_DEFAULT,
  goal: "build_muscle",
  ...BODIES.typical!,
  ...over,
});

const prefs = (over: Partial<TrainingPreferencesAnswers> = {}): TrainingPreferencesAnswers => ({
  ...TRAINING_PREFERENCES_DEFAULT,
  experience: "intermediate",
  daysPerWeek: "3",
  durationMin: 45,
  variety: "balanced",
  workoutSplit: "ai_custom",
  excludeMuscles: false,
  excludedMuscles: [],
  prioritizeMuscles: false,
  prioritizedMuscles: [],
  ...over,
});

const build = (a: OnboardingAnswers, p: TrainingPreferencesAnswers, g: GymEquipmentAnswers) =>
  generateTrainingPlan({ answers: a, trainingPreferences: p, gymEquipment: g, exercises: CATALOG });

const sessions = (plan: GeneratedPlan) =>
  plan.weeks.flatMap((w) => w.days.flatMap((d) => (d.session ? [d.session] : [])));
const mainSlugs = (plan: GeneratedPlan) => sessions(plan).flatMap((s) => s.main.map((e) => e.slug));
const cardioSlugs = (plan: GeneratedPlan) =>
  sessions(plan).flatMap((s) => (s.cardio ? [s.cardio.exercise.slug] : []));

const bmi = (b: { heightCm: number | null; weightKg: number | null }) => b.weightKg! / (b.heightCm! / 100) ** 2;

describe("catalog snapshot", () => {
  it("is the real catalog", () => {
    expect(CATALOG.length).toBeGreaterThan(250);
  });
});

describe("prioritised muscles are reachable", () => {
  // Muscles the picker offers, minus those with no AI-eligible exercise at all.
  const reachable = PLAN_SELECTABLE_MUSCLE_GROUPS.filter((m) =>
    ELIGIBLE.some((e) => MUSCLE_GROUP_TOKENS[m].includes(e.muscleGroups[0] ?? "")),
  );

  it("offers only muscles that have an exercise in the catalog", () => {
    const dead = PLAN_SELECTABLE_MUSCLE_GROUPS.filter((m) => !reachable.includes(m));
    expect(dead, `picker options with no exercises: ${dead.join(", ")}`).toEqual([]);
  });

  const SPLITS = ["full_body", "upper_lower", "push_pull_legs", "ppl_upper"] as const;
  for (const split of SPLITS) {
    it(`trains every prioritised muscle at least once a week on ${split}`, () => {
      const missed: string[] = [];
      for (const m of reachable) {
        const plan = build(
          answers(),
          prefs({
            workoutSplit: split,
            daysPerWeek: split === "full_body" ? "3" : "6",
            experience: "advanced",
            prioritizeMuscles: true,
            prioritizedMuscles: [m],
            durationMin: 60,
          }),
          FULL_GYM,
        );
        const tokens = new Set(MUSCLE_GROUP_TOKENS[m]);
        const week1 = plan.weeks[0]!.days.flatMap((d) => d.session?.main.map((e) => e.slug) ?? []);
        if (!week1.some((s) => tokens.has(mainMuscle(s)))) missed.push(m);
      }
      expect(missed, `never trained on ${split}`).toEqual([]);
    });
  }
});

describe("a prioritised single-joint muscle gets its own exercise, under every variety", () => {
  const cases: [OnboardingMuscleGroup, string, RegExp][] = [
    ["trapezius", "pull", /shrug/],
    ["middle_deltoid", "push", /lateral-raise|upright-row/],
    ["abductors", "legs", /abduction|lateral-walk|monster-walk|clamshell|fire-hydrant|side-lying/],
  ];
  for (const variety of ["fixed", "balanced", "dynamic"] as const) {
    for (const [muscle, focus, slug] of cases) {
      it(`${muscle} on ${variety}`, () => {
        const plan = build(
          answers(),
          prefs({
            experience: "advanced",
            variety,
            workoutSplit: "push_pull_legs",
            daysPerWeek: "3",
            durationMin: 60,
            prioritizeMuscles: true,
            prioritizedMuscles: [muscle],
          }),
          FULL_GYM,
        );
        for (const week of plan.weeks) {
          const day = week.days.find((d) => d.session?.focus === focus)!;
          expect(day.session!.main.some((e) => slug.test(e.slug)), `week ${week.weekIndex}`).toBe(true);
        }
      });
    }
  }
});

describe("excluded muscles do not wreck the session", () => {
  const exclude = (muscles: OnboardingMuscleGroup[], over: Partial<TrainingPreferencesAnswers> = {}) =>
    build(
      answers(),
      prefs({ excludeMuscles: true, excludedMuscles: muscles, experience: "advanced", durationMin: 60, ...over }),
      FULL_GYM,
    );

  it("keeps bench pressing when only the middle deltoid is excluded", () => {
    const plan = exclude(["middle_deltoid"], { workoutSplit: "push_pull_legs", daysPerWeek: "3" });
    const push = sessions(plan).filter((s) => s.focus === "push");
    for (const s of push) {
      expect(s.main.length).toBeGreaterThanOrEqual(3);
      expect(s.main.some((e) => CHEST_FAMILY.has(mainMuscle(e.slug)))).toBe(true);
      expect(s.main.some((e) => mainMuscle(e.slug) === "middle_delts")).toBe(false);
    }
  });

  it("keeps lateral raises when only the front deltoid is excluded", () => {
    const plan = exclude(["front_deltoid"], { workoutSplit: "push_pull_legs", daysPerWeek: "3" });
    const slugs = mainSlugs(plan);
    // The shoulders are still trained, but never with a press or front raise.
    expect(slugs.filter((s) => mainMuscle(s) === "shoulders")).toEqual([]);
    expect(slugs.some((s) => mainMuscle(s) === "middle_delts")).toBe(true);
  });

  it("still trains the legs when the glutes are excluded", () => {
    const plan = exclude(["glutes"], { workoutSplit: "upper_lower", daysPerWeek: "4" });
    for (const s of sessions(plan).filter((s) => s.focus === "lower")) {
      expect(s.main.length).toBeGreaterThanOrEqual(3);
      expect(s.main.some((e) => ["quads", "hamstrings"].includes(mainMuscle(e.slug)))).toBe(true);
      expect(s.main.some((e) => mainMuscle(e.slug) === "glutes")).toBe(false);
    }
  });

  it("never selects an exercise whose main muscle is excluded", () => {
    for (const m of PLAN_SELECTABLE_MUSCLE_GROUPS) {
      const tokens = new Set(MUSCLE_GROUP_TOKENS[m]);
      const plan = exclude([m]);
      const hit = mainSlugs(plan).filter((s) => tokens.has(mainMuscle(s)));
      expect(hit, `excluding ${m}`).toEqual([]);
    }
  });
});

describe("cardio matches the person", () => {
  const withCardio = (a: OnboardingAnswers, p: TrainingPreferencesAnswers) =>
    build(a, p, { ...FULL_GYM, cardioTypes: ["treadmill"] });

  it("never runs a low-impact user (BMI 30+, 50+, injury)", () => {
    for (const body of [BODIES.heavy!, BODIES.senior!]) {
      const a = answers(body);
      expect(needsLowImpact(a)).toBe(true);
      expect(cardioSlugs(withCardio(a, prefs({ experience: "advanced" })))).not.toContain("running");
    }
    const injured = answers({ obstacle: "injuries" });
    expect(cardioSlugs(withCardio(injured, prefs({ experience: "advanced" })))).not.toContain("running");
  });

  it("walks novices and underweight people instead of running", () => {
    expect(cardioSlugs(withCardio(answers(), prefs({ experience: "no_experience" })))).not.toContain("running");
    expect(cardioSlugs(withCardio(answers(), prefs({ experience: "basic" })))).not.toContain("running");
    expect(cardioSlugs(withCardio(answers(BODIES.underweight), prefs({ experience: "advanced" })))).not.toContain(
      "running",
    );
  });

  it("still runs a trained, healthy lifter who asked for it", () => {
    expect(cardioSlugs(withCardio(answers(), prefs({ experience: "advanced" })))).toContain("running");
  });

  it("adds no cardio at a severely low BMI, even when asked", () => {
    const plan = withCardio(answers(BODIES.severelyThin), prefs({ experience: "advanced" }));
    expect(bmi(BODIES.severelyThin!)).toBeLessThan(16);
    expect(cardioSlugs(plan)).toEqual([]);
  });

  it("does not repeat the warm-up machine as the cardio block when another exists", () => {
    const plan = build(answers(), prefs({ experience: "basic" }), { ...FULL_GYM, cardioTypes: ["elliptical", "treadmill"] });
    for (const s of sessions(plan)) {
      if (s.cardio) expect(s.cardio.exercise.slug).not.toBe(s.warmup[0]?.slug);
    }
  });
});

describe("difficulty fits the person", () => {
  it("gives people with no experience no tier-3 or advanced-skill moves", () => {
    for (const gym of [FULL_GYM, HOME]) {
      for (const goal of ONBOARDING_GOALS) {
        const plan = build(answers({ goal }), prefs({ experience: "no_experience", daysPerWeek: "4" }), gym);
        for (const s of mainSlugs(plan)) {
          expect(exerciseDifficulty(s), `${s} (${goal}, ${gym.gymType})`).toBeLessThan(3);
          expect(ADVANCED_SKILL_SLUGS.has(s), s).toBe(false);
        }
      }
    }
  });

  it("keeps technical tier-3 lifts away from Basic users who have an easier option", () => {
    const plan = build(answers(), prefs({ experience: "basic", daysPerWeek: "4" }), FULL_GYM);
    const tier3 = mainSlugs(plan).filter((s) => exerciseDifficulty(s) === 3);
    expect(tier3, tier3.join(", ")).toEqual([]);
  });

  it("holds anyone who lacks the know-how to tier 2", () => {
    for (const obstacle of ["lack_of_knowledge", "never_tried"] as const) {
      const plan = build(answers({ obstacle }), prefs({ experience: "advanced" }), FULL_GYM);
      for (const s of mainSlugs(plan)) expect(exerciseDifficulty(s), `${s} (${obstacle})`).toBeLessThan(3);
    }
  });

  it("gives a Basic user who has never tried the pushdown, not a barbell triceps press", () => {
    for (const obstacle of ["lack_of_knowledge", "never_tried"] as const) {
      const plan = build(
        answers({ obstacle }),
        prefs({ experience: "basic", prioritizeMuscles: true, prioritizedMuscles: ["triceps"], daysPerWeek: "3" }),
        FULL_GYM,
      );
      const slugs = mainSlugs(plan);
      expect(slugs.some((s) => mainMuscle(s) === "triceps"), "triceps trained").toBe(true);
      expect(slugs).not.toContain("close-grip-bench-press");
    }
  });

  it("does not give a trained lifter an assisted version next to the real one", () => {
    const plan = build(answers(), prefs({ experience: "advanced", workoutSplit: "push_pull_legs", daysPerWeek: "6" }), FULL_GYM);
    const slugs = new Set(mainSlugs(plan));
    for (const s of slugs) if (s.startsWith("assisted-")) expect(slugs.has(s.slice(9)), s).toBe(false);
  });
});

describe("warm-up", () => {
  const warmups = (plan: GeneratedPlan) => sessions(plan).map((s) => ({ focus: s.focus, slugs: s.warmup.map((e) => e.slug), cool: s.cooldown.map((e) => e.slug) }));

  it("is exactly two moves, whatever the session length, and the moves differ", () => {
    for (const experience of ONBOARDING_EXPERIENCES) {
      for (const durationMin of [20, 45, 60]) {
        const plan = build(answers(), prefs({ experience, durationMin, daysPerWeek: "4" }), FULL_GYM);
        for (const w of warmups(plan)) {
          expect(w.slugs, `${experience} ${durationMin}min ${w.focus}`).toHaveLength(WARMUP_MOVE_COUNT);
          expect(new Set(w.slugs).size).toBe(w.slugs.length);
        }
      }
    }
  });

  it("matches the day: arms before a push, legs before a leg day", () => {
    const plan = build(
      answers(),
      prefs({ experience: "intermediate", workoutSplit: "push_pull_legs", daysPerWeek: "3", durationMin: 60 }),
      HOME,
    );
    const push = warmups(plan).find((w) => w.focus === "push")!;
    const legs = warmups(plan).find((w) => w.focus === "legs")!;
    expect(push.slugs).toContain("arm-circles");
    expect(push.slugs).not.toContain("leg-swings-stretch");
    expect(legs.slugs).toContain("leg-swings-stretch");
    expect(legs.slugs).not.toContain("arm-circles");
  });

  it("is the full length even when some drills need kit the user lacks", () => {
    const plan = build(answers(), prefs({ experience: "intermediate", daysPerWeek: "4", durationMin: 60 }), HOME);
    for (const w of warmups(plan)) expect(w.slugs, w.focus).toHaveLength(WARMUP_MOVE_COUNT);
  });

  it("keeps plank-position shoulder drills away from someone who has never trained", () => {
    const plan = build(answers(), prefs({ experience: "no_experience", daysPerWeek: "4", durationMin: 60 }), FULL_GYM);
    for (const w of warmups(plan)) expect(w.slugs).not.toContain("scapular-push-up");
  });

  it("does not repeat a warm-up drill as a cool-down stretch", () => {
    for (const gym of [FULL_GYM, HOME]) {
      const plan = build(answers(), prefs({ experience: "intermediate", daysPerWeek: "4", durationMin: 60 }), gym);
      for (const w of warmups(plan)) for (const slug of w.slugs) expect(w.cool, `${w.focus} ${slug}`).not.toContain(slug);
    }
  });

  it("only uses drills the user can do (no band drills without bands)", () => {
    const plan = build(answers(), prefs({ workoutSplit: "push_pull_legs", daysPerWeek: "3", durationMin: 60 }), HOME);
    for (const w of warmups(plan)) expect(w.slugs).not.toContain("band-pull-apart");
  });

  it("never uses jumping drills for a low-impact user", () => {
    const plan = build(answers(BODIES.heavy), prefs({ durationMin: 60 }), HOME);
    for (const w of warmups(plan)) for (const slug of w.slugs) expect(slug).not.toMatch(/jump|high-knees|burpee/);
  });
});

describe("session order", () => {
  it("opens every session with a compound lift, even when core or arms are prioritised", () => {
    const offenders: string[] = [];
    for (const m of ["obliques", "abs", "lower_back", "forearms", "biceps", "triceps", "calves"] as const) {
      const plan = build(
        answers(),
        prefs({
          experience: "advanced",
          workoutSplit: "push_pull_legs",
          daysPerWeek: "6",
          durationMin: 60,
          prioritizeMuscles: true,
          prioritizedMuscles: [m],
        }),
        FULL_GYM,
      );
      for (const s of sessions(plan)) {
        const first = BY_SLUG.get(s.main[0]!.slug)!;
        if (ISOLATION_SLUGS.has(first.slug) || ["abs", "core", "obliques", "lower_abs", "forearms"].includes(first.muscleGroups[0]!)) {
          offenders.push(`${m} → ${s.focus} opens with ${first.slug}`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("puts accessories after the compounds they follow", () => {
    const plan = build(answers(), prefs({ experience: "advanced", workoutSplit: "push_pull_legs", daysPerWeek: "6", durationMin: 60 }), FULL_GYM);
    for (const s of sessions(plan)) {
      const flags = s.main.map((e) => {
        const r = BY_SLUG.get(e.slug)!;
        return ISOLATION_SLUGS.has(r.slug) || ["abs", "core", "obliques", "lower_abs", "forearms"].includes(r.muscleGroups[0]!);
      });
      expect(flags, s.main.map((e) => e.slug).join(", ")).toEqual([...flags].sort((a, b) => Number(a) - Number(b)));
    }
  });
});

describe("a session is not the same move five times", () => {
  const FAMILIES: [string, RegExp][] = [
    ["vertical pull", /(^|-)(pull|chin)-up$/],
    ["glute bridge", /hip-thrust|glute-bridge|frog-pump/],
    ["romanian deadlift", /romanian-deadlift/],
    ["calf raise", /calf-raise/],
    ["shrug", /shrug/],
    ["overhead press", /overhead-press|shoulder-press|(seated|standing)-dumbbell-press|arnold-press|push-press|landmine-press|pike-push-up|handstand-push-up/],
  ];

  it("takes at most one of each movement family per session (full gym)", () => {
    const offenders: string[] = [];
    for (const experience of ONBOARDING_EXPERIENCES) {
      for (const split of ["push_pull_legs", "upper_lower", "full_body"] as const) {
        const plan = build(
          answers(),
          prefs({ experience, workoutSplit: split, daysPerWeek: split === "push_pull_legs" ? "6" : "4", durationMin: 60 }),
          FULL_GYM,
        );
        for (const s of sessions(plan)) {
          for (const [name, re] of FAMILIES) {
            const n = s.main.filter((e) => re.test(e.slug)).length;
            if (n > 1) offenders.push(`${experience}/${split}/${s.focus}: ${n}× ${name}`);
          }
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});

describe("rest matches the load", () => {
  it("keeps unloaded bodyweight and band work off the long end of the rest range", () => {
    const plan = build(answers(), prefs({ experience: "basic", daysPerWeek: "4" }), HOME);
    const rest = new Map<string, number>();
    for (const s of sessions(plan)) for (const e of s.main) rest.set(e.slug, e.restSec);
    expect(rest.size).toBeGreaterThan(0);
    for (const [slug, sec] of rest) {
      const rec = BY_SLUG.get(slug)!;
      if ((rec.equipment ?? []).every((id) => ["chair", "towel", "doorway", "step_box"].includes(id))) {
        expect(sec, slug).toBeLessThanOrEqual(90);
      }
    }
  });
});

describe("session length", () => {
  it("fits four lifts into a 45-minute session for someone with time (week 1, before any set ramp)", () => {
    const plan = build(answers(), prefs({ experience: "intermediate", durationMin: 45 }), { ...FULL_GYM, addCardio: false });
    for (const d of plan.weeks[0]!.days) if (d.session) expect(d.session.main.length).toBeGreaterThanOrEqual(4);
  });

  it("still caps 'lack of time' at four lifts", () => {
    const plan = build(answers({ obstacle: "lack_of_time" }), prefs({ durationMin: 60 }), { ...FULL_GYM, addCardio: false });
    for (const s of sessions(plan)) expect(s.main.length).toBeLessThanOrEqual(4);
  });
});

describe("whole-matrix sweep", () => {
  // A deterministic spread of profiles (no randomness, so a failure reproduces).
  const experiences: OnboardingExperience[] = [...ONBOARDING_EXPERIENCES];
  const obstacles = [null, "lack_of_time", "injuries", "lack_of_knowledge", "low_motivation"] as const;
  const bodies = Object.values(BODIES);
  const splits = ["ai_custom", "push_pull_legs", "upper_lower", "full_body"] as const;
  const muscles = PLAN_SELECTABLE_MUSCLE_GROUPS;

  const cases: { a: OnboardingAnswers; p: TrainingPreferencesAnswers; g: GymEquipmentAnswers; label: string }[] = [];
  let n = 0;
  for (const goal of ONBOARDING_GOALS) {
    for (const experience of experiences) {
      for (const gym of [FULL_GYM, HOME]) {
        const i = n++;
        const days = (["3", "4", "5", "6"] as const)[i % 4]!;
        const ex1 = muscles[(i * 7) % muscles.length]!;
        const ex2 = muscles[(i * 11 + 3) % muscles.length]!;
        const pr = muscles[(i * 5 + 1) % muscles.length]!;
        cases.push({
          label: `${goal}/${experience}/${gym.gymType}/${days}d/${i}`,
          a: answers({ goal, obstacle: obstacles[i % obstacles.length] ?? null, ...bodies[i % bodies.length]! }),
          p: prefs({
            experience,
            daysPerWeek: days,
            workoutSplit: splits[i % splits.length]!,
            durationMin: ([20, 30, 45, 60] as const)[i % 4]!,
            excludeMuscles: i % 3 === 0,
            excludedMuscles: i % 3 === 0 ? [ex1, ex2] : [],
            prioritizeMuscles: i % 2 === 0,
            prioritizedMuscles: i % 2 === 0 ? [pr] : [],
          }),
          g: { ...gym, addCardio: i % 2 === 1 && gym === FULL_GYM, cardioTypes: gym === FULL_GYM ? ["treadmill", "elliptical"] : [] },
        });
      }
    }
  }

  it("never produces an empty or one-exercise training day, a repeated slug in a session, or a stale version", () => {
    const problems: string[] = [];
    for (const { a, p, g, label } of cases) {
      const plan = build(a, p, g);
      if (plan.rulesVersion !== PLAN_RULES_VERSION) problems.push(`${label}: version`);
      for (const s of sessions(plan)) {
        if (s.main.length < 2) problems.push(`${label}: only ${s.main.length} main lift(s) on ${s.focus}`);
        const slugs = s.main.map((e) => e.slug);
        if (new Set(slugs).size !== slugs.length) problems.push(`${label}: repeated slug on ${s.focus}`);
        if (s.warmup.length !== WARMUP_MOVE_COUNT) problems.push(`${label}: ${s.warmup.length} warm-up moves`);
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it("never prescribes running to someone low-impact, novice, or underweight", () => {
    const problems: string[] = [];
    for (const { a, p, g, label } of cases) {
      const careful =
        needsLowImpact(a) ||
        p.experience === "no_experience" ||
        p.experience === "basic" ||
        bmi(a) < 18.5;
      if (careful && cardioSlugs(build(a, p, g)).includes("running")) problems.push(label);
    }
    expect(problems).toEqual([]);
  });
});
