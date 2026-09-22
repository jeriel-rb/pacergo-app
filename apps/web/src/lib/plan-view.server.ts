import type { GeneratedPlan } from "@pacergo/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlanOnboardingSnapshot } from "@/lib/plans";
import { exerciseArtSlugForDbSlug } from "@/shared/assets/exercise-art";

/** Server-side reads for the plan-viewing screens (A-3/A-4/A-5) and the
 *  "My Plans" list — RLS already scopes every query to the signed-in user
 *  (or, for `exercises`, to any authenticated user), so these never take a
 *  userId param. */

/** The rest-timer choices saved with a plan (Customize Plan → Rest timer). */
export interface PlanRestTimer {
  enabled: boolean;
  sound: boolean;
}

export async function getTrainingPlanServer(
  id: string,
): Promise<{ label: string; goal: string | null; plan: GeneratedPlan; restTimer: PlanRestTimer } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("label, goal, plan, onboarding_snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    label: string;
    goal: string | null;
    plan: GeneratedPlan;
    onboarding_snapshot: PlanOnboardingSnapshot | null;
  };
  const prefs = row.onboarding_snapshot?.trainingPreferences;
  return {
    label: row.label,
    // Promoted column on user_training_plans (see 0001_init.sql) — lets the
    // client re-translate the title live instead of trusting the stored
    // string, which was frozen in whatever locale was active at save time.
    goal: row.goal,
    plan: row.plan,
    // Plans saved before the timer existed have no choice stored: on, with sound.
    restTimer: { enabled: prefs?.restTimerEnabled ?? true, sound: prefs?.restTimerSound ?? true },
  };
}

export interface SavedPlanSummaryServer {
  id: string;
  label: string;
  goal: string | null;
  createdAt: string;
}

export async function listTrainingPlansServer(): Promise<SavedPlanSummaryServer[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("id, label, goal, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as { id: string; label: string; goal: string | null; created_at: string };
    return { id: r.id, label: r.label, goal: r.goal, createdAt: r.created_at };
  });
}

export interface PlanForEditServer {
  label: string;
  onboardingSnapshot: PlanOnboardingSnapshot;
}

/** Just the frozen answers + label for the "Customize Plan" edit page —
 *  skips the (potentially large) generated `plan` jsonb since that screen
 *  only reads/writes preferences, not the day-by-day content. */
export async function getTrainingPlanForEditServer(id: string): Promise<PlanForEditServer | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_training_plans")
    .select("label, onboarding_snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { label: string; onboarding_snapshot: unknown };
  return {
    label: row.label,
    onboardingSnapshot: (row.onboarding_snapshot ?? {}) as PlanOnboardingSnapshot,
  };
}

export interface ExerciseDetailServer {
  slug: string;
  nameEn: string;
  nameZh: string;
  muscleGroups: string[];
  instructionsEn: string[];
  instructionsZh: string[];
  tipsEn: string[];
  tipsZh: string[];
}

export async function getExerciseDetailServer(slug: string): Promise<ExerciseDetailServer | null> {
  const supabase = await createSupabaseServerClient();
  const find = async (s: string) => {
    const { data, error } = await supabase
      .from("exercises")
      .select(
        "slug, name_en, name_zh, muscle_groups, instructions_en, instructions_zh, tips_en, tips_zh",
      )
      .eq("slug", s)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  let data = await find(slug);
  // Plans saved before the exercise library moved to catalog slugs link to the
  // old snake_case slug (e.g. `push_up`, `barbell_bench_press`); resolve it.
  if (!data) {
    const current = exerciseArtSlugForDbSlug(slug);
    if (current && current !== slug) data = await find(current);
  }
  if (!data) return null;
  const row = data as {
    slug: string;
    name_en: string;
    name_zh: string;
    muscle_groups: string[];
    instructions_en: string[];
    instructions_zh: string[];
    tips_en: string[];
    tips_zh: string[];
  };
  return {
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    muscleGroups: row.muscle_groups,
    instructionsEn: row.instructions_en,
    instructionsZh: row.instructions_zh,
    tipsEn: row.tips_en,
    tipsZh: row.tips_zh,
  };
}
