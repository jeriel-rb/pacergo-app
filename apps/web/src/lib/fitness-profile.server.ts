import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FITNESS_PROFILE_COLUMNS,
  parseFitnessProfileRow,
  type SavedFitnessProfile,
} from "@/lib/fitness-profile-row";

export type { SavedFitnessProfile } from "@/lib/fitness-profile-row";

/** Server read of the signed-in user's Shared Fitness Profile; null when
 *  signed out. */
export async function getSavedFitnessProfileServer(): Promise<SavedFitnessProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_onboarding")
    .select(FITNESS_PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return parseFitnessProfileRow(data);
}
