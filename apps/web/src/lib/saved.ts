import type { TrainerSummary } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/** Ids of the trainers the signed-in user has saved (for star state). */
export async function getSavedCompanionIds(): Promise<string[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_saved_companion_ids");
  return (data ?? []) as string[];
}

/** Full trainer summaries for the signed-in user's saved trainers. */
export async function getSavedCompanionsFeed(): Promise<TrainerSummary[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("saved_companions_feed");
  return (data ?? []) as TrainerSummary[];
}
