"use client";

import type { EffortFeedback, LoggedSet, PreviousPerformance } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Where a log belongs: one exercise of one plan day. */
export interface WorkoutDayRef {
  planId: string;
  week: number;
  dayIndex: number;
}

export interface ExerciseDayLog {
  sets: LoggedSet[];
  effort: EffortFeedback | null;
}

export interface ExerciseHistoryEntry extends PreviousPerformance {
  performedOn: string;
}

/** Saves (replaces) today's sets + effort for one exercise. */
export async function logExerciseSets(
  ref: WorkoutDayRef & { slug: string },
  log: ExerciseDayLog,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("log_exercise_sets", {
    p_plan_id: ref.planId,
    p_week: ref.week,
    p_day_index: ref.dayIndex,
    p_slug: ref.slug,
    p_sets: log.sets,
    p_effort: log.effort,
  });
  if (error) throw error;
}

/** Today's logs for every exercise of a plan day, keyed by slug. */
export async function fetchDayLogs(ref: WorkoutDayRef): Promise<Record<string, ExerciseDayLog>> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("workout_day_logs", {
    p_plan_id: ref.planId,
    p_week: ref.week,
    p_day_index: ref.dayIndex,
  });
  if (error) throw error;
  const out: Record<string, ExerciseDayLog> = {};
  for (const row of (data ?? []) as { exercise_slug: string; sets: LoggedSet[]; effort: EffortFeedback | null }[]) {
    out[row.exercise_slug] = { sets: row.sets ?? [], effort: row.effort };
  }
  return out;
}

/** Earlier performances of an exercise, newest first (before today). */
export async function fetchExerciseHistory(slug: string, limit = 3): Promise<ExerciseHistoryEntry[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("exercise_history", { p_slug: slug, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as { performed_on: string; sets: LoggedSet[]; effort: EffortFeedback | null }[]).map((r) => ({
    performedOn: r.performed_on,
    sets: r.sets ?? [],
    effort: r.effort,
  }));
}

/** Marks a plan day finished (idempotent) — counts toward Home progress. */
export async function completeWorkout(ref: WorkoutDayRef): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("complete_workout", {
    p_plan_id: ref.planId,
    p_week: ref.week,
    p_day_index: ref.dayIndex,
  });
  if (error) throw error;
}
