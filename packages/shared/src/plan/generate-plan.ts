import {
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
import { experienceFit } from "./exercise-fit";
import { isAiEligible } from "./exercise-qa";
import {
  DIFFICULTY_LIMITS,
  ISOLATION_SLUGS,
  LOW_PRIORITY_ISOLATION_SLUGS,
  exerciseDifficulty,
  repsForExercise,
  suitsExperience,
} from "./exercise-meta";
import { selectCooldown, stretchToExercise, STRETCH_LIBRARY } from "./stretch-library";
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
export const PLAN_RULES_VERSION = 7;

/** Extra sets on main lifts as the weeks go on (progressive overload): weeks 1–2
 *  as prescribed, weeks 3–4 one set more. Kept off for people who are short on
 *  time or working around an injury, whose sessions shouldn't grow. `week` is
 *  0-based. */
export function progressionSets(week: number, obstacle: OnboardingAnswers["obstacle"]): number {
  if (obstacle === "lack_of_time" || obstacle === "injuries") return 0;
  return week >= 2 ? 1 : 0;
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

const SETS_REPS_BY_EXPERIENCE: Record<
  NonNullable<TrainingPreferencesAnswers["experience"]>,
  { sets: number; reps: string }
> = {
  no_experience: { sets: 2, reps: "12-15" },
  beginner: { sets: 2, reps: "12-15" },
  intermediate: { sets: 3, reps: "8-12" },
  advanced: { sets: 4, reps: "6-10" },
};

// Catalog slugs (kebab-case) of the exercise library.
const WARMUP_SLUGS = ["jumping-jack", "high-knees", "bodyweight-squat"];

/** Impact / advanced-skill moves. Left out when the user says they have an
 *  injury, is 50 or over, or has a BMI of 30 or more. This is a cautious filter,
 *  not medical advice. */
const HIGH_IMPACT = /jump|explosive|plyo|burpee|sprawl|squat-thrust|skater|dragon-flag|handstand|pistol|shrimp|hindu|archer|typewriter|kettlebell-swing|nordic|hop/;

// Gentle warm-up used instead of jumping jacks and high knees.
const LOW_IMPACT_WARMUP_SLUGS = ["arm-circles", "leg-swings-stretch", "bodyweight-squat"];

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

  // Reps count for up to 0.4: 15 or more → 0, 6 or fewer → 0.4. Starting from
  // 0.2, the exercise itself adds −0.25…+0.4 and the goal ±0.1, so even a heavy
  // rep scheme still separates a barbell lift from a light isolation move.
  const fromReps = 0.4 * clamp((15 - repsMidpoint(reps)) / (15 - 6), 0, 1);
  const fromType = typeHeaviness(record);
  const fromGoal = goal === "build_muscle" ? 0.1 : goal === "lose_weight" ? -0.1 : 0;
  const heaviness = clamp(0.2 + fromReps + fromType + fromGoal, 0, 1);

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
  shins: [],
  adductors: ["inner_thighs"],
  abductors: ["hips"],
  hip_flexors: ["hips"],
};

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

/** Reps per set. Fat loss goes higher-rep; muscle gain goes heavier as
 *  experience allows; otherwise it follows experience. */
function repsFor(
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
  goal: OnboardingAnswers["goal"],
  obstacle: OnboardingAnswers["obstacle"],
): string {
  if (obstacle === "injuries") return "12-15"; // lighter loads, more reps
  if (goal === "lose_weight") return "12-15";
  if (goal === "build_muscle") {
    return experience === "advanced" ? "6-10" : experience === "intermediate" ? "8-12" : "10-12";
  }
  return SETS_REPS_BY_EXPERIENCE[experience].reps;
}

/** The exercises for one session in one week: one per muscle group first (in
 *  the order given — prioritized muscles lead), then a second round, and so on,
 *  so a leg day isn't five glute moves. Inside each muscle group the ranked list
 *  rotates by week according to the Variety choice: "fixed" never changes;
 *  "balanced" keeps each muscle's first pick as a staple and rotates the rest;
 *  "dynamic" rotates all of them. Rotation wraps, so it is deterministic. */
function pickMain(
  pool: readonly ExerciseRecord[],
  muscleOrder: readonly string[],
  count: number,
  week: number,
  variety: NonNullable<TrainingPreferencesAnswers["variety"]>,
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
    .map((g) => {
      if (week === 0 || variety === "fixed" || g.length < 2) return g;
      const staples = variety === "dynamic" ? 0 : 1;
      const head = g.slice(0, staples);
      const tail = g.slice(staples);
      const shift = week % tail.length;
      return [...head, ...tail.slice(shift), ...tail.slice(0, shift)];
    });

  const picked: ExerciseRecord[] = [];
  for (let round = 0; picked.length < count && groups.some((g) => g.length > round); round++) {
    for (const g of groups) {
      if (picked.length < count && g[round]) picked.push(g[round]!);
    }
  }
  // Anything still short (fewer muscles than slots) tops up from the ranked pool.
  for (const e of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked;
}

/** Can the user do this exercise? By the equipment they ticked when the
 *  exercise says what it needs (any one item is enough; none = bodyweight),
 *  otherwise by gym type for older data. */
function isAvailable(e: ExerciseRecord, gymType: string, selected: ReadonlySet<string>): boolean {
  if (e.equipment) return e.equipment.length === 0 || e.equipment.some((id) => selected.has(id));
  return e.equipmentSettings.includes(gymType);
}

/** The eligible exercise pool for one session focus, best first. Equipment is
 *  a hard filter (applied before anything is ranked or picked), and so is
 *  difficulty: beginners only get foundational (tier 1) moves, intermediates
 *  tier 1–2, advanced lifters everything. Only when that leaves fewer than
 *  `count` exercises (e.g. a bodyweight-only setup) is the ceiling raised one
 *  tier at a time, up to the level's maximum — a beginner never reaches tier 3.
 *  Experience then ranks what's left, so an advanced lifter's loaded compound
 *  lifts come ahead of band or beginner bodyweight variants of the same muscle.
 *  A missing machine is substituted naturally: other exercises for the same
 *  main muscle stay in the pool. */
function poolFor(
  exercises: readonly ExerciseRecord[],
  gymType: string,
  selected: ReadonlySet<string>,
  muscleGroups: readonly string[],
  excluded: ReadonlySet<string>,
  priority: ReadonlySet<string>,
  lowImpact: boolean,
  experience: NonNullable<TrainingPreferencesAnswers["experience"]>,
  count: number,
): ExerciseRecord[] {
  const { start, max } = DIFFICULTY_LIMITS[experience];
  let pool = rankedPool(exercises, gymType, selected, muscleGroups, excluded, priority, lowImpact, experience, start);
  for (let ceiling = start + 1; pool.length < count && ceiling <= max; ceiling++) {
    pool = rankedPool(exercises, gymType, selected, muscleGroups, excluded, priority, lowImpact, experience, ceiling);
  }
  return pool;
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
  maxDifficulty: number,
): ExerciseRecord[] {
  return exercises
    .filter(
      (e) =>
        isAvailable(e, gymType, selected) &&
        suitsExperience(e.slug, experience) &&
        exerciseDifficulty(e.slug) <= maxDifficulty &&
        // An exercise belongs to the focus its main (first-listed) muscle is in.
        muscleGroups.includes(e.muscleGroups[0] ?? "") &&
        !hitsExcluded(e, excluded) &&
        !(lowImpact && HIGH_IMPACT.test(e.slug)),
    )
    .sort(
      (a, b) =>
        // Prioritized muscles first, then fit for the training level, then
        // exercises with written instructions, then a stable slug order.
        priorityScore(b, priority) - priorityScore(a, priority) ||
        experienceFit(b, experience) - experienceFit(a, experience) ||
        Number(b.hasInstructions === true) - Number(a.hasInstructions === true) ||
        a.slug.localeCompare(b.slug),
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

/**
 * Deterministically compose a 4-week structured training plan from the
 * onboarding wizard's answers + the live `exercises` catalog. Same inputs
 * (including the same exercise catalog snapshot) always produce the same
 * plan — no randomness, no network/AI calls of any kind. Every week uses the
 * same day-of-week pattern; the exercises stay the same or rotate from week to
 * week according to the user's Variety choice.
 */
export function generateTrainingPlan(input: {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  exercises: readonly ExerciseRecord[];
}): GeneratedPlan {
  const { answers, trainingPreferences, gymEquipment } = input;
  // Hard gate before anything is selected: only exercises with reliable
  // illustration + instructions + muscle mapping that passed QA can be used.
  const exercises = input.exercises.filter(isAiEligible);

  const gymType = gymEquipment.gymType ?? "bodyweight_only";
  const daysPerWeek = trainingPreferences.daysPerWeek ?? "3";
  const experience = trainingPreferences.experience ?? "beginner";
  const durationMin = trainingPreferences.durationMin ?? 45;
  // Sets come from experience; reps from experience + goal. The rest after each
  // set is worked out per exercise (restSecFor) inside the user's rest-timer range.
  const experienceScheme = SETS_REPS_BY_EXPERIENCE[experience];
  const scheme = { sets: experienceScheme.sets, reps: repsFor(experience, answers.goal, answers.obstacle) };

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
  const warmupPool = byslugs(exercises, lowImpact ? LOW_IMPACT_WARMUP_SLUGS : WARMUP_SLUGS);
  // Recovery / stretching: real stretches only, chosen per workout from the
  // muscles it trained (see selectCooldown). Equipment still applies (the
  // doorway stretch needs a doorway).
  const stretchSlugs = new Set(STRETCH_LIBRARY.map((s) => s.slug));
  const stretchPool = exercises.filter(
    (e) => stretchSlugs.has(e.slug) && isAvailable(e, gymType, selectedEquipment),
  );
  const cooldownCount = durationMin <= 30 || answers.obstacle === "lack_of_time" ? 3 : 4;
  // Jump rope is dropped in low-impact mode.
  const cardioTypes = gymEquipment.cardioTypes.filter((c) => !(lowImpact && c === "jump_rope"));

  /** One week's seven days. Every day sharing a focus gets identical content
   *  within the week (deterministic, and no re-deriving the same pool); how much
   *  the exercises change from week to week is the user's Variety choice. */
  function buildWeek(week: number): GeneratedDay[] {
    const sessionByFocus = new Map<SessionFocus, GeneratedSession>();
    let trainingDayCounter = 0;
    const days: GeneratedDay[] = [];

    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex++) {
      if (!trainingDays.has(dayIndex)) {
        days.push({ dayIndex, dayLabel: WEEKDAY[dayIndex]!, isRestDay: true, session: null });
        continue;
      }

      const focus = sequence[trainingDayCounter % sequence.length]!;
      let session = sessionByFocus.get(focus);
      if (!session) {
        // Sessions that train a prioritized muscle get one extra exercise.
        const worksPriority = FOCUS_MUSCLES[focus].some((m) => priority.has(m));
        const count = Math.min(7, mainCount + (worksPriority ? 1 : 0));
        const pool = poolFor(exercises, gymType, selectedEquipment, FOCUS_MUSCLES[focus], excluded, priority, lowImpact, experience, count);
        const muscleOrder = [
          ...FOCUS_MUSCLES[focus].filter((m) => priority.has(m)),
          ...FOCUS_MUSCLES[focus].filter((m) => !priority.has(m)),
        ];
        const sets = scheme.sets + progressionSets(week, answers.obstacle);
        const mainRecords = pickMain(pool, muscleOrder, count, week, variety);
        const main = mainRecords.map((e) => {
          // Timed holds get a hold time, single-joint work a higher rep range.
          const reps = repsForExercise(e.slug, scheme.reps, answers.goal);
          return toExercise(e, {
            ...scheme,
            reps,
            sets,
            restSec: restSecFor({
              record: e,
              reps,
              goal: answers.goal,
              prefs: trainingPreferences,
            }),
          });
        });

        let cardio: GeneratedCardioBlock | null = null;
        if (gymEquipment.addCardio && cardioTypes.length > 0) {
          const cardioSlug = cardioTypes[trainingDayCounter % cardioTypes.length]!;
          const cardioExercise = exercises.find((e) => e.slug === cardioTypeToSlug(cardioSlug));
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

        session = {
          focus,
          warmup: warmupPool.map((e) =>
            toExercise(e, { sets: 1, reps: "45 sec", restSec: lightWorkRestSec(trainingPreferences) }),
          ),
          main,
          cooldown: selectCooldown({ main: mainRecords, available: stretchPool, count: cooldownCount }).map(
            ({ def, record }) => stretchToExercise(def, record, lightWorkRestSec(trainingPreferences)),
          ),
          cardio,
        };
        sessionByFocus.set(focus, session);
      }

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

/** Cardio type ids (onboarding) → catalog exercise slugs. */
function cardioTypeToSlug(cardioType: string): string {
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
    swimming: "swimming",
    hiking: "hiking",
  };
  return map[cardioType] ?? cardioType;
}
