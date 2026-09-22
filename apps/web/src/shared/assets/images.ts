import { ONBOARDING_MUSCLE_GROUPS, type OnboardingMuscleGroup } from "@pacergo/shared";

/**
 * Centralized image-asset registry for the web app. Add new asset groups
 * here (not inline in components/features) so a path or filename only ever
 * needs to change in one place.
 */

const MUSCLE_ASSET_DIR = "/images/focused_muscles";

/**
 * On-disk filename for each muscle-picker tile. Verified filenames are the
 * source of truth (match the onboarding key). Assets still carrying a `1` in
 * the name are unverified WIP — leave those files alone until renamed.
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

/** Which section a muscle group is grouped under in the picker UI. */
export const MUSCLE_GROUP_REGION: Record<OnboardingMuscleGroup, "upper" | "lower"> = {
  abs: "upper",
  obliques: "upper",
  lower_abs: "upper",
  upper_chest: "upper",
  middle_chest: "upper",
  lower_chest: "upper",
  upper_back: "upper",
  lower_back: "upper",
  lats: "upper",
  trapezius: "upper",
  neck: "upper",
  front_deltoid: "upper",
  middle_deltoid: "upper",
  rear_deltoid: "upper",
  biceps: "upper",
  triceps: "upper",
  forearms: "upper",
  quadriceps: "lower",
  hamstrings: "lower",
  glutes: "lower",
  calves: "lower",
  shins: "lower",
  adductors: "lower",
  abductors: "lower",
  hip_flexors: "lower",
};
