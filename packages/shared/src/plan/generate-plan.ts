import {
  ONBOARDING_MUSCLE_GROUPS,
  REST_TIMER_RECOMMENDED_SEC,
  REST_TIMER_STEP_SEC,
  planExperience,
  resolveTrainingDays,
  type GymEquipmentAnswers,
  type TrainingSplit,
  type OnboardingAnswers,
  type OnboardingMuscleGroup,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { Bi } from "./plan-types";
import { recommendSplit } from "./split-recommendation";
import {
  canonMuscle,
  compareForLevel,
  exerciseEase,
  exerciseModality,
  exerciseRole,
  isHighImpact,
  patternProgressionRank,
  restrictToLevel,
} from "./exercise-fit";
import { isAiEligible } from "./exercise-qa";
import {
  DIFFICULTY_LIMITS,
  ISOLATION_SLUGS,
  LOW_PRIORITY_ISOLATION_SLUGS,
  exerciseDifficulty,
  repsForExercise,
  suitsExperience,
} from "./exercise-meta";
import {
  WARMUP_IMPACT_RAISE_SLUGS,
  WARMUP_MOBILITY_SLUGS,
  baseSchemeForExperience,
  compoundRepsFor,
  goalProfile,
  selectWarmupRaiseSlug,
  setsForWeek,
  volumeCurveFor,
  weekLadderStep,
} from "./mesocycle-rules";
import { selectCooldown, stretchToExercise, STRETCH_LIBRARY } from "./stretch-library";
import {
  orderGroupForExposure,
  preferUnused,
  type PlanPerformanceHistory,
} from "./structured-variation";
import type {
  ExerciseRecord,
  GeneratedCardioBlock,
  GeneratedDay,
  GeneratedExercise,
  GeneratedPlan,
  GeneratedSession,
  GeneratedWeek,
  SessionFocus,
} from "./generated-plan-types";

const WEEKS_PER_PLAN = 4;
const DAYS_PER_WEEK = 7;

const WEEKDAY: Bi[] = [
  { zh: "週一", en: "Mon" },
  { zh: "週二", en: "Tue" },
  { zh: "週三", en: "Wed" },
  { zh: "週四", en: "Thu" },
  { zh: "週五", en: "Fri" },
  { zh: "週六", en: "Sat" },
  { zh: "週日", en: "Sun" },
];

const FOCUS_MUSCLES: Record<SessionFocus, readonly string[]> = {
  push: ["chest", "shoulders", "triceps", "upper_chest", "lower_chest", "middle_delts"],
  pull: ["back", "biceps", "lats", "upper_back", "rear_delts", "traps"],
  legs: ["quads", "glutes", "hamstrings", "calves", "abductors"],
  lower: ["quads", "glutes", "hamstrings", "calves", "lower_abs", "abductors"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps", "upper_chest", "lats", "lower_chest", "middle_delts"],
  full_body: [
    "chest",
    "back",
    "quads",
    "glutes",
    "shoulders",
    "middle_delts",
    "abductors",
    "core",
    "full_body",
    "abs",
    "obliques",
    "lower_abs",
    "upper_chest",
    "lats",
  ],
};

/** Muscles a session also trains when the user prioritises them. They sit
 *  outside FOCUS_MUSCLES so a default plan is unchanged, but a priority is
 *  never unreachable: every muscle the picker offers has a home in every split
 *  (abs on leg days, forearms on pull days, arms and hamstrings on full-body
 *  days, ...). */
const FOCUS_PRIORITY_EXTRAS: Record<SessionFocus, readonly string[]> = {
  push: [],
  pull: ["forearms", "lower_back"],
  legs: ["abs", "core", "obliques", "lower_abs", "lower_back", "inner_thighs", "forearms"],
  lower: ["abs", "core", "obliques", "lower_back", "inner_thighs"],
  upper: ["rear_delts", "upper_back", "traps", "forearms"],
  full_body: [
    "hamstrings",
    "calves",
    "biceps",
    "triceps",
    "lower_chest",
    "upper_back",
    "traps",
    "rear_delts",
    "lower_back",
    "forearms",
    "inner_thighs",
  ],
};

/** The muscles a session of this focus can train: its own, plus any prioritised
 *  muscle the focus would otherwise never reach. */
function focusMuscles(focus: SessionFocus, priority: ReadonlySet<string>): string[] {
  const base = FOCUS_MUSCLES[focus];
  return [...base, ...FOCUS_PRIORITY_EXTRAS[focus].filter((m) => priority.has(m) && !base.includes(m))];
}

/** Plan-rule revision stamped on every generated plan. Bump it whenever the
 *  generator's output would change for the same answers, so the app can offer
 *  to refresh plans saved under older rules. */
export const PLAN_RULES_VERSION = 17;

const SPLIT_SEQUENCE: Record<TrainingSplit, SessionFocus[]> = {
  full_body: ["full_body"],
  upper_lower: ["upper", "lower"],
  push_pull_legs: ["push", "pull", "legs"],
  ppl_upper: ["push", "pull", "legs", "upper"],
  ppl_upper_lower: ["push", "pull", "legs", "upper", "lower"],
};

/** The recurring day-type sequence for a split — cycles across however many
 *  training days the week has. Unset or "ai_custom" uses the recommendation
 *  for these answers; the retired "PPL + full body" keeps its own rotation. */
export function focusSequence(
  workoutSplit: TrainingPreferencesAnswers["workoutSplit"],
  recommended: () => TrainingSplit,
): SessionFocus[] {
  if (workoutSplit === "ppl_full_body") return ["push", "pull", "legs", "full_body"];
  if (workoutSplit === "ppl_upper_body") return SPLIT_SEQUENCE.ppl_upper;
  if (!workoutSplit || workoutSplit === "ai_custom") return SPLIT_SEQUENCE[recommended()];
  return SPLIT_SEQUENCE[workoutSplit];
}

function bmiOf(answers: Pick<OnboardingAnswers, "heightCm" | "weightKg">): number | null {
  const { heightCm, weightKg } = answers;
  return heightCm && weightKg ? weightKg / (heightCm / 100) ** 2 : null;
}

/** Low-impact mode: an injury (the "Obstacle" answer), age 50+, or BMI 30+. */
export function needsLowImpact(answers: OnboardingAnswers): boolean {
  const { obstacle, age } = answers;
  const bmi = bmiOf(answers);
  return obstacle === "injuries" || (age !== null && age >= 50) || (bmi !== null && bmi >= 30);
}

/** Below this BMI (severe thinness) no cardio block is added, even if asked
 *  for: the plan is strength work only. */
const CARDIO_MIN_BMI = 16;
/** Below this BMI cardio is walking only. */
const UNDERWEIGHT_BMI = 18.5;

/** Rest for light work when the rest timer is switched off (with it on, light
 *  work uses the user's shortest rest — see `lightWorkRestSec`). */
const TRANSITION_REST_SEC = 15;

/** Warm-up, cool-down and cardio are the lightest work in a session, so they
 *  sit at the bottom of the user's rest-timer range: the shortest rest. */
export function lightWorkRestSec(
  prefs: Pick<TrainingPreferencesAnswers, "restTimerEnabled" | "restTimerMinSec">,
): number {
  return prefs.restTimerEnabled ? prefs.restTimerMinSec : TRANSITION_REST_SEC;
}

/** Midpoint of a reps prescription like "8-12" (or a single number). */
function repsMidpoint(reps: string): number {
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 10;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** How much an exercise adds to (or takes from) "heaviness", from what we know
 *  about it: the more muscle groups it works, the heavier (cardio/core don't
 *  count). The exercises table has no load or equipment column yet, so a few
 *  slug hints separate big barbell lifts from bodyweight work. */
function typeHeaviness(record: ExerciseRecord): number {
  const groups = record.muscleGroups.filter((m) => m !== "cardio" && !CORE_FAMILY.has(m)).length;
  let score = groups >= 3 ? 0.3 : groups === 2 ? 0.15 : -0.15;
  const slug = record.slug;
  // Slugs are kebab-case catalog slugs ("barbell-bench-press"); `[-_]` also
  // tolerates the old snake_case ones still found in older saved plans.
  if (/barbell|deadlift|leg[-_]press|hip[-_]thrust/.test(slug) || (/squat/.test(slug) && !/bodyweight|jump/.test(slug))) {
    score += 0.1;
  } else if (/push[-_]up|bodyweight|pull[-_]up|dip|plank|crunch|bridge/.test(slug)) {
    score -= 0.1;
  }
  return score;
}

/**
 * Rest after each set of a main lift, chosen per exercise and placed inside the
 * user's rest-timer range (min…max): the heavier the exercise, the closer to
 * the max.
 *
 * "Heaviness" (0…1) comes from the reps (fewer reps = heavier), the exercise
 * itself (more muscle groups / big barbell lifts = heavier, bodyweight or
 * single-muscle work = lighter). Build muscle adds a little rest. Fat loss
 * does not shorten it. Rounded to 5 s. With the rest timer turned off the same
 * maths runs over the recommended 60–180 s range, as a suggestion.
 */
export function restSecFor(input: {
  record: ExerciseRecord;
  reps: string;
  goal: OnboardingAnswers["goal"];
  prefs: Pick<
    TrainingPreferencesAnswers,
    "restTimerEnabled" | "restTimerMinSec" | "restTimerMaxSec"
  >;
}): number {
  const { record, reps, goal, prefs } = input;
  const range = prefs.restTimerEnabled
    ? { min: prefs.restTimerMinSec, max: prefs.restTimerMaxSec }
    : REST_TIMER_RECOMMENDED_SEC;

  // Reps count for up to 0.4: 15 or more → 0, 6 or fewer → 0.4. Fat-loss
  // prescriptions often use higher reps for technique — do not let that alone
  // shorten rest (muscle retention). Use a neutral mid-range for heaviness.
  const repsForHeaviness = goal === "lose_weight" ? "10-12" : reps;
  const fromReps = 0.4 * clamp((15 - repsMidpoint(repsForHeaviness)) / (15 - 6), 0, 1);
  const fromType = typeHeaviness(record);
  const fromGoal = goal === "build_muscle" ? 0.1 : 0;
  // Heaviness comes from how many muscles a move works, which says nothing
  // about load: a wall push-up or a banded row is not a heavy set. Unloaded
  // work and single-joint work therefore never reach the long end of the range.
  const modality = exerciseModality(record);
  const unloaded =
    record.equipment !== undefined &&
    (modality === "bodyweight" || modality === "band") &&
    exerciseDifficulty(record.slug) < 3;
  const cap = unloaded ? 0.25 : ISOLATION_SLUGS.has(record.slug) ? 0.45 : 1;
  const heaviness = clamp(0.2 + fromReps + fromType + fromGoal, 0, cap);

  const raw = range.min + heaviness * (range.max - range.min);
  const stepped = Math.round(raw / REST_TIMER_STEP_SEC) * REST_TIMER_STEP_SEC;
  return clamp(stepped, range.min, range.max);
}

function toExercise(
  record: ExerciseRecord,
  scheme: { sets: number; reps: string; restSec: number },
): GeneratedExercise {
  return {
    slug: record.slug,
    name: { zh: record.nameZh, en: record.nameEn },
    sets: scheme.sets,
    reps: scheme.reps,
    restSec: scheme.restSec,
  };
}

/** What each option in the onboarding muscle pickers means in the exercise
 *  table's muscle vocabulary (set by `refineMainMuscle` in the catalog seed).
 *  Each option has its own token except where the catalog genuinely has no
 *  finer exercises: `shins`, `neck` and `hip_flexors` have none and are not
 *  offered. Glutes also covers the abductors (gluteus medius). */
export const MUSCLE_GROUP_TOKENS: Record<OnboardingMuscleGroup, readonly string[]> = {
  abs: ["abs", "core"],
  obliques: ["obliques"],
  lower_abs: ["lower_abs"],
  upper_chest: ["upper_chest"],
  middle_chest: ["chest"],
  lower_chest: ["lower_chest"],
  upper_back: ["upper_back"],
  lower_back: ["lower_back"],
  lats: ["lats"],
  trapezius: ["traps"],
  /** No catalog exercises yet — kept for type completeness; omit from pickers via `PLAN_SELECTABLE_MUSCLE_GROUPS`. */
  neck: [],
  front_deltoid: ["shoulders"],
  middle_deltoid: ["middle_delts"],
  rear_deltoid: ["rear_delts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  quadriceps: ["quads"],
  hamstrings: ["hamstrings"],
  /** The abductors are the gluteus medius, so working or sparing the glutes covers them too. */
  glutes: ["glutes", "abductors"],
  calves: ["calves"],
  /** No catalog exercises yet — omit from pickers via `PLAN_SELECTABLE_MUSCLE_GROUPS`. */
  shins: [],
  adductors: ["inner_thighs"],
  abductors: ["abductors"],
  /** No exercise in the catalog has hips as its main muscle — omitted from the pickers. */
  hip_flexors: [],
};

/** Muscle picker options that actually affect generation (non-empty token map).
 *  Prefer this over `ONBOARDING_MUSCLE_GROUPS` in web AI Plan UI. */
export const PLAN_SELECTABLE_MUSCLE_GROUPS: readonly OnboardingMuscleGroup[] =
  ONBOARDING_MUSCLE_GROUPS.filter((m) => MUSCLE_GROUP_TOKENS[m].length > 0);

/** A saved muscle list with the options the picker no longer offers (neck,
 *  shins, hip flexors, abductors, or anything unknown) removed, and repeats
 *  dropped. Those options never changed a plan; left in a loaded list they would
 *  take up a selection slot the user can neither see nor clear. */
export function keepSelectableMuscles(muscles: readonly string[] | null | undefined): OnboardingMuscleGroup[] {
  const out: OnboardingMuscleGroup[] = [];
  for (const m of muscles ?? []) {
    const known = PLAN_SELECTABLE_MUSCLE_GROUPS.find((g) => g === m);
    if (known && !out.includes(known)) out.push(known);
  }
  return out;
}

function musclesToTokens(muscles: readonly OnboardingMuscleGroup[]): Set<string> {
  return new Set(muscles.flatMap((m) => MUSCLE_GROUP_TOKENS[m] ?? []));
}

/** Should an exercise be left out because it works an excluded muscle? Only its
 *  main muscle (the first token) removes it. A secondary muscle would too often
 *  remove the prime movers — excluding the shoulders must not take out every
 *  bench press, excluding glutes every squat — so secondaries only rank an
 *  exercise lower (see `excludedSecondaryCount`). */
const CORE_FAMILY = new Set(["core", "abs", "obliques", "lower_abs"]);

function hitsExcluded(e: ExerciseRecord, excluded: ReadonlySet<string>): boolean {
  if (excluded.size === 0) return false;
  return excluded.has(e.muscleGroups[0] ?? "");
}

/** Excluded muscles an exercise works as a secondary — fewer is better, so a
 *  lift that spares the user's excluded muscle is chosen when one exists. */
function excludedSecondaryCount(e: ExerciseRecord, excluded: ReadonlySet<string>): number {
  if (excluded.size === 0) return 0;
  return e.muscleGroups.slice(1).filter((m) => excluded.has(m) && !CORE_FAMILY.has(m)).length;
}

/** 2 = trains a prioritized muscle as its main muscle, 1 = as a secondary one. */
function priorityScore(e: ExerciseRecord, priority: ReadonlySet<string>): number {
  if (priority.size === 0) return 0;
  if (priority.has(e.muscleGroups[0] ?? "")) return 2;
  return e.muscleGroups.some((m) => priority.has(m)) ? 1 : 0;
}

/** The exercises for one session in one week: one per muscle group first (in
 *  the order given — prioritized muscles lead), then a second round, and so on,
 *  so a leg day isn't five glute moves. Each later week steps the main lift to
 *  the next harder variation of that pattern (machine → free weight → barbell)
 *  when one exists. `fixed` variety keeps week 1's Exposure A/B choices all
 *  month. `exposureIndex` rotates emphasis when the same focus repeats in the
 *  week (structured A/B — not random). */
function pickMain(
  pool: readonly ExerciseRecord[],
  muscleOrder: readonly string[],
  count: number,
  week: number,
  variety: NonNullable<TrainingPreferencesAnswers["variety"]>,
  goal: OnboardingAnswers["goal"],
  exposureIndex: number,
  softAvoid: ReadonlySet<string>,
  history: PlanPerformanceHistory | undefined,
  priority: ReadonlySet<string>,
): ExerciseRecord[] {
  // Upper / lower chest are chest: one slot family, so a push day isn't three
  // chest moves before it reaches shoulders or triceps.
  const canon = canonMuscle;
  const order = [...new Set(muscleOrder.map(canon))];
  const groups = order
    .map((m) => pool.filter((e) => canon(e.muscleGroups[0] ?? "") === m))
    .filter((g) => g.length > 0)
    // The best-ranked lift leads; after it, single-joint work comes before
    // more compounds (a main press, then the lateral raise — not two presses).
    .map((g) => {
      const rest = g.slice(1);
      const isolations = rest.filter((e) => ISOLATION_SLUGS.has(e.slug));
      return [
        g[0]!,
        ...isolations.filter((e) => !LOW_PRIORITY_ISOLATION_SLUGS.has(e.slug)),
        ...isolations.filter((e) => LOW_PRIORITY_ISOLATION_SLUGS.has(e.slug)),
        ...rest.filter((e) => !ISOLATION_SLUGS.has(e.slug)),
      ];
    })
    .map((g) => advanceToHarderVariation(g, week, variety, goal, priority))
    .map((g) => orderGroupForExposure(g, exposureIndex, variety, softAvoid, history));

  const picked: ExerciseRecord[] = [];
  const pickedSlugs = new Set<string>();
  const pickedFamilies = new Set<string>();
  const familyTaken = (e: ExerciseRecord) => {
    const family = movementFamily(e.slug);
    return family !== null && pickedFamilies.has(family);
  };
  const take = (e: ExerciseRecord) => {
    picked.push(e);
    pickedSlugs.add(e.slug);
    const family = movementFamily(e.slug);
    if (family) pickedFamilies.add(family);
  };
  const maxRounds = Math.max(0, ...groups.map((g) => g.length));
  for (let round = 0; picked.length < count && round < maxRounds; round++) {
    for (const g of groups) {
      if (picked.length >= count) break;
      const remaining = g.filter((e) => !pickedSlugs.has(e.slug) && !familyTaken(e));
      if (remaining.length === 0) continue;
      // First pass prefers unused/avoided; later rounds take what's left.
      const next = (round === 0 ? preferUnused(remaining, softAvoid) : remaining)[0];
      if (next) take(next);
    }
  }
  // Anything still short (fewer muscles than slots) tops up from the ranked
  // pool: new patterns first, a repeated family only if nothing else is left.
  const rest = preferUnused(
    pool.filter((e) => !pickedSlugs.has(e.slug)),
    softAvoid,
  );
  for (const e of [...rest.filter((e) => !familyTaken(e)), ...rest.filter(familyTaken)]) {
    if (picked.length >= count) break;
    if (pickedSlugs.has(e.slug)) continue;
    take(e);
  }
  return picked;
}

/** Step the lead lift toward a harder variation. Week 0 is the easiest (or the
 *  goal's preferred style). Later weeks take the next rung. */
function advanceToHarderVariation(
  group: ExerciseRecord[],
  week: number,
  variety: NonNullable<TrainingPreferencesAnswers["variety"]>,
  goal: OnboardingAnswers["goal"],
  priority: ReadonlySet<string>,
): ExerciseRecord[] {
  if (variety === "fixed" || group.length < 2) return group;
  const patterns = group.filter((e) => !ISOLATION_SLUGS.has(e.slug));
  const isolations = group.filter((e) => ISOLATION_SLUGS.has(e.slug));
  if (patterns.length < 2) return group;
  // A prioritised single-joint move (shrugs for traps, lateral raises for
  // middle delts) already heads the group; the ladder must not hand the lead
  // back to a compound.
  const patternTop = Math.max(...patterns.map((e) => priorityScore(e, priority)));
  if (priorityScore(group[0]!, priority) > patternTop) return group;

  const functionalish = (slug: string) =>
    /lunge|split|carry|farmer|step-up|swing|single|unilateral|thruster|burpee|pistol/.test(slug);
  const sorted = [...patterns].sort((a, b) => {
    // Maintain Health: prefer bodyweight, but never ahead of a clearer easy→hard order.
    if (goal === "stay_healthy") {
      const bodyweight = (e: ExerciseRecord) => (exerciseEase(e) >= 6 ? 0 : 1);
      const byBw = bodyweight(a) - bodyweight(b);
      if (byBw !== 0) return byBw;
    }
    // Primary: equipment rung (machine → free weight → barbell / bodyweight).
    const byEase = exerciseEase(a) - exerciseEase(b);
    if (byEase !== 0) return byEase;
    // Tie-break that matters most: known families step wall → incline → knee → full,
    // not A–Z (which put wall-push-up in week 4 after push-up).
    const byProgression = patternProgressionRank(a.slug) - patternProgressionRank(b.slug);
    if (byProgression !== 0) return byProgression;
    // Functional: among equal difficulty, prefer athletic unilateral patterns.
    if (goal === "functional") {
      const byKind = Number(functionalish(b.slug)) - Number(functionalish(a.slug));
      if (byKind !== 0) return byKind;
    }
    return a.slug.localeCompare(b.slug);
  });
  // The ladder climbs within the prioritised lifts when there are any: a user
  // who asked for upper chest keeps an incline press as the lead every week,
  // stepping up through the incline variations, rather than the ladder handing
  // the slot back to the easiest press.
  const top = Math.max(...sorted.map((e) => priorityScore(e, priority)));
  const rungs = top > 0 ? sorted.filter((e) => priorityScore(e, priority) === top) : sorted;
  const lead = rungs[Math.min(weekLadderStep(week, goal), rungs.length - 1)]!;
  return [lead, ...isolations, ...sorted.filter((e) => e !== lead)];
}

/** Can the user do this exercise? By the equipment they ticked when the
 *  exercise says what it needs (any one item is enough; none = bodyweight),
 *  otherwise by gym type for older data. */
function isAvailable(e: ExerciseRecord, gymType: string, selected: ReadonlySet<string>): boolean {
  if (e.equipment) return e.equipment.length === 0 || e.equipment.some((id) => selected.has(id));
  return e.equipmentSettings.includes(gymType);
}

/** The eligible exercise pool for one session focus, best first. Equipment is
 *  a hard filter. Experience then drops setups that are needlessly hard while
 *  an easier one exists for that muscle, and orders what remains: pattern
 *  before isolation, the level's preferred setup, then a staple list. A
 *  missing machine is substituted by the next rung for that muscle only. */
function poolFor(
  exercises: readonly ExerciseRecord[],
  gymType: string,
  selected: ReadonlySet<string>,
  muscleGroups: readonly string[],
  excluded: ReadonlySet<string>,
  priority: ReadonlySet<string>,
  lowImpact: boolean,
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
  ceiling: DifficultyCeiling | null,
): ExerciseRecord[] {
  return rankedPool(exercises, gymType, selected, muscleGroups, excluded, priority, lowImpact, experience, ceiling);
}

function rankedPool(
  exercises: readonly ExerciseRecord[],
  gymType: string,
  selected: ReadonlySet<string>,
  muscleGroups: readonly string[],
  excluded: ReadonlySet<string>,
  priority: ReadonlySet<string>,
  lowImpact: boolean,
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
  ceiling: DifficultyCeiling | null,
): ExerciseRecord[] {
  const available = exercises.filter(
    (e) =>
      isAvailable(e, gymType, selected) &&
      suitsExperience(e.slug, experience) &&
      // An exercise belongs to the focus its main (first-listed) muscle is in.
      muscleGroups.includes(e.muscleGroups[0] ?? "") &&
      !hitsExcluded(e, excluded) &&
      !(lowImpact && isHighImpact(e.slug)),
  );
  const levelled = restrictToLevel(limitDifficulty(preferUnassisted(available, experience), ceiling), experience);
  return levelled.sort(
    (a, b) =>
      priorityScore(b, priority) - priorityScore(a, priority) ||
      // Pattern before isolation first, so sparing an excluded secondary muscle
      // never promotes a fly over the press.
      ROLE_RANK[exerciseRole(a.slug)] - ROLE_RANK[exerciseRole(b.slug)] ||
      excludedSecondaryCount(a, excluded) - excludedSecondaryCount(b, excluded) ||
      compareForLevel(a, b, experience) ||
      Number(b.hasInstructions === true) - Number(a.hasInstructions === true),
  );
}

const ROLE_RANK = { pattern: 0, isolation: 1, skill: 2 } as const;

/** The hardest exercise tier a person may be given (see `exerciseDifficulty`):
 *  `start` normally, up to `max` for a muscle with nothing easier. */
export interface DifficultyCeiling {
  start: number;
  max: number;
}

/** Novices are held back (no experience: foundational moves; Basic: no tier-3
 *  move while an easier one trains the muscle). So is anyone who says they lack
 *  the know-how or have never tried — a technical lift needs coaching they
 *  haven't had. Everyone else is not capped. */
export function difficultyCeiling(
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
  obstacle: OnboardingAnswers["obstacle"],
): DifficultyCeiling | null {
  const unsure = obstacle === "lack_of_knowledge" || obstacle === "never_tried";
  if (experience === "no_experience" || (experience === "basic" && unsure)) return DIFFICULTY_LIMITS.no_experience;
  if (experience === "basic") return DIFFICULTY_LIMITS.basic;
  return unsure ? { start: 2, max: 2 } : null;
}

/** Drop exercises above the ceiling, per muscle: a muscle with nothing at the
 *  starting tier may use the next tier up, never past `max`. */
function limitDifficulty(list: ExerciseRecord[], ceiling: DifficultyCeiling | null): ExerciseRecord[] {
  if (!ceiling) return list;
  const byMuscle = new Map<string, ExerciseRecord[]>();
  for (const e of list) {
    const muscle = canonMuscle(e.muscleGroups[0] ?? "");
    byMuscle.set(muscle, [...(byMuscle.get(muscle) ?? []), e]);
  }
  const kept: ExerciseRecord[] = [];
  for (const group of byMuscle.values()) {
    // Any easy option counts, isolation included: a pushdown is the beginner's
    // triceps exercise, so a close-grip bench is not reached for.
    const hasEasy = group.some((e) => exerciseDifficulty(e.slug) <= ceiling.start);
    const limit = hasEasy ? ceiling.start : ceiling.max;
    kept.push(...group.filter((e) => exerciseDifficulty(e.slug) <= limit));
  }
  return kept;
}

/** An assisted pull-up or dip is a regression for people who can't do the real
 *  one yet. Once the real one is on offer, a trained lifter isn't given both
 *  (or the assisted one at all). */
function preferUnassisted(list: ExerciseRecord[], experience: string): ExerciseRecord[] {
  if (experience === "no_experience" || experience === "basic") return list;
  const slugs = new Set(list.map((e) => e.slug));
  const unassistedOn = (base: string) => slugs.has(base) || slugs.has(`weighted-${base}`);
  return list.filter((e) => !(e.slug.startsWith("assisted-") && unassistedOn(e.slug.slice("assisted-".length))));
}

/** Single-joint work, core and grip: the accessories that finish a session. */
function isAccessory(e: ExerciseRecord): boolean {
  const main = e.muscleGroups[0] ?? "";
  return ISOLATION_SLUGS.has(e.slug) || CORE_FAMILY.has(main) || main === "forearms";
}

/** Compound lifts first, accessories after (stable). Selection already ranked
 *  the priorities and trimmed to the session length; this only sets the running
 *  order, so a prioritised ab move or curl never comes ahead of the squat. */
function compoundsFirst(
  records: ExerciseRecord[],
  exercises: GeneratedExercise[],
): { records: ExerciseRecord[]; exercises: GeneratedExercise[] } {
  const order = records
    .map((_, i) => i)
    .sort((a, b) => Number(isAccessory(records[a]!)) - Number(isAccessory(records[b]!)) || a - b);
  return { records: order.map((i) => records[i]!), exercises: order.map((i) => exercises[i]!) };
}

/** Moves that train the same pattern. A session takes one of each family, so a
 *  day isn't a pull-up and a chin-up, or two glute bridges and a hip thrust. */
const MOVEMENT_FAMILIES: readonly (readonly [string, RegExp])[] = [
  ["vertical-pull", /(^|-)(pull|chin)-up$/],
  ["glute-bridge", /hip-thrust|glute-bridge|frog-pump/],
  ["romanian-deadlift", /romanian-deadlift/],
  ["calf-raise", /calf-raise/],
  ["shrug", /shrug/],
  ["overhead-press", /overhead-press|shoulder-press|(seated|standing)-dumbbell-press|arnold-press|push-press|landmine-press|pike-push-up|handstand-push-up/],
  ["flat-press", /^((smith-machine|dumbbell)-)?bench-press$|^machine-chest-press$/],
  ["horizontal-push-up", /^((wall|incline|knee|decline|diamond|weighted)-)?push-up$/],
  ["plank", /(^|-)plank(-|$)/],
];

function movementFamily(slug: string): string | null {
  return MOVEMENT_FAMILIES.find(([, re]) => re.test(slug))?.[0] ?? null;
}

function byslugs(exercises: readonly ExerciseRecord[], slugs: readonly string[]): ExerciseRecord[] {
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  return slugs.map((s) => bySlug.get(s)).filter((e): e is ExerciseRecord => e !== undefined);
}

function mainExerciseCount(
  durationMin: number,
  obstacle: OnboardingAnswers["obstacle"],
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
): number {
  // ~15 min of warm-up and cool-down leaves the rest for main work;
  // budget roughly 8 min per main exercise (sets + rest included) — more for
  // newcomers, who need time to learn each movement.
  const mainMinutes = Math.max(20, durationMin - 15);
  const perExercise = experience === "no_experience" ? 10 : 8;
  const count = Math.min(6, Math.max(3, Math.round(mainMinutes / perExercise)));
  // "Lack of time" keeps sessions short and focused whatever length was chosen.
  return obstacle === "lack_of_time" ? Math.min(count, 4) : count;
}

/** Rough session length from prescribed work — used to trim accessories. */
function estimateSessionMin(
  main: readonly GeneratedExercise[],
  warmupCount: number,
  cooldownCount: number,
  hasCardio: boolean,
): number {
  const mainMin = main.reduce((acc, e) => {
    const mid = repsMidpoint(e.reps);
    const workSec = e.sets * Math.min(90, Math.max(20, mid * 3));
    const restSec = Math.max(0, e.sets - 1) * e.restSec;
    return acc + (workSec + restSec) / 60;
  }, 0);
  return 6 + warmupCount * 1.2 + cooldownCount * 1 + mainMin + (hasCardio ? 12 : 0);
}

function trimMainToDuration(
  mainRecords: ExerciseRecord[],
  main: GeneratedExercise[],
  durationMin: number,
  warmupCount: number,
  cooldownCount: number,
  hasCardio: boolean,
): { records: ExerciseRecord[]; exercises: GeneratedExercise[] } {
  let records = [...mainRecords];
  let exercises = [...main];
  while (
    exercises.length > 3 &&
    estimateSessionMin(exercises, warmupCount, cooldownCount, hasCardio) > durationMin + 5
  ) {
    // Drop lowest-priority tail first (usually isolation / accessories).
    records = records.slice(0, -1);
    exercises = exercises.slice(0, -1);
  }
  return { records, exercises };
}

/** Every warm-up is exactly this many moves (client rule): the Raise, if any,
 *  then the drill that best matches the day. */
export const WARMUP_MOVE_COUNT = 2;

/** Drill order per focus — the drills closest to the day's muscles first, so
 *  the first usable one is the drill a session gets. A drill the user can't do
 *  (it needs bands they lack) or the catalog doesn't have is skipped; the next
 *  one takes its place. */
const WARMUP_DRILLS_BY_FOCUS: Record<SessionFocus, readonly string[]> = {
  push: ["arm-circles", "worlds-greatest-stretch", "cat-cow-stretch", "scapular-push-up", "bodyweight-squat"],
  pull: ["arm-circles", "cat-cow-stretch", "band-pull-apart", "prone-y-raise", "worlds-greatest-stretch"],
  upper: ["arm-circles", "cat-cow-stretch", "scapular-push-up", "band-pull-apart", "worlds-greatest-stretch"],
  legs: ["leg-swings-stretch", "bodyweight-squat", "glute-bridge", "worlds-greatest-stretch", "cat-cow-stretch"],
  lower: ["leg-swings-stretch", "bodyweight-squat", "glute-bridge", "worlds-greatest-stretch", "cat-cow-stretch"],
  full_body: ["bodyweight-squat", "arm-circles", "leg-swings-stretch", "worlds-greatest-stretch", "cat-cow-stretch"],
};

/** The Raise for this user (machine when preferred/available, else one impact
 *  drill unless low-impact or a novice), plus the available mobility drills. */
function buildWarmupParts(
  exercises: readonly ExerciseRecord[],
  raiseAvailable: ReadonlySet<string>,
  lowImpact: boolean,
  preferMachineRaise: boolean,
  canDo: (e: ExerciseRecord) => boolean,
): { raise: ExerciseRecord | null; mobility: ExerciseRecord[] } {
  const mobility = byslugs(exercises, [...WARMUP_MOBILITY_SLUGS]).filter(canDo);
  const raiseSlug = selectWarmupRaiseSlug({
    available: raiseAvailable,
    lowImpact,
    preferMachine: preferMachineRaise || lowImpact,
  });
  const machine = raiseSlug ? byslugs(exercises, [raiseSlug])[0] : undefined;
  if (machine) return { raise: machine, mobility };
  // No machine: impact drills only for non-novice, non-low-impact users.
  if (!lowImpact && !preferMachineRaise) {
    return { raise: byslugs(exercises, [...WARMUP_IMPACT_RAISE_SLUGS])[0] ?? null, mobility };
  }
  return { raise: null, mobility };
}

/** Drills a first-time lifter is not given: holding a plank to move the
 *  shoulder blades is a strength move in its own right. */
const NOVICE_SKIP_DRILLS: ReadonlySet<string> = new Set(["scapular-push-up"]);

/** Up to `count` moves: the Raise (if any) then the drills that best match the
 *  session's focus. If the user can't do some of them (no bands), the other
 *  general drills fill the gap so the warm-up is still the full length. */
function selectWarmup(
  parts: { raise: ExerciseRecord | null; mobility: ExerciseRecord[] },
  focus: SessionFocus,
  count: number,
  novice: boolean,
): ExerciseRecord[] {
  const usable = parts.mobility.filter((e) => !(novice && NOVICE_SKIP_DRILLS.has(e.slug)));
  const matched = WARMUP_DRILLS_BY_FOCUS[focus]
    .map((slug) => usable.find((e) => e.slug === slug))
    .filter((e): e is ExerciseRecord => e !== undefined);
  const fill = usable.filter((e) => !matched.includes(e));
  return [...(parts.raise ? [parts.raise] : []), ...matched, ...fill].slice(0, count);
}

/**
 * Deterministically compose a 4-week structured training plan from the
 * onboarding wizard's answers + the live `exercises` catalog. Same inputs
 * (including the same exercise catalog snapshot and optional performance
 * history) always produce the same plan — no randomness, no network/AI calls.
 * Same-focus days in a week use structured Exposure A/B emphasis; sets
 * step up on a mild ramp when the goal and experience allow it.
 */
export function generateTrainingPlan(input: {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  exercises: readonly ExerciseRecord[];
  /** Optional recent / struggling lifts — biases Exposure B+ away from the
   *  same leads. Omitted on first plans and in most unit tests. */
  performanceHistory?: PlanPerformanceHistory;
}): GeneratedPlan {
  const { answers, trainingPreferences, gymEquipment, performanceHistory } = input;
  // Hard gate before anything is selected: only exercises with reliable
  // illustration + instructions + muscle mapping that passed QA can be used.
  const exercises = input.exercises.filter(isAiEligible);

  const gymType = gymEquipment.gymType ?? "bodyweight_only";
  const daysPerWeek = trainingPreferences.daysPerWeek ?? "3";
  const experience = planExperience(trainingPreferences.experience) ?? "basic";
  const durationMin = trainingPreferences.durationMin ?? 45;
  const experienceScheme = baseSchemeForExperience(experience);
  const compoundReps = compoundRepsFor({
    experience,
    goal: answers.goal,
    obstacle: answers.obstacle,
  });
  const curve = volumeCurveFor({
    experience,
    goal: answers.goal,
    obstacle: answers.obstacle,
  });
  const profile = goalProfile(answers.goal);

  const selectedEquipment = new Set<string>(gymEquipment.equipment);
  const excluded = musclesToTokens(
    trainingPreferences.excludeMuscles === true ? trainingPreferences.excludedMuscles : [],
  );
  const priority = musclesToTokens(
    trainingPreferences.prioritizeMuscles === true ? trainingPreferences.prioritizedMuscles : [],
  );
  const variety = trainingPreferences.variety ?? "balanced";
  const trainingDays = new Set(resolveTrainingDays(daysPerWeek, trainingPreferences.trainingDays));
  const sequence = focusSequence(trainingPreferences.workoutSplit, () =>
    recommendSplit({ answers, trainingPreferences, gymEquipment }).split,
  );
  const mainCount = mainExerciseCount(durationMin, answers.obstacle, experience);

  const lowImpact = needsLowImpact(answers);
  const ceiling = difficultyCeiling(experience, answers.obstacle);
  const preferMachineRaise =
    experience === "no_experience" ||
    experience === "basic" ||
    answers.goal === "stay_healthy" ||
    answers.goal === "lose_weight" ||
    profile.conditioningBias === "encouraged";
  const raiseAvailable = new Set<string>([...selectedEquipment, ...gymEquipment.cardioTypes]);
  const warmupParts = buildWarmupParts(exercises, raiseAvailable, lowImpact, preferMachineRaise, (e) =>
    isAvailable(e, gymType, selectedEquipment),
  );
  // Recovery / stretching: real stretches only, chosen per workout from the
  // muscles it trained (see selectCooldown). Equipment still applies (the
  // doorway stretch needs a doorway).
  const stretchSlugs = new Set(STRETCH_LIBRARY.map((s) => s.slug));
  const stretchPool = exercises.filter(
    (e) => stretchSlugs.has(e.slug) && isAvailable(e, gymType, selectedEquipment),
  );
  const cooldownCount = durationMin <= 30 || answers.obstacle === "lack_of_time" ? 3 : 4;
  // Jump rope is dropped in low-impact mode. A saved answer for a cardio type
  // that is no longer in the catalog (hiking, swimming) is skipped.
  const bmi = bmiOf(answers);
  // Running is for people who are trained and sound: novices, low-impact mode
  // and an underweight BMI all get the treadmill as an incline walk.
  const walkOnly =
    lowImpact ||
    experience === "no_experience" ||
    experience === "basic" ||
    (bmi !== null && bmi < UNDERWEIGHT_BMI);
  let cardioTypes = gymEquipment.cardioTypes.filter(
    (c) => cardioTypeToSlug(c, walkOnly) !== null && !(lowImpact && c === "jump_rope"),
  );
  // The warm-up already used one machine; cardio takes a different one if the
  // user has another.
  const warmupMachine = warmupParts.raise?.slug;
  const otherMachines = cardioTypes.filter((c) => cardioTypeToSlug(c, walkOnly) !== warmupMachine);
  if (otherMachines.length > 0) cardioTypes = otherMachines;
  // Cardio block only when the user opted in — goal profiles may encourage it
  // in product copy, but generation never invents cardio without addCardio.
  const wantCardio = gymEquipment.addCardio && !(bmi !== null && bmi < CARDIO_MIN_BMI);

  /** One week's seven days. Each occurrence of a focus gets its own Exposure
   *  index (A=0, B=1, …) so upper/upper or full-body×3 is not a clone. Soft-
   *  avoid earlier mains in the week for recovery; history biases B+ leads. */
  function buildWeek(week: number): GeneratedDay[] {
    const focusExposure = new Map<SessionFocus, number>();
    const usedThisWeek = new Set<string>();
    const usedByFocus = new Map<SessionFocus, Set<string>>();
    let trainingDayCounter = 0;
    const days: GeneratedDay[] = [];
    const sets = setsForWeek({
      baseSets: experienceScheme.sets,
      week,
      curve,
      experience,
      obstacle: answers.obstacle,
      trainingDays: trainingDays.size,
    });

    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex++) {
      if (!trainingDays.has(dayIndex)) {
        days.push({ dayIndex, dayLabel: WEEKDAY[dayIndex]!, isRestDay: true, session: null });
        continue;
      }

      const focus = sequence[trainingDayCounter % sequence.length]!;
      const exposureIndex = focusExposure.get(focus) ?? 0;
      focusExposure.set(focus, exposureIndex + 1);

      const focusUsed = usedByFocus.get(focus) ?? new Set<string>();
      // Same-focus repeats: hard soft-avoid prior lineup. Cross-day: lighter
      // avoid of anything already trained this week (recovery).
      const softAvoid = new Set<string>([
        ...focusUsed,
        ...(exposureIndex > 0 ? usedThisWeek : []),
      ]);

      // Sessions that train a prioritized muscle get one extra exercise.
      const sessionMuscles = focusMuscles(focus, priority);
      const worksPriority = sessionMuscles.some((m) => priority.has(m));
      const count = Math.min(7, mainCount + (worksPriority ? 1 : 0));
      const pool = poolFor(
        exercises,
        gymType,
        selectedEquipment,
        sessionMuscles,
        excluded,
        priority,
        lowImpact,
        experience,
        ceiling,
      );
      const muscleOrder = [
        ...sessionMuscles.filter((m) => priority.has(m)),
        ...sessionMuscles.filter((m) => !priority.has(m)),
      ];
      let mainRecords = pickMain(
        pool,
        muscleOrder,
        count,
        week,
        variety,
        answers.goal,
        exposureIndex,
        softAvoid,
        performanceHistory,
        priority,
      );
      let main = mainRecords.map((e) => {
        const reps = repsForExercise(e.slug, compoundReps, answers.goal);
        return toExercise(e, {
          sets,
          reps,
          restSec: restSecFor({
            record: e,
            reps,
            goal: answers.goal,
            prefs: trainingPreferences,
          }),
        });
      });

      let cardio: GeneratedCardioBlock | null = null;
      if (wantCardio && cardioTypes.length > 0) {
        const cardioSlug = cardioTypes[trainingDayCounter % cardioTypes.length]!;
        const mapped = cardioTypeToSlug(cardioSlug, walkOnly);
        const cardioExercise = mapped ? exercises.find((e) => e.slug === mapped) : undefined;
        if (cardioExercise) {
          cardio = {
            placement: gymEquipment.cardioPlacement,
            exercise: toExercise(cardioExercise, {
              sets: 1,
              reps: "15-20 min",
              restSec: lightWorkRestSec(trainingPreferences),
            }),
          };
        }
      }

      const warmupRecords = selectWarmup(warmupParts, focus, WARMUP_MOVE_COUNT, ceiling !== null && ceiling.start === 1);
      // A stretch used as a warm-up drill isn't repeated in the cool-down.
      const warmupSlugs = new Set(warmupRecords.map((e) => e.slug));
      const sessionStretchPool = stretchPool.filter((e) => !warmupSlugs.has(e.slug));
      const trimmed = trimMainToDuration(
        mainRecords,
        main,
        durationMin,
        warmupRecords.length,
        cooldownCount,
        cardio !== null,
      );
      ({ records: mainRecords, exercises: main } = compoundsFirst(trimmed.records, trimmed.exercises));

      const raiseReps =
        warmupRecords[0] &&
        (warmupRecords[0].slug === "cycling" ||
          warmupRecords[0].slug === "elliptical" ||
          warmupRecords[0].slug === "rowing" ||
          warmupRecords[0].slug === "running" ||
          warmupRecords[0].slug === "treadmill-incline-walk")
          ? "3-5 min"
          : "45 sec";

      const session: GeneratedSession = {
        focus,
        warmup: warmupRecords.map((e, i) =>
          toExercise(e, {
            sets: 1,
            reps: i === 0 && raiseReps === "3-5 min" ? raiseReps : "45 sec",
            restSec: lightWorkRestSec(trainingPreferences),
          }),
        ),
        main,
        cooldown: selectCooldown({ main: mainRecords, available: sessionStretchPool, count: cooldownCount }).map(
          ({ def, record }) => stretchToExercise(def, record, lightWorkRestSec(trainingPreferences)),
        ),
        cardio,
      };

      for (const e of mainRecords) {
        usedThisWeek.add(e.slug);
        focusUsed.add(e.slug);
      }
      usedByFocus.set(focus, focusUsed);

      days.push({ dayIndex, dayLabel: WEEKDAY[dayIndex]!, isRestDay: false, session });
      trainingDayCounter++;
    }
    return days;
  }

  const weeks: GeneratedWeek[] = Array.from({ length: WEEKS_PER_PLAN }, (_, i) => ({
    weekIndex: i + 1,
    days: buildWeek(i),
  }));

  return { weeks, sessionDurationMin: durationMin, rulesVersion: PLAN_RULES_VERSION };
}

/** Cardio type ids (onboarding) → catalog exercise slugs. Unknown ids (older
 *  saved answers for exercises that left the catalog) are ignored. */
function cardioTypeToSlug(cardioType: string, walkOnly = false): string | null {
  const map: Record<string, string> = {
    air_bike: "assault-bike",
    cycling: "cycling",
    cycling_stationary: "cycling",
    elliptical: "elliptical",
    jump_rope: "jump-rope",
    rowing: "rowing",
    treadmill: walkOnly ? "treadmill-incline-walk" : "running",
    stair_climber: "stair-climber",
    ski_erg: "skierg",
    battle_ropes: "battle-ropes",
  };
  return map[cardioType] ?? null;
}
