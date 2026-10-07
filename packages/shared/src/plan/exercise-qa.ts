import type { ExerciseRecord } from "./generated-plan-types";

/**
 * Exercises that failed the library QA review and must NOT be generated into
 * AI plans until fixed. Each entry says why. The generator filters these out
 * before it selects anything (see `isAiEligible`), so they can't be reached by
 * any path. They stay visible in the browsable exercise library.
 *
 * QA covered the illustrated library: illustration vs name, equipment
 * shown, anatomical plausibility, and instructions vs illustration. An
 * exercise returns to the pool once its illustration (or instructions) is
 * corrected and it is removed from this list.
 */
export const QA_EXCLUDED_EXERCISES: Readonly<Record<string, string>> = {
  // Instructions describe one movement, the illustration shows another.
  "wrist-curl": "Drawn as a standing barbell curl; instructions describe a seated wrist curl.",
  "wrist-extension": "Drawn standing; instructions describe forearms resting on the thighs.",
  "toe-touch": "Drawn as a standing forward fold; instructions describe a lying toe-touch crunch.",
  "torso-twist-stretch": "Drawn as a seated weighted twist; instructions describe a standing mobility twist.",
  // Equipment shown does not match the equipment listed.
  "spider-curl": "Drawn with a barbell; listed (and instructed) as dumbbell.",
  "lying-hamstring-walkout": "Drawn with suspension straps; listed and instructed as bodyweight.",
  // Illustration does not show what the name requires.
  dip: "No dip bars drawn; the figure appears to be kneeling.",
  "neutral-grip-pull-up": "Drawn on a straight bar; a neutral grip needs parallel handles.",
};

/** Minimum reliable data an exercise needs before the AI may generate it:
 *  instructions, a muscle mapping, an illustration, and a QA pass. Missing
 *  optional flags (older data) don't block; an explicit `false` does. */
export function isAiEligible(
  e: Pick<ExerciseRecord, "slug" | "muscleGroups" | "hasInstructions" | "hasIllustration">,
): boolean {
  if (QA_EXCLUDED_EXERCISES[e.slug]) return false;
  if (e.muscleGroups.length === 0) return false;
  if (e.hasInstructions === false) return false;
  if (e.hasIllustration === false) return false;
  return true;
}
