import type { ExperienceLevel, Gender, UserProfile } from "@pacergo/shared";
import { getCurrentUser } from "@pacergo/api";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

interface MyProfileRow {
  display_name: string | null;
  photo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  experience_level: ExperienceLevel | null;
  home_area: string | null;
  gender: Gender | null;
  is_companion: boolean | null;
  is_admin: boolean | null;
}

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

  const { data } = await supabase.rpc("get_my_profile");
  const row = (data ?? null) as MyProfileRow | null;

  return {
    id: user.id,
    email: user.email ?? "",
    display_name: row?.display_name ?? user.email?.split("@")[0] ?? "User",
    photo_url: row?.photo_url ?? null,
    banner_url: row?.banner_url ?? null,
    experience_level: row?.experience_level ?? null,
    bio: row?.bio ?? null,
    home_area: row?.home_area ?? null,
    gender: row?.gender ?? null,
    is_companion: row?.is_companion ?? false,
    // get_my_profile already returns is_admin; MeLinks needs this to surface /admin.
    is_admin: row?.is_admin === true,
  };
}
