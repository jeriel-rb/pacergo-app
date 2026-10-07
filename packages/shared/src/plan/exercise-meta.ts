import type { OnboardingExperience } from "../onboarding/onboarding-types";

/**
 * Programming facts about exercises that the exercise table doesn't carry yet
 * (difficulty, how it's prescribed, whether it isolates one muscle). Explicit
 * lists on purpose — not guessed from names — so each decision is visible,
 * reviewable and tested against the catalog (see exercise-qa web test). When
 * these move into the database as real columns, this file goes away.
 */

/** Elite calisthenics skills (and loaded versions of them). Never given to
 *  beginners or people with no training experience — a dragon flag on a
 *  beginner's lower-body day is how people get hurt. */
export const ADVANCED_SKILL_SLUGS: ReadonlySet<string> = new Set([
  "dragon-flag",
  "pistol-squat",
  "shrimp-squat",
  "sissy-squat",
  "handstand-push-up",
  "wall-handstand-push-up",
  "archer-push-up",
  "hindu-push-up",
  "typewriter-push-up",
  "explosive-push-up",
  "l-sit-hold",
  "l-sit-pull-up",
  "commando-pull-up",
  "weighted-pull-up",
  "weighted-chin-up",
  "weighted-dip",
  "nordic-hamstring-curl",
  "copenhagen-plank",
  "hollow-rock",
]);

/** Done for time (holds, carries, conditioning drills), not for repetitions.
 *  Prescribing "4 × 6–10 reps" of a plank or a dead hang is meaningless. */
export const TIMED_SLUGS: ReadonlySet<string> = new Set([
  "plank",
  "side-plank",
  "bear-plank",
  "wall-sit",
  "hollow-body-hold",
  "superman-hold",
  "l-sit-hold",
  "dead-hang",
  "active-hang",
  "copenhagen-plank",
  "cable-pallof-hold",
  "farmer-carry",
  "mountain-climber",
  "plank-jack",
  "bear-crawl",
  "crab-walk",
  "high-knees",
  "jumping-jack",
  "burpee",
  "half-burpee",
  "squat-thrust",
  "sprawl",
  "skater-hop",
  "lateral-shuffle",
  "battle-ropes",
  "jump-rope",
]);

/** Single-joint work (curls, raises, flyes, extensions, calf and hip-machine
 *  work). Trained in a higher rep range than the heavy compound lifts, and
 *  placed after a muscle's main compound lift. */
export const ISOLATION_SLUGS: ReadonlySet<string> = new Set([
  // chest
  "cable-fly", "pec-deck", "dumbbell-fly", "incline-cable-fly",
  // shoulders / rear delts
  "lateral-raise", "cable-lateral-raise", "machine-lateral-raise", "front-raise", "plate-front-raise",
  "cable-front-raise", "rear-delt-fly", "reverse-pec-deck", "bent-over-rear-delt-raise",
  "cable-rear-delt-fly", "face-pull",
  // arms
  "bicep-curl", "hammer-curl", "preacher-curl", "cable-curl", "reverse-curl", "incline-dumbbell-curl",
  "concentration-curl", "ez-bar-curl", "rope-hammer-curl", "drag-curl", "tricep-pushdown",
  "rope-tricep-pushdown", "overhead-tricep-extension", "skull-crusher", "dumbbell-skull-crusher",
  "single-dumbbell-skullcrusher", "dumbbell-overhead-tricep-extension",
  "single-arm-dumbbell-tricep-extension", "tricep-kickback",
  // legs / glutes
  "leg-extension", "leg-curl", "seated-leg-curl", "lying-leg-curl", "standing-calf-raise",
  "seated-calf-raise", "leg-press-calf-raise", "calf-raise", "single-leg-calf-raise",
  "hip-abduction-machine", "hip-adduction-machine", "cable-kickback", "machine-glute-kickback",
  "cable-standing-hip-abduction", "cable-standing-hip-adduction",
  // back / core
  "straight-arm-pulldown", "shrug", "dumbbell-shrug", "cable-crunch", "crunch", "reverse-crunch",
  "weighted-crunch", "dumbbell-side-bend",
]);

/** Isolation work that earns a slot last: front raises duplicate what every
 *  press already trains, so lateral and rear-delt work should come first. */
export const LOW_PRIORITY_ISOLATION_SLUGS: ReadonlySet<string> = new Set([
  "front-raise",
  "plate-front-raise",
  "cable-front-raise",
]);

/** How hard an exercise is to do well: 1 = foundational, 2 = intermediate,
 *  3 = challenging. Tier 1 is the beginner pool, so it is an allowlist: stable,
 *  common moves (guided machines, cables, simple dumbbell work, easy bodyweight
 *  variations) that need no real technique or setup. An exercise on neither
 *  list below is tier 2, so a newly added catalog entry never reaches a
 *  beginner until someone has reviewed it. */
export type ExerciseDifficulty = 1 | 2 | 3;

/** Tier 1 — what beginners are given. */
export const FOUNDATIONAL_SLUGS: ReadonlySet<string> = new Set([
  // chest
  "machine-chest-press", "smith-machine-bench-press", "dumbbell-bench-press", "pec-deck", "cable-fly",
  "push-up", "knee-push-up", "incline-push-up", "wall-push-up",
  // shoulders / rear delts / upper back
  "machine-shoulder-press", "seated-dumbbell-press", "lateral-raise", "cable-lateral-raise",
  "machine-lateral-raise", "reverse-pec-deck", "cable-rear-delt-fly", "face-pull", "dumbbell-shrug",
  "prone-y-raise", "prone-t-raise", "band-pull-apart", "banded-face-pull",
  // back / lats
  "chest-supported-row", "seated-row", "machine-row", "one-arm-dumbbell-row", "single-arm-cable-row",
  "banded-row", "lat-pulldown", "close-grip-lat-pulldown", "wide-grip-lat-pulldown", "assisted-pull-up",
  "banded-lat-pulldown",
  // arms
  "bicep-curl", "hammer-curl", "cable-curl", "preacher-curl", "assisted-chin-up", "rope-hammer-curl",
  "tricep-pushdown", "rope-tricep-pushdown", "assisted-dip", "tricep-kickback",
  "dumbbell-overhead-tricep-extension",
  // quads / hamstrings
  "leg-press", "leg-extension", "goblet-squat", "bodyweight-squat", "smith-machine-squat", "step-up",
  "wall-sit", "forward-lunge", "banded-squat", "leg-curl", "seated-leg-curl", "lying-leg-curl",
  "dumbbell-romanian-deadlift",
  // glutes / calves / adductors / lower back
  "glute-bridge", "dumbbell-glute-bridge", "dumbbell-hip-thrust", "cable-kickback", "hip-abduction-machine",
  "machine-glute-kickback", "cable-standing-hip-abduction", "dumbbell-sumo-squat", "frog-pump", "donkey-kick",
  "fire-hydrant", "clamshell", "side-lying-hip-abduction", "side-lying-leg-raise", "banded-glute-bridge",
  "banded-clamshell", "banded-lateral-walk", "banded-monster-walk", "banded-donkey-kick",
  "banded-fire-hydrant", "banded-kickback", "banded-standing-hip-abduction", "banded-seated-hip-abduction",
  "standing-calf-raise", "seated-calf-raise", "leg-press-calf-raise", "calf-raise",
  "cable-standing-hip-adduction", "hip-adduction-machine", "back-extension", "superman", "superman-hold",
  // core
  "plank", "crunch", "reverse-crunch", "cable-crunch", "bicycle-crunch", "dead-bug", "bird-dog",
  "pallof-press", "captains-chair-knee-raise", "dumbbell-side-bend", "banded-pallof-press", "flutter-kick",
  "heel-tap", "seated-knee-tuck", "farmer-carry",
  // conditioning
  "walking", "cycling", "elliptical", "stair-climber", "treadmill-incline-walk", "jumping-jack", "high-knees",
]);

/** Tier 3 — demanding, technical or awkward to set up. The elite calisthenics
 *  skills above are always tier 3 too. */
export const CHALLENGING_SLUGS: ReadonlySet<string> = new Set([
  "decline-bench-press", "decline-dumbbell-press", "dip",
  "upright-row", "push-press", "feet-elevated-pike-push-up", "wall-walk",
  "deadlift", "sumo-deadlift", "good-morning", "single-leg-romanian-deadlift", "landmine-romanian-deadlift",
  "pendlay-row", "meadows-row", "rack-pull", "skierg",
  "pull-up", "neutral-grip-pull-up", "negative-pull-up", "towel-pull-up", "chin-up", "drag-curl",
  "skull-crusher",
  "front-squat", "belt-squat", "bulgarian-split-squat", "smith-machine-bulgarian-split-squat",
  "front-foot-elevated-split-squat", "jump-squat", "assisted-pistol-squat", "cossack-squat", "skater-squat",
  "single-leg-box-squat",
  "deficit-reverse-lunge", "dumbbell-curtsy-lunge", "kettlebell-swing", "hip-airplane",
  "hanging-leg-raise", "ab-wheel", "weighted-russian-twist", "v-up", "squat-thrust", "burpee", "sprawl",
  "skater-hop",
]);

export function exerciseDifficulty(slug: string): ExerciseDifficulty {
  if (ADVANCED_SKILL_SLUGS.has(slug) || CHALLENGING_SLUGS.has(slug)) return 3;
  return FOUNDATIONAL_SLUGS.has(slug) ? 1 : 2;
}

/** The hardest tier a level is given by default, and the hardest it may ever be
 *  stretched to when too few exercises fit (a bodyweight-only setup has few
 *  tier-1 moves). Beginners are never given tier 3; advanced lifters get it all. */
export const DIFFICULTY_LIMITS: Record<OnboardingExperience, { start: ExerciseDifficulty; max: ExerciseDifficulty }> = {
  no_experience: { start: 1, max: 2 },
  beginner: { start: 1, max: 2 },
  intermediate: { start: 2, max: 3 },
  advanced: { start: 3, max: 3 },
};

const NOVICE: ReadonlySet<OnboardingExperience> = new Set(["no_experience", "beginner"]);

export function isAdvancedSkill(slug: string): boolean {
  return ADVANCED_SKILL_SLUGS.has(slug);
}

/** Can this person safely be given this exercise at their level? */
export function suitsExperience(slug: string, experience: OnboardingExperience): boolean {
  return !(NOVICE.has(experience) && ADVANCED_SKILL_SLUGS.has(slug));
}

/** The prescription for one main-block exercise: timed work is a hold time,
 *  single-joint work gets a higher rep range, and everything else keeps the
 *  program's heavy-compound rep range. */
export function repsForExercise(slug: string, baseReps: string, goal: string | null): string {
  if (TIMED_SLUGS.has(slug)) return "30-45 sec";
  if (ISOLATION_SLUGS.has(slug)) return goal === "lose_weight" ? "12-15" : "10-15";
  return baseReps;
}
