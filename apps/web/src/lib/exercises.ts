"use client";

import type { ExerciseRecord } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ExerciseRow {
  slug: string;
  name_en: string;
  name_zh: string;
  muscle_groups: string[];
  equipment_settings: string[];
  /** Absent until the exercises seed that adds the column has been applied. */
  equipment?: string[] | null;
  instructions_en?: string[] | null;
}

/** Full catalog, used by the composer to generate a plan. Exercises are
 *  public reference data (RLS: readable by any authenticated user). */
export async function fetchAllExercises(): Promise<ExerciseRecord[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("exercises")
    // "*" (not a column list) so plan generation keeps working on a database
    // that hasn't got the newer `equipment` column yet — it just falls back to
    // gym type.
    .select("*");
  if (error) throw error;
  return ((data ?? []) as ExerciseRow[]).map(rowToRecord);
}

export interface ExerciseDetail extends ExerciseRecord {
  instructionsEn: string[];
  instructionsZh: string[];
  tipsEn: string[];
  tipsZh: string[];
}

/** One exercise's full content, for the exercise detail screen (A-5). */
export async function fetchExerciseBySlug(slug: string): Promise<ExerciseDetail | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "slug, name_en, name_zh, muscle_groups, equipment_settings, instructions_en, instructions_zh, tips_en, tips_zh",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...rowToRecord(data as ExerciseRow),
    instructionsEn: (data as { instructions_en: string[] }).instructions_en,
    instructionsZh: (data as { instructions_zh: string[] }).instructions_zh,
    tipsEn: (data as { tips_en: string[] }).tips_en,
    tipsZh: (data as { tips_zh: string[] }).tips_zh,
  };
}

function rowToRecord(row: ExerciseRow): ExerciseRecord {
  return {
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    muscleGroups: row.muscle_groups,
    equipmentSettings: row.equipment_settings,
    equipment: Array.isArray(row.equipment) ? row.equipment : undefined,
    hasInstructions: (row.instructions_en?.length ?? 0) > 0,
  };
}
