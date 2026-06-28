"use server";

import {
  AGE_BANDS,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  TRAINING_GOALS,
} from "@pacergo/shared";
import { loadPlanMarkdown, type PlanSelection } from "./plan-loader";

/**
 * Return the authored training-plan markdown for a selection. The plans are
 * static, pre-written content (no external LLM call); the UI plays a short
 * "generating" animation for feel.
 */
export async function generateTrainingPlan(
  sel: PlanSelection,
): Promise<{ markdown: string } | { error: "invalid" | "missing" }> {
  const valid =
    TRAINING_GOALS.includes(sel.goal) &&
    PLAN_GENDERS.includes(sel.gender) &&
    EXPERIENCE_LEVELS.includes(sel.level) &&
    AGE_BANDS.includes(sel.ageBand) &&
    (sel.locale === "zh" || sel.locale === "en");
  if (!valid) return { error: "invalid" };

  const markdown = await loadPlanMarkdown(sel);
  if (!markdown) return { error: "missing" };
  return { markdown };
}
