import {
  ONBOARDING_MUSCLE_GROUPS,
  REST_TIMER_RECOMMENDED_SEC,
  REST_TIMER_STEP_SEC,
  resolveTrainingDays,
  type GymEquipmentAnswers,
  type TrainingSplit,
  type OnboardingAnswers,
  type OnboardingMuscleGroup,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";
import type { Bi } from "./plan-types";
import { recommendSplit } from "./split-recommendation";
import { compareForLevel, exerciseEase, patternProgressionRank, restrictToLevel } from "./exercise-fit";
import { isAiEligible } from "./exercise-qa";
import {
  ISOLATION_SLUGS,
  LOW_PRIORITY_ISOLATION_SLUGS,
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
  weekRirTarget,
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
  push: ["chest", "shoulders", "triceps", "upper_chest", "lower_chest"],
  pull: ["back", "biceps", "lats", "upper_back", "rear_delts"],
  legs: ["quads", "glutes", "hamstrings", "calves"],
  lower: ["quads", "glutes", "hamstrings", "calves", "lower_abs"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps", "upper_chest", "lats", "lower_chest"],
  full_body: [
    "chest",
    "back",
    "quads",
    "glutes",
    "shoulders",
    "core",
    "full_body",
    "abs",
    "obliques",
    "lower_abs",
    "upper_chest",
    "lats",
  ],
};

/** Plan-rule revision stamped on every generated plan. Bump it whenever the
 *  generator's output would change for the same answers, so the app can offer
 *  to refresh plans saved under older rules. */
export const PLAN_RULES_VERSION = 15;

/** @deprecated Compatibility shim — weekly set ramps are handled by
 *  `setsForWeek` / volume curves. Always returns 0 so callers that still sum
 *  this on top of base sets do not double-count. */
export function progressionSets(_week: number, _obstacle: OnboardingAnswers["obstacle"]): number {
  return 0;
}

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

/** Impact / advanced-skill moves. Left out when the user says they have an
 *  injury, is 50 or over, or has a BMI of 30 or more. This is a cautious filter,
 *  not medical advice. */
const HIGH_IMPACT = /jump|explosive|plyo|burpee|sprawl|squat-thrust|skater|dragon-flag|handstand|pistol|shrimp|hindu|archer|typewriter|kettlebell-swing|nordic|hop/;

/** Low-impact mode: an injury (the "Obstacle" answer), age 50+, or BMI 30+. */
export function needsLowImpact(answers: OnboardingAnswers): boolean {
  const { obstacle, age, heightCm, weightKg } = answers;
  const bmi = heightCm && weightKg ? weightKg / (heightCm / 100) ** 2 : null;
  return obstacle === "injuries" || (age !== null && age >= 50) || (bmi !== null && bmi >= 30);
}

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
 * single-muscle work = lighter), and the goal (fat loss trims it, muscle gain
 * adds to it). Rounded to 5 s. With the rest timer turned off the same
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
  const heaviness = clamp(0.2 + fromReps + fromType + fromGoal, 0, 1);

  const raw = range.min + heaviness * (range.max - range.min);
  const stepped = Math.round(raw / REST_TIMER_STEP_SEC) * REST_TIMER_STEP_SEC;
  return clamp(stepped, range.min, range.max);
}

function toExercise(
  record: ExerciseRecord,
  scheme: { sets: number; reps: string; restSec: number; rirTarget?: number },
): GeneratedExercise {
  return {
    slug: record.slug,
    name: { zh: record.nameZh, en: record.nameEn },
    sets: scheme.sets,
    reps: scheme.reps,
    restSec: scheme.restSec,
    ...(scheme.rirTarget !== undefined ? { rirTarget: scheme.rirTarget } : {}),
  };
}

/** What each option in the onboarding muscle pickers means in the exercise
 *  table's muscle vocabulary. Upper / middle / lower chest, abs / obliques /
 *  lower abs and lats each have their own token. Still coarser than the picker
 *  in places: traps share `upper_back`, and front and middle deltoid share
 *  `shoulders`. `shins` and `neck` have no matching exercises. */
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
  trapezius: ["upper_back"],
  /** No catalog exercises yet — kept for type completeness; omit from pickers via `PLAN_SELECTABLE_MUSCLE_GROUPS`. */
  neck: [],
  front_deltoid: ["shoulders"],
  middle_deltoid: ["shoulders"],
  rear_deltoid: ["rear_delts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  quadriceps: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves"],
  /** No catalog exercises yet — omit from pickers via `PLAN_SELECTABLE_MUSCLE_GROUPS`. */
  shins: [],
  adductors: ["inner_thighs"],
  abductors: ["hips"],
  hip_flexors: ["hips"],
};

/** Muscle picker options that actually affect generation (non-empty token map).
 *  Prefer this over `ONBOARDING_MUSCLE_GROUPS` in web AI Plan UI. */
export const PLAN_SELECTABLE_MUSCLE_GROUPS: readonly OnboardingMuscleGroup[] =
  ONBOARDING_MUSCLE_GROUPS.filter((m) => MUSCLE_GROUP_TOKENS[m].length > 0);

function musclesToTokens(muscles: readonly OnboardingMuscleGroup[]): Set<string> {
  return new Set(muscles.flatMap((m) => MUSCLE_GROUP_TOKENS[m] ?? []));
}

/** Should an exercise be left out because it works an excluded muscle? Its main
 *  muscle (the first token) always counts; a secondary muscle counts too, except
 *  "core", which almost every lift lists — excluding abs shouldn't remove squats. */
const CORE_FAMILY = new Set(["core", "abs", "obliques", "lower_abs"]);

function hitsExcluded(e: ExerciseRecord, excluded: ReadonlySet<string>): boolean {
  if (excluded.size === 0) return false;
  return e.muscleGroups.some((m, i) => excluded.has(m) && (i === 0 || !CORE_FAMILY.has(m)));
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
): ExerciseRecord[] {
  // Upper / lower chest are chest: one slot family, so a push day isn't three
  // chest moves before it reaches shoulders or triceps.
  const canon = (m: string) => (m === "upper_chest" || m === "lower_chest" ? "chest" : m);
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
    .map((g) => advanceToHarderVariation(g, week, variety, goal))
    .map((g) => orderGroupForExposure(g, exposureIndex, variety, softAvoid, history));

  const picked: ExerciseRecord[] = [];
  const pickedSlugs = new Set<string>();
  const maxRounds = Math.max(0, ...groups.map((g) => g.length));
  for (let round = 0; picked.length < count && round < maxRounds; round++) {
    for (const g of groups) {
      if (picked.length >= count) break;
      const remaining = g.filter((e) => !pickedSlugs.has(e.slug));
      if (remaining.length === 0) continue;
      // First pass prefers unused/avoided; later rounds take what's left.
      const next = (round === 0 ? preferUnused(remaining, softAvoid) : remaining)[0];
      if (next) {
        picked.push(next);
        pickedSlugs.add(next.slug);
      }
    }
  }
  // Anything still short (fewer muscles than slots) tops up from the ranked pool.
  for (const e of preferUnused(
    pool.filter((e) => !pickedSlugs.has(e.slug)),
    softAvoid,
  )) {
    if (picked.length >= count) break;
    picked.push(e);
    pickedSlugs.add(e.slug);
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
): ExerciseRecord[] {
  if (variety === "fixed" || group.length < 2) return group;
  const patterns = group.filter((e) => !ISOLATION_SLUGS.has(e.slug));
  const isolations = group.filter((e) => ISOLATION_SLUGS.has(e.slug));
  if (patterns.length < 2) return group;

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
  const step = Math.min(weekLadderStep(week, goal), sorted.length - 1);
  const lead = sorted[step]!;
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
): ExerciseRecord[] {
  return rankedPool(exercises, gymType, selected, muscleGroups, excluded, priority, lowImpact, experience);
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
): ExerciseRecord[] {
  const available = exercises.filter(
    (e) =>
      isAvailable(e, gymType, selected) &&
      suitsExperience(e.slug, experience) &&
      // An exercise belongs to the focus its main (first-listed) muscle is in.
      muscleGroups.includes(e.muscleGroups[0] ?? "") &&
      !hitsExcluded(e, excluded) &&
      !(lowImpact && HIGH_IMPACT.test(e.slug)),
  );
  return restrictToLevel(available, experience).sort(
    (a, b) =>
      priorityScore(b, priority) - priorityScore(a, priority) ||
      compareForLevel(a, b, experience) ||
      Number(b.hasInstructions === true) - Number(a.hasInstructions === true),
  );
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
  // ~10 min warm-up + ~10 min cool-down leaves the rest for main work;
  // budget roughly 8 min per main exercise (sets + rest included) — more for
  // newcomers, who need time to learn each movement.
  const mainMinutes = Math.max(20, durationMin - 20);
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

/** Every warm-up is exactly this many moves (client rule). */
export const WARMUP_MOVE_COUNT = 2;

/** Mobility drill order per focus — the drill closest to the day's muscles first. */
const WARMUP_MOBILITY_BY_FOCUS: Record<SessionFocus, readonly string[]> = {
  push: ["arm-circles", "bodyweight-squat", "leg-swings-stretch"],
  pull: ["arm-circles", "bodyweight-squat", "leg-swings-stretch"],
  upper: ["arm-circles", "bodyweight-squat", "leg-swings-stretch"],
  legs: ["leg-swings-stretch", "bodyweight-squat", "arm-circles"],
  lower: ["leg-swings-stretch", "bodyweight-squat", "arm-circles"],
  full_body: ["bodyweight-squat", "arm-circles", "leg-swings-stretch"],
};

/** The Raise for this user (machine when preferred/available, else one impact
 *  drill unless low-impact or a novice), plus the available mobility drills. */
function buildWarmupParts(
  exercises: readonly ExerciseRecord[],
  raiseAvailable: ReadonlySet<string>,
  lowImpact: boolean,
  preferMachineRaise: boolean,
): { raise: ExerciseRecord | null; mobility: ExerciseRecord[] } {
  const mobility = byslugs(exercises, [...WARMUP_MOBILITY_SLUGS]);
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

/** Exactly `WARMUP_MOVE_COUNT` moves: the Raise (if any) then the mobility
 *  drill(s) that best match the session's focus. */
function selectWarmup(
  parts: { raise: ExerciseRecord | null; mobility: ExerciseRecord[] },
  focus: SessionFocus,
): ExerciseRecord[] {
  const order = WARMUP_MOBILITY_BY_FOCUS[focus];
  const mobility = [...parts.mobility].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  return [...(parts.raise ? [parts.raise] : []), ...mobility].slice(0, WARMUP_MOVE_COUNT);
}

/**
 * Deterministically compose a 4-week structured training plan from the
 * onboarding wizard's answers + the live `exercises` catalog. Same inputs
 * (including the same exercise catalog snapshot and optional performance
 * history) always produce the same plan — no randomness, no network/AI calls.
 * Same-focus days in a week use structured Exposure A/B emphasis; dose
 * progresses via reps/effort/RIR and mild set ramps when eligible.
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
  const experience = trainingPreferences.experience ?? "beginner";
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
  const preferMachineRaise =
    experience === "no_experience" ||
    experience === "beginner" ||
    answers.goal === "stay_healthy" ||
    answers.goal === "lose_weight" ||
    profile.conditioningBias === "encouraged";
  const raiseAvailable = new Set<string>([...selectedEquipment, ...gymEquipment.cardioTypes]);
  const warmupParts = buildWarmupParts(exercises, raiseAvailable, lowImpact, preferMachineRaise);
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
  const cardioTypes = gymEquipment.cardioTypes.filter(
    (c) => cardioTypeToSlug(c) !== null && !(lowImpact && c === "jump_rope"),
  );
  // Cardio block only when the user opted in — goal profiles may encourage it
  // in product copy, but generation never invents cardio without addCardio.
  const wantCardio = gymEquipment.addCardio;

  /** One week's seven days. Each occurrence of a focus gets its own Exposure
   *  index (A=0, B=1, …) so upper/upper or full-body×3 is not a clone. Soft-
   *  avoid earlier mains in the week for recovery; history biases B+ leads. */
  function buildWeek(week: number): GeneratedDay[] {
    const focusExposure = new Map<SessionFocus, number>();
    const usedThisWeek = new Set<string>();
    const usedByFocus = new Map<SessionFocus, Set<string>>();
    let trainingDayCounter = 0;
    const days: GeneratedDay[] = [];
    const rir = weekRirTarget(week, experience, curve);
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
      const worksPriority = FOCUS_MUSCLES[focus].some((m) => priority.has(m));
      const count = Math.min(7, mainCount + (worksPriority ? 1 : 0));
      const pool = poolFor(exercises, gymType, selectedEquipment, FOCUS_MUSCLES[focus], excluded, priority, lowImpact, experience);
      const muscleOrder = [
        ...FOCUS_MUSCLES[focus].filter((m) => priority.has(m)),
        ...FOCUS_MUSCLES[focus].filter((m) => !priority.has(m)),
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
          rirTarget: rir,
        });
      });

      let cardio: GeneratedCardioBlock | null = null;
      if (wantCardio && cardioTypes.length > 0) {
        const cardioSlug = cardioTypes[trainingDayCounter % cardioTypes.length]!;
        const mapped = cardioTypeToSlug(cardioSlug);
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

      const warmupRecords = selectWarmup(warmupParts, focus);
      const trimmed = trimMainToDuration(
        mainRecords,
        main,
        durationMin,
        warmupRecords.length,
        cooldownCount,
        cardio !== null,
      );
      mainRecords = trimmed.records;
      main = trimmed.exercises;

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
        cooldown: selectCooldown({ main: mainRecords, available: stretchPool, count: cooldownCount }).map(
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
function cardioTypeToSlug(cardioType: string): string | null {
  const map: Record<string, string> = {
    air_bike: "assault-bike",
    cycling: "cycling",
    cycling_stationary: "cycling",
    elliptical: "elliptical",
    jump_rope: "jump-rope",
    rowing: "rowing",
    treadmill: "running",
    stair_climber: "stair-climber",
    ski_erg: "skierg",
    battle_ropes: "battle-ropes",
  };
  return map[cardioType] ?? null;
}
