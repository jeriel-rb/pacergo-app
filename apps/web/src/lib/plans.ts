"use client";

import {
  applyProfileToPlan,
  calculateNutrition,
  generateTrainingPlan,
  planInputsSignature,
  toFitnessProfile,
  type GeneratedPlan,
  upgradeLegacyEquipment,
  type GymEquipmentAnswers,
  type NutritionTargets,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAllExercises } from "@/lib/exercises";
import {
  FITNESS_PROFILE_COLUMNS,
  parseFitnessProfileRow,
  type NutritionStatus,
  type SavedFitnessProfile,
} from "@/lib/fitness-profile-row";
import { fetchPlanPerformanceHistory } from "@/lib/workout-logs";

/** The signed-in user's id, client-side. `/ai-plan` is fully auth-gated by
 *  middleware, so a null here would mean the session expired mid-flow. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Upserts the current user's onboarding answers — one row per user,
 *  overwritten each time (the live "in-progress" answers), separate from
 *  the frozen snapshot saved alongside each generated plan. Goes through an
 *  RPC (not a direct `.upsert()`) because this schema revokes direct
 *  insert/update/delete from `authenticated` on every table — all writes
 *  are SECURITY DEFINER functions (save_onboarding_answers).
 *
 *  These answers are the Shared Fitness Profile, so every save also
 *  recalculates the nutrition targets and sends them in the same call — once
 *  the user has built a nutrition plan (`nutritionStatus: "built"`, now or
 *  earlier) the saved result therefore always matches the saved profile. Returns the targets
 *  (null when a required input is still missing) and the row's new
 *  `updated_at`. */
export async function saveOnboardingAnswers(input: {
  userId: string;
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  /** Pass "built" from the nutrition flow; omit to keep the current status. */
  nutritionStatus?: NutritionStatus;
}): Promise<{ nutrition: NutritionTargets | null; updatedAt: string }> {
  const supabase = createSupabaseBrowserClient();
  const profile = toFitnessProfile(input.answers, input.trainingPreferences, input.gymEquipment);
  // Protein (like calories) is always our formula — users can't set their own.
  const nutrition = calculateNutrition(profile);
  const { data, error } = await supabase.rpc("save_onboarding_answers", {
    p_about_you: input.answers,
    p_training_preferences: input.trainingPreferences,
    p_gym_equipment: input.gymEquipment,
    p_nutrition: nutrition,
    p_nutrition_status: input.nutritionStatus ?? null,
  });
  if (error) throw error;
  return { nutrition, updatedAt: data as string };
}

/** Brings the user's *active* plan up to date with their Fitness Profile: when
 *  the profile's plan-relevant inputs (goal, body stats, experience, training
 *  days, session length, equipment) differ from what the plan was generated
 *  from, the plan is regenerated in place — same id, so it stays active and
 *  keeps its logged workouts — with its plan-only settings (muscle focus,
 *  variety, rest timer, cardio) preserved. Other saved plans are left alone.
 *  Returns whether the plan was regenerated. */
export async function refreshActivePlanFromProfile(profile: {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
}): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { data: planId, error: idError } = await supabase.rpc("active_training_plan_id");
  if (idError) throw idError;
  if (!planId) return false;

  const { data, error } = await supabase
    .from("user_training_plans")
    .select("label, onboarding_snapshot")
    .eq("id", planId as string)
    .maybeSingle();
  if (error) throw error;
  const row = data as { label: string; onboarding_snapshot: Partial<PlanOnboardingSnapshot> | null } | null;
  const snap = row?.onboarding_snapshot;
  if (!row || !snap?.answers || !snap.trainingPreferences || !snap.gymEquipment) return false;

  const current = {
    answers: snap.answers,
    trainingPreferences: snap.trainingPreferences,
    gymEquipment: upgradeLegacyEquipment(snap.gymEquipment),
  };
  const next = applyProfileToPlan(current, profile);
  if (planInputsSignature(next) === planInputsSignature(current)) return false;

  const [exercises, performanceHistory] = await Promise.all([
    fetchAllExercises(),
    fetchPlanPerformanceHistory(),
  ]);
  const plan = generateTrainingPlan({ ...next, exercises, performanceHistory });
  await updateTrainingPlan({
    id: planId as string,
    label: row.label,
    plan,
    onboardingSnapshot: next,
  });
  return true;
}

/** Regenerates a saved plan in place from its own saved answers, under the
 *  current plan rules (same id, so it stays active and keeps its history).
 *  Offered when the plan was built under older rules — e.g. before cooldowns
 *  became real stretching. Nothing about the plan's settings changes. */
export async function regeneratePlanUnderCurrentRules(planId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("label, onboarding_snapshot")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  const row = data as { label: string; onboarding_snapshot: Partial<PlanOnboardingSnapshot> | null } | null;
  const snap = row?.onboarding_snapshot;
  if (!row || !snap?.answers || !snap.trainingPreferences || !snap.gymEquipment) {
    throw new Error("plan snapshot missing");
  }
  const next: PlanOnboardingSnapshot = {
    answers: snap.answers,
    trainingPreferences: snap.trainingPreferences,
    gymEquipment: upgradeLegacyEquipment(snap.gymEquipment),
  };
  const [exercises, performanceHistory] = await Promise.all([
    fetchAllExercises(),
    fetchPlanPerformanceHistory(),
  ]);
  const plan = generateTrainingPlan({ ...next, exercises, performanceHistory });
  await updateTrainingPlan({ id: planId, label: row.label, plan, onboardingSnapshot: next });
}

/** "Skip" on the nutrition intro — not offered automatically again. */
export async function skipNutritionPlan(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("skip_nutrition_plan");
  if (error) throw error;
}

/** Client read of the signed-in user's Shared Fitness Profile (RLS scopes
 *  `user_onboarding` to the owner's row). */
export async function fetchFitnessProfile(): Promise<SavedFitnessProfile> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_onboarding")
    .select(FITNESS_PROFILE_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return parseFitnessProfileRow(data);
}

/** The frozen answers a saved plan was generated from — shape mirrors the
 *  three onboarding sub-flows 1:1. Used both when saving a new plan and when
 *  re-generating one in place from "Update Preferences". */
export interface PlanOnboardingSnapshot {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
}

/** Saves a newly generated plan as a new row (a user can hold several —
 *  view/delete each independently, nothing is replaced in place). The new
 *  plan becomes the user's active plan. */
export async function saveTrainingPlan(input: {
  label: string;
  plan: GeneratedPlan;
  onboardingSnapshot: PlanOnboardingSnapshot;
}): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("save_training_plan", {
    p_label: input.label,
    p_plan: input.plan,
    p_onboarding_snapshot: input.onboardingSnapshot,
  });
  if (error) throw error;
  return data as string;
}

/** Marks a plan build as started, so a tab closed before `saveTrainingPlan`
 *  returns can be resumed on the next visit. Saving the plan clears it. */
export async function beginPlanGeneration(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("begin_plan_generation");
  if (error) throw error;
}

/** Makes a saved plan the user's active plan (what AI Training opens and
 *  Home progress follows). Saving a new plan makes it active automatically. */
export async function setActiveTrainingPlan(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_active_training_plan", { p_id: id });
  if (error) throw error;
}

export async function deleteTrainingPlan(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_training_plan", { p_id: id });
  if (error) throw error;
}

/** Re-generates and overwrites an existing saved plan in place — used by
 *  "Update Preferences" on the My Plans list, so editing a plan never has to
 *  restart the onboarding wizard from scratch. */
export async function updateTrainingPlan(input: {
  id: string;
  label: string;
  plan: GeneratedPlan;
  onboardingSnapshot: PlanOnboardingSnapshot;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_training_plan", {
    p_id: input.id,
    p_label: input.label,
    p_plan: input.plan,
    p_onboarding_snapshot: input.onboardingSnapshot,
  });
  if (error) throw error;
}
