"use client";

import type { ExerciseRecord } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { exerciseArtSlugForDbSlug } from "@/shared/assets/exercise-art";

interface ExerciseRow {
  slug: string;
  name_en: string;
  name_zh: string;
  muscle_groups: string[];
  equipment_settings: string[];
  /** Absent until the exercises seed that adds the column has been applied. */
  equipment?: string[] | null;
  instructions_en?: string[] | null;
  instructions_zh?: string[] | null;
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

/** First two steps, joined — the one-line how-to shown with a stretch. */
function shortCue(row: ExerciseRow): ExerciseRecord["shortCue"] {
  const en = (row.instructions_en ?? []).slice(0, 2).join(" ");
  const zh = (row.instructions_zh ?? []).slice(0, 2).join("");
  return en ? { en, zh: zh || en } : undefined;
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
    hasIllustration: exerciseArtSlugForDbSlug(row.slug) !== null,
    shortCue: shortCue(row),
  };
}
