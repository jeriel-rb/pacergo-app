import type { ProfileSetupState } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/** The signed-in user's first-run Profile Setup state. `null` when signed out
 *  or when Supabase isn't configured (mock mode) — nothing to ask then. */
export async function getProfileSetupServer(): Promise<ProfileSetupState | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("my_profile_setup");
  // Never block Home on this: if the RPC isn't there yet, just don't ask.
  if (error || !data) return null;
  return data as ProfileSetupState;
}
