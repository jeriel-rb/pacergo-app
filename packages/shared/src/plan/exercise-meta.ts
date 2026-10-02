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
  "seated-calf-raise", "donkey-calf-raise", "leg-press-calf-raise", "calf-raise", "single-leg-calf-raise",
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
