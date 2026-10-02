import type { OnboardingExperience } from "../onboarding/onboarding-types";
import type { ExerciseRecord } from "./generated-plan-types";
import { isAdvancedSkill } from "./exercise-meta";

/** How an exercise is loaded — derived from the equipment it needs. */
export type ExerciseModality =
  | "barbell"
  | "free_weight"
  | "cable"
  | "machine"
  | "loadable_bodyweight"
  | "band"
  | "bodyweight";

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
  if (eq && eq.length > 0) {
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

/** How well an exercise suits a training level — higher is better. Used to
 *  rank the (already equipment-filtered) pool, so experience changes which
 *  exercises are chosen, not just sets and reps. */
export function experienceFit(e: ExerciseRecord, experience: OnboardingExperience): number {
  return MODALITY_FIT[experience][exerciseModality(e)] + COMPLEXITY_FIT[experience][exerciseComplexity(e)];
}
