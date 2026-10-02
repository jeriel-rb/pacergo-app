"use client";

import type { OnboardingExperience, PrimaryActivity } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Saves the Profile Setup answers into the Shared Fitness Profile (level =
 *  training experience, activity = primaryActivity); city goes to the existing
 *  home_area. Nothing here has a column of its own. */
export async function saveProfileSetup(input: {
  primaryActivity: PrimaryActivity;
  experience: OnboardingExperience;
  city: string;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("save_profile_setup", {
    p_primary_activity: input.primaryActivity,
    p_experience: input.experience,
    p_city: input.city.trim(),
  });
  if (error) throw error;
}

/** "Skip" — remembered so the prompt isn't shown again. */
export async function skipProfileSetup(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("skip_profile_setup");
  if (error) throw error;
}
