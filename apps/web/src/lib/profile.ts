import type { UserProfile } from "@pacergo/shared";
import { getCurrentUser } from "@pacergo/api";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/**
 * The signed-in user's full, editable profile (read from the `users` table).
 * Heavier than `getSessionUser` (which only reads the auth session) — use this
 * on the profile page where bio/home_area are needed. Falls back to the mock
 * user when Supabase isn't configured.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!SUPABASE_CONFIGURED) return getCurrentUser();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("display_name, photo_url, bio, experience_level, home_area")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    display_name: data?.display_name ?? user.email?.split("@")[0] ?? "User",
    photo_url: data?.photo_url ?? null,
    experience_level: data?.experience_level ?? null,
    bio: data?.bio ?? null,
    home_area: data?.home_area ?? null,
  };
}
