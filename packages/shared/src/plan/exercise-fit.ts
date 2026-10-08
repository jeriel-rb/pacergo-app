import type { OnboardingExperience } from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "./generated-plan-types";
import { exerciseDifficulty, ISOLATION_SLUGS, isAdvancedSkill, type ExerciseDifficulty } from "./exercise-meta";

/** How an exercise is loaded — derived from the equipment it needs. */
export type ExerciseModality =
  | "barbell"
  | "free_weight"
  | "cable"
  | "machine"
  | "loadable_bodyweight"
  | "band"
  | "bodyweight";

const GUIDED = new Set(["smith_machine", "hack_squat_machine"]);
const BARBELL = new Set(["barbell", "ez_bar", "trap_bar", "landmine"]);
const FREE_WEIGHT = new Set(["dumbbells", "kettlebell", "plates"]);
const CABLE = new Set(["cable_machine", "lat_pulldown"]);
const MACHINE = new Set([
  "smith_machine",
  "chest_press_machine",
  "pec_deck",
  "shoulder_press_machine",
  "lateral_raise_machine",
  "row_machine",
  "chest_supported_row_machine",
  "leg_press",
  "leg_extension_machine",
  "leg_curl_machine",
  "lying_leg_curl_machine",
  "hack_squat_machine",
  "calf_machine",
  "hip_machine",
  "assisted_machine",
  "preacher_bench",
  "back_extension_bench",
]);
/** Bodyweight work that scales with skill and added load (pull-ups, dips). */
const LOADABLE_BODYWEIGHT = new Set(["pull_up_bar", "dip_station"]);

export function exerciseModality(e: Pick<ExerciseRecord, "slug" | "equipment">): ExerciseModality {
  const eq = e.equipment;
  if (eq) {
    if (eq.length === 0) return "bodyweight";
    if (eq.some((id) => BARBELL.has(id))) return "barbell";
    if (eq.some((id) => FREE_WEIGHT.has(id))) return "free_weight";
    if (eq.some((id) => CABLE.has(id))) return "cable";
    if (eq.some((id) => MACHINE.has(id))) return "machine";
    if (eq.some((id) => LOADABLE_BODYWEIGHT.has(id))) return "loadable_bodyweight";
    if (eq.includes("resistance_bands")) return "band";
    return "bodyweight";
  }
  // Older data without an equipment column: best effort from the slug.
  const s = e.slug;
  if (/barbell|deadlift|ez[-_]bar|landmine/.test(s)) return "barbell";
  if (/dumbbell|kettlebell|goblet/.test(s)) return "free_weight";
  if (/cable|pulldown|face[-_]pull|pushdown/.test(s)) return "cable";
  if (/machine|press[-_]machine|leg[-_]press|leg[-_](extension|curl)|pec[-_]deck|smith/.test(s)) return "machine";
  if (/pull[-_]up|chin[-_]up|dip/.test(s)) return "loadable_bodyweight";
  if (/band/.test(s)) return "band";
  return "bodyweight";
}

/** Lifts that need real technique to load safely. */
const TECHNICAL = /deadlift|clean|snatch|front[-_]squat|good[-_]morning|pistol|muscle[-_]up|overhead[-_]squat|pendlay/;

/** 0 = simple, 1 = moderate, 2 = technical. Free-weight compounds (2+
 *  non-core muscle groups) are moderate; barbell compounds and named
 *  technical lifts are technical. */
export function exerciseComplexity(e: Pick<ExerciseRecord, "slug" | "equipment" | "muscleGroups">): 0 | 1 | 2 {
  if (TECHNICAL.test(e.slug) || isAdvancedSkill(e.slug)) return 2;
  const modality = exerciseModality(e);
  const compound = e.muscleGroups.filter((m) => m !== "cardio" && m !== "core" && m !== "abs").length >= 2;
  if (modality === "barbell") return compound ? 2 : 1;
  if (modality === "loadable_bodyweight") return 1;
  if (modality === "free_weight" && compound) return 1;
  return 0;
}

/** Preference for each kind of loading, per experience level. Beginners lean
 *  on guided machines, cables and dumbbells; trained lifters on barbell and
 *  free-weight work. Bands and plain bodyweight drop to last resort for
 *  advanced users — still picked when nothing loaded fits (e.g. a
 *  bodyweight-only setup), never by default. */
const MODALITY_FIT: Record<OnboardingExperience, Record<ExerciseModality, number>> = {
  no_experience: { machine: 4, cable: 3, free_weight: 3, bodyweight: 3, band: 2, loadable_bodyweight: 0, barbell: 0 },
  beginner: { machine: 4, free_weight: 4, cable: 3, bodyweight: 2, barbell: 2, band: 1, loadable_bodyweight: 1 },
  intermediate: { barbell: 4, free_weight: 4, cable: 3, machine: 3, loadable_bodyweight: 3, bodyweight: 1, band: 0 },
  advanced: { barbell: 5, free_weight: 4, loadable_bodyweight: 4, cable: 3, machine: 3, bodyweight: 0, band: -2 },
};

/** Penalty (or bonus) per complexity level. */
const COMPLEXITY_FIT: Record<OnboardingExperience, readonly [number, number, number]> = {
  no_experience: [1, -1, -6],
  beginner: [1, 0, -3],
  intermediate: [0, 1, 1],
  advanced: [0, 1, 2],
};

/** Preference per difficulty tier (see `exerciseDifficulty`). Beginners are
 *  held to tier 1 by the pool filter, so this only orders any stretch into
 *  tier 2; it is weighted heavily so an easy move always outranks a harder one
 *  of the same muscle. Intermediates favor tier 2 over tier 1, advanced
 *  lifters the harder work. */
const DIFFICULTY_FIT: Record<OnboardingExperience, Record<ExerciseDifficulty, number>> = {
  no_experience: { 1: 12, 2: 0, 3: -12 },
  beginner: { 1: 12, 2: 0, 3: -12 },
  intermediate: { 1: 1, 2: 3, 3: -1 },
  advanced: { 1: 0, 2: 2, 3: 3 },
};

/** How well an exercise suits a training level — higher is better. Used to
 *  rank the (already equipment-filtered) pool, so experience changes which
 *  exercises are chosen, not just sets and reps. */
export function experienceFit(e: ExerciseRecord, experience: OnboardingExperience): number {
  return (
    MODALITY_FIT[experience][exerciseModality(e)] +
    COMPLEXITY_FIT[experience][exerciseComplexity(e)] +
    DIFFICULTY_FIT[experience][exerciseDifficulty(e.slug)]
  );
}

/** How stable the setup is. Smith and hack squat are guided: steadier than a
 *  free barbell, less fixed than a chest-press machine. */
export type ExerciseStability =
  | "machine"
  | "cable"
  | "guided"
  | "free_weight"
  | "barbell"
  | "loadable_bodyweight"
  | "bodyweight"
  | "band";

const STABILITY_RUNG: Record<ExerciseStability, number> = {
  machine: 0,
  cable: 1,
  free_weight: 2,
  guided: 3,
  barbell: 4,
  loadable_bodyweight: 5,
  bodyweight: 6,
  band: 7,
};

/** Lower = easier setup. Used to step weeks from light → heavier variations. */
export function exerciseEase(e: Pick<ExerciseRecord, "slug" | "equipment">): number {
  return STABILITY_RUNG[exerciseStability(e)];
}

/**
 * Easy → hard order inside the same equipment rung (e.g. all bodyweight).
 * When every option shares `exerciseEase`, A–Z would put wall-push-up after
 * full push-up — this rank stops that. Unknown slugs sit in the middle so
 * they neither steal week 1 nor block the top of the ladder.
 */
export function patternProgressionRank(slug: string): number {
  // Push-up family
  if (slug === "wall-push-up") return 0;
  if (slug === "incline-push-up") return 1;
  if (slug === "knee-push-up") return 2;
  if (slug === "push-up") return 3;
  if (slug === "diamond-push-up" || slug === "decline-push-up") return 4;
  if (slug === "weighted-push-up" || slug === "archer-push-up") return 5;

  // Squat / single-leg family
  if (slug === "wall-sit") return 0;
  if (slug === "bodyweight-squat") return 1;
  if (slug === "goblet-squat" || slug.endsWith("box-squat")) return 2;
  if (/^(forward|lateral|reverse)-lunge$|^step-up$|^split-squat$/.test(slug)) return 3;
  if (/bulgarian|walking-lunge/.test(slug)) return 4;
  if (/pistol|shrimp/.test(slug)) return 5;

  // Pull-up / chin-up family
  if (/^assisted-(pull|chin)-up$/.test(slug)) return 0;
  if (/negative/.test(slug)) return 1;
  if (/^(pull|chin)-up$/.test(slug)) return 2;
  if (/weighted|archer|typewriter/.test(slug) && /(pull|chin)-up/.test(slug)) return 3;

  // Dip family
  if (slug === "chair-dip" || slug === "bench-dip") return 0;
  if (slug === "assisted-dip") return 1;
  if (slug === "dip") return 2;
  if (slug === "weighted-dip") return 3;

  return 50;
}

export function exerciseStability(e: Pick<ExerciseRecord, "slug" | "equipment">): ExerciseStability {
  // An assisted pull-up or dip is a bodyweight move with a counterweight, not
  // a selectorized machine. It waits until no pulldown or pushdown exists.
  if (e.slug.startsWith("assisted-")) return "loadable_bodyweight";
  const eq = e.equipment;
  if (eq && eq.length > 0 && eq.some((id) => GUIDED.has(id)) && !eq.some((id) => BARBELL.has(id))) return "guided";
  const modality = exerciseModality(e);
  return modality === "machine" ? "machine" : modality;
}

/** Pattern = the main lift for a muscle. Isolation = one joint. Skill = a
 *  calisthenics move beginners are not given even as a fallback. */
export function exerciseRole(slug: string): "pattern" | "isolation" | "skill" {
  if (isAdvancedSkill(slug)) return "skill";
  if (ISOLATION_SLUGS.has(slug)) return "isolation";
  return "pattern";
}

/** Hardest setup a level may progress to later in the same 4-week block.
 *  Week 1 still leads with the easiest option; later weeks step up this ladder
 *  (machine → free weight → barbell) so weeks are visibly harder, not a remix. */
const LADDER_MAX: Record<OnboardingExperience, number> = {
  no_experience: STABILITY_RUNG.bodyweight,
  beginner: STABILITY_RUNG.bodyweight,
  intermediate: STABILITY_RUNG.bodyweight,
  advanced: 99,
};

/** Within one rung, which setup leads. Beginners: machine then cable.
 *  Advanced: barbell then dumbbell, machine as the fallback. */
const STABILITY_ORDER: Record<OnboardingExperience, readonly ExerciseStability[]> = {
  no_experience: ["machine", "cable", "guided", "free_weight", "barbell", "loadable_bodyweight", "bodyweight", "band"],
  beginner: ["machine", "cable", "guided", "free_weight", "barbell", "loadable_bodyweight", "bodyweight", "band"],
  intermediate: ["guided", "free_weight", "barbell", "machine", "cable", "loadable_bodyweight", "bodyweight", "band"],
  advanced: ["barbell", "free_weight", "guided", "loadable_bodyweight", "machine", "cable", "bodyweight", "band"],
};

/** The obvious lead for a muscle at this level. Missing slugs are simply
 *  skipped. This is what stops an alphabetical tie from choosing the exercise. */
const STAPLES: Record<"novice" | "trained" | "advanced", Record<string, readonly string[]>> = {
  novice: {
    chest: ["machine-chest-press", "smith-machine-bench-press", "dumbbell-bench-press", "push-up"],
    lats: ["lat-pulldown", "assisted-pull-up", "pull-up"],
    back: ["seated-row", "chest-supported-row", "machine-row", "barbell-row"],
    upper_back: ["face-pull", "seated-row", "band-pull-apart"],
    shoulders: ["machine-shoulder-press", "seated-dumbbell-press", "overhead-press"],
    triceps: ["tricep-pushdown", "rope-tricep-pushdown", "assisted-dip"],
    biceps: ["cable-curl", "bicep-curl", "hammer-curl"],
    quads: ["leg-press", "hack-squat", "goblet-squat", "bodyweight-squat", "squat"],
    hamstrings: ["seated-leg-curl", "lying-leg-curl", "leg-curl", "dumbbell-romanian-deadlift", "romanian-deadlift"],
    glutes: ["hip-abduction-machine", "machine-glute-kickback", "glute-bridge", "hip-thrust"],
    calves: ["standing-calf-raise", "seated-calf-raise", "leg-press-calf-raise"],
    abs: ["crunch", "cable-crunch", "plank"],
    core: ["plank", "dead-bug", "cable-crunch"],
    lower_abs: ["reverse-crunch", "dead-bug"],
  },
  trained: {
    chest: ["bench-press", "dumbbell-bench-press", "machine-chest-press", "incline-bench-press"],
    lats: ["lat-pulldown", "pull-up", "assisted-pull-up"],
    back: ["barbell-row", "seated-row", "dumbbell-bent-over-row"],
    shoulders: ["overhead-press", "seated-dumbbell-press", "machine-shoulder-press"],
    quads: ["squat", "hack-squat", "leg-press", "goblet-squat"],
    hamstrings: ["romanian-deadlift", "seated-leg-curl", "leg-curl"],
    glutes: ["hip-thrust", "barbell-glute-bridge", "hip-abduction-machine"],
    triceps: ["tricep-pushdown", "close-grip-bench-press"],
    biceps: ["bicep-curl", "hammer-curl", "cable-curl"],
  },
  advanced: {
    chest: ["bench-press", "incline-bench-press", "dumbbell-bench-press", "machine-chest-press"],
    lats: ["pull-up", "lat-pulldown", "weighted-pull-up"],
    back: ["barbell-row", "seated-row"],
    shoulders: ["overhead-press", "seated-dumbbell-press", "machine-shoulder-press"],
    quads: ["squat", "front-squat", "hack-squat", "leg-press"],
    hamstrings: ["romanian-deadlift", "deadlift", "seated-leg-curl"],
    glutes: ["hip-thrust", "barbell-glute-bridge", "hip-abduction-machine"],
    triceps: ["close-grip-bench-press", "tricep-pushdown", "dip"],
    biceps: ["bicep-curl", "hammer-curl", "chin-up"],
  },
};

function stapleBucket(experience: OnboardingExperience): "novice" | "trained" | "advanced" {
  if (experience === "advanced") return "advanced";
  if (experience === "intermediate") return "trained";
  return "novice";
}

/** Upper and lower chest share one slot, matching `pickMain`. */
export function canonMuscle(muscle: string): string {
  return muscle === "upper_chest" || muscle === "lower_chest" ? "chest" : muscle;
}

/**
 * Drop setups that are needlessly hard for this level, per muscle.
 * A beginner who has any machine or cable for that muscle stays there, so a
 * pushdown keeps out a close-grip bench. With neither, the next pattern is a
 * dumbbell, then a Smith or hack squat, then a barbell, then bodyweight.
 * Skills stay advanced-only. Bands stay last.
 */
export function restrictToLevel(
  exercises: readonly ExerciseRecord[],
  experience: OnboardingExperience,
): ExerciseRecord[] {
  const home = LADDER_MAX[experience];
  const groups = new Map<string, ExerciseRecord[]>();
  for (const e of exercises) {
    if (exerciseRole(e.slug) === "skill" && experience !== "advanced") continue;
    const muscle = canonMuscle(e.muscleGroups[0] ?? "");
    const list = groups.get(muscle) ?? [];
    list.push(e);
    groups.set(muscle, list);
  }

  const kept: ExerciseRecord[] = [];
  for (const list of groups.values()) {
    const rung = (e: ExerciseRecord) => STABILITY_RUNG[exerciseStability(e)];
    const atHome = list.filter((e) => rung(e) <= home);
    let ceiling = home;
    // A cable pushdown or leg curl counts: don't climb to a barbell while any
    // machine or cable option is still in the pool. Climb only when the muscle
    // has nothing at this level, and stop at the easiest pattern above it.
    if (atHome.length === 0) {
      const patterns = list.filter((e) => exerciseRole(e.slug) === "pattern");
      const anchors = patterns.length > 0 ? patterns : list;
      const next = anchors
        .map(rung)
        .filter((value) => value > home)
        .sort((a, b) => a - b)[0];
      if (next !== undefined) ceiling = next;
    }
    for (const e of list) {
      if (rung(e) > ceiling) continue;
      // True beginners can step up to dumbbells and bodyweight, not a barbell or pull-up.
      if (
        experience === "no_experience" &&
        (exerciseStability(e) === "barbell" || exerciseStability(e) === "loadable_bodyweight")
      ) {
        continue;
      }
      kept.push(e);
    }
  }
  return kept;
}

/** Total order inside the level's pool. Role, then the level's setup order,
 *  then the staple list, then the slug so two true duplicates stay stable. */
export function compareForLevel(a: ExerciseRecord, b: ExerciseRecord, experience: OnboardingExperience): number {
  const roleOrder = { pattern: 0, isolation: 1, skill: 2 } as const;
  const byRole = roleOrder[exerciseRole(a.slug)] - roleOrder[exerciseRole(b.slug)];
  if (byRole !== 0) return byRole;

  const order = STABILITY_ORDER[experience];
  const byStability = order.indexOf(exerciseStability(a)) - order.indexOf(exerciseStability(b));
  if (byStability !== 0) return byStability;

  const muscle = canonMuscle(a.muscleGroups[0] ?? "");
  const staples = STAPLES[stapleBucket(experience)][muscle] ?? [];
  const index = (slug: string) => {
    const at = staples.indexOf(slug);
    return at === -1 ? staples.length : at;
  };
  const byStaple = index(a.slug) - index(b.slug);
  if (byStaple !== 0) return byStaple;
  return a.slug.localeCompare(b.slug);
}
