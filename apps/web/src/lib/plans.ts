"use client";

import type {
  GeneratedPlan,
  GymEquipmentAnswers,
  OnboardingAnswers,
  TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
 *  are SECURITY DEFINER functions, see backend/migrations/0045_ai_plan_rpcs.sql. */
export async function saveOnboardingAnswers(input: {
  userId: string;
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("save_onboarding_answers", {
    p_goal: input.answers.goal,
    p_gym_type: input.gymEquipment.gymType,
    p_about_you: input.answers,
    p_training_preferences: input.trainingPreferences,
    p_gym_equipment: input.gymEquipment,
  });
  if (error) throw error;
}

export interface SavedPlanSummary {
  id: string;
  label: string;
  createdAt: string;
}

interface SavedPlanRow {
  id: string;
  label: string;
  plan: GeneratedPlan;
  onboarding_snapshot: unknown;
  created_at: string;
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
 *  view/delete each independently, nothing is replaced in place). */
export async function saveTrainingPlan(input: {
  userId: string;
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

export async function listTrainingPlans(): Promise<SavedPlanSummary[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("id, label, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    label: (row as { label: string }).label,
    createdAt: (row as { created_at: string }).created_at,
  }));
}

export async function fetchTrainingPlan(id: string): Promise<GeneratedPlan | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("plan")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as SavedPlanRow).plan : null;
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
