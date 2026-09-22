import { EXERCISE_CATALOG } from "./exercise-catalog";

/**
 * Exercise/equipment line art from bryllim/workout-guide (CC BY-SA 4.0,
 * derived from Everkinetic). The files under `public/exercise-art/` are synced
 * by `apps/web/scripts/sync-exercise-art.mjs` (all 302 exercises, 3 frames
 * each). Attribution lives on `/credits`, linked from the Terms of Service and
 * Privacy Policy pages rather than from the art itself — keep that link when
 * touching those pages, and keep the license/attribution files in
 * `public/exercise-art/`.
 */

const ART_DIR = "/exercise-art";

const AVAILABLE = new Set(EXERCISE_CATALOG.map((entry) => entry.slug));

/** Frame image for an art slug (1 = start, 2 = mid, 3 = end position). */
export function exerciseArtFrame(artSlug: string, frame: 1 | 2 | 3 = 1): string {
  return `${ART_DIR}/${artSlug}/frame-${frame}.svg`;
}

/** Legacy exercise slugs (the old snake_case `exercises.slug` list, still
 *  found in plans saved before the library moved to catalog slugs) whose
 *  catalog slug isn't simply the same name with hyphens. Anything not here and not a hyphenated
 *  match has no art and the detail screen keeps its "coming soon" block. */
const DB_SLUG_TO_ART: Record<string, string> = {
  air_bike_intervals: "assault-bike",
  assisted_dip_machine: "assisted-dip",
  barbell_back_squat: "squat",
  barbell_bench_press: "bench-press",
  barbell_bent_over_row: "barbell-row",
  barbell_deadlift: "deadlift",
  barbell_front_squat: "front-squat",
  barbell_hip_thrust: "hip-thrust",
  barbell_overhead_press: "overhead-press",
  cable_bicep_curl: "cable-curl",
  cable_face_pull: "face-pull",
  cable_tricep_pushdown: "tricep-pushdown",
  cable_woodchopper: "cable-woodchop",
  chest_press_machine: "machine-chest-press",
  dumbbell_bicep_curl: "bicep-curl",
  dumbbell_goblet_squat: "goblet-squat",
  kettlebell_goblet_squat: "goblet-squat",
  dumbbell_hammer_curl: "hammer-curl",
  dumbbell_lateral_raise: "lateral-raise",
  dumbbell_row: "one-arm-dumbbell-row",
  dumbbell_shoulder_press: "seated-dumbbell-press",
  dumbbell_step_up: "step-up",
  dumbbell_tricep_kickback: "tricep-kickback",
  elliptical_steady_state: "elliptical",
  flat_bench_dumbbell_fly: "dumbbell-fly",
  incline_barbell_bench_press: "incline-bench-press",
  jumping_jacks: "jumping-jack",
  ski_erg: "skierg",
  leg_raise: "lying-leg-raise",
  mountain_climbers: "mountain-climber",
  outdoor_cycling: "cycling",
  pec_deck_fly: "pec-deck",
  resistance_band_lateral_walk: "banded-lateral-walk",
  resistance_band_row: "banded-row",
  resistance_band_squat: "banded-squat",
  rope_tricep_overhead_extension: "overhead-tricep-extension",
  rowing_machine: "rowing",
  seated_cable_row: "seated-row",
  seated_calf_raise_machine: "seated-calf-raise",
  shoulder_press_machine: "machine-shoulder-press",
  standing_calf_raise_bodyweight: "calf-raise",
  standing_calf_raise_machine: "standing-calf-raise",
  stationary_bike: "cycling",
  treadmill_run: "running",
  tricep_dips_chair: "chair-dip",
};

export const EXERCISE_ART_ALIAS_TARGETS: readonly string[] = Object.values(DB_SLUG_TO_ART);

/** The art slug for a seeded exercise, or `null` if there's no matching
 *  artwork. */
export function exerciseArtSlugForDbSlug(dbSlug: string): string | null {
  const artSlug = DB_SLUG_TO_ART[dbSlug] ?? dbSlug.replace(/_/g, "-");
  return AVAILABLE.has(artSlug) ? artSlug : null;
}

export function hasExerciseArt(artSlug: string): boolean {
  return AVAILABLE.has(artSlug);
}
