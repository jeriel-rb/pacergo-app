"use server";

import {
  DIET_MODES,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  TRAINING_FREQUENCIES,
  TRAINING_GOALS,
  TRAINING_LOCATIONS,
  WEIGHT_CLASSES,
  composeTrainingPlan,
  renderPlanMarkdown,
  type PlanSelection,
} from "@pacergo/shared";

/**
 * Compose the training-menu markdown for a selection. Plans are assembled
 * deterministically from authored content (no external LLM call); the UI
 * plays a short "generating" animation for feel.
 */
export async function generateTrainingPlan(
  sel: PlanSelection,
): Promise<{ markdown: string } | { error: "invalid" }> {
  const valid =
    TRAINING_GOALS.includes(sel.goal) &&
    PLAN_GENDERS.includes(sel.gender) &&
    EXPERIENCE_LEVELS.includes(sel.level) &&
    WEIGHT_CLASSES.includes(sel.weightClass) &&
    TRAINING_FREQUENCIES.includes(sel.frequency) &&
    TRAINING_LOCATIONS.includes(sel.location) &&
    DIET_MODES.includes(sel.dietMode) &&
    (sel.locale === "zh" || sel.locale === "en");
  if (!valid) return { error: "invalid" };

  return { markdown: renderPlanMarkdown(composeTrainingPlan(sel), sel.locale) };
}
