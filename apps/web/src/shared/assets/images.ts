import { ONBOARDING_MUSCLE_GROUPS, type OnboardingMuscleGroup } from "@pacergo/shared";

/**
 * Centralized image-asset registry for the web app. Add new asset groups
 * here (not inline in components/features) so a path or filename only ever
 * needs to change in one place.
 */

const MUSCLE_ASSET_DIR = "/images/focused_muscles";

/**
 * On-disk filename for each muscle-picker tile — named after the muscle the
 * artwork highlights. Some tiles are derived by recolouring another tile
 * (scripts/derive-*.mjs, e.g. obliques from abs). Calves still needs art:
 * nothing is highlighted in calves.jpg.
 */
const MUSCLE_GROUP_IMAGE_FILES: Record<OnboardingMuscleGroup, string> = {
  abs: "abs.jpg",
  trapezius: "trapezius.jpg",
  front_deltoid: "front_deltoid.jpg",
  calves: "calves.jpg",
  shins: "shins.jpg",
  middle_chest: "middle_chest.jpg",
  forearms: "forearms.jpg",
  biceps: "biceps.jpg",
  triceps: "triceps.jpg",
  hip_flexors: "hip_flexors.jpg",
  quadriceps: "quadriceps.jpg",
  lower_back: "lower_back.jpg",
  obliques: "obliques.jpg",
  upper_chest: "upper_chest.jpg",
  lats: "lats.jpg",
  hamstrings: "hamstrings.jpg",
  lower_chest: "lower_chest.jpg",
  lower_abs: "lower_abs.jpg",
  adductors: "adductors.jpg",
  rear_deltoid: "rear_deltoid.jpg",
  middle_deltoid: "middle_deltoid.jpg",
  upper_back: "upper_back.jpg",
  abductors: "abductors.jpg",
  glutes: "glutes.jpg",
  neck: "neck.jpg",
};

/** Body-outline artwork for each muscle group, used by the "Focused
 *  Muscles"/"Excluded Muscles" pickers. */
export const MUSCLE_GROUP_IMAGES: Record<OnboardingMuscleGroup, string> = Object.fromEntries(
  ONBOARDING_MUSCLE_GROUPS.map((key) => [
    key,
    `${MUSCLE_ASSET_DIR}/${MUSCLE_GROUP_IMAGE_FILES[key]}`,
  ]),
) as Record<OnboardingMuscleGroup, string>;

/** Picker layout: each family of neighbouring muscles is one row (client:
 *  "相近肌群放同一列", e.g. front/middle/rear delts side by side), grouped
 *  under the upper/lower body heading. Muscles not selectable yet (no
 *  exercises) are filtered out by the picker. */
export const MUSCLE_FAMILIES: readonly {
  key: string;
  region: "upper" | "lower";
  muscles: readonly OnboardingMuscleGroup[];
}[] = [
  { key: "shoulders", region: "upper", muscles: ["front_deltoid", "middle_deltoid", "rear_deltoid"] },
  { key: "chest", region: "upper", muscles: ["upper_chest", "middle_chest", "lower_chest"] },
  { key: "back", region: "upper", muscles: ["trapezius", "upper_back", "lats", "lower_back", "neck"] },
  { key: "arms", region: "upper", muscles: ["biceps", "triceps", "forearms"] },
  { key: "core", region: "upper", muscles: ["abs", "lower_abs", "obliques"] },
  { key: "hips", region: "lower", muscles: ["glutes", "hip_flexors", "abductors", "adductors"] },
  { key: "legs", region: "lower", muscles: ["quadriceps", "hamstrings", "calves", "shins"] },
];
