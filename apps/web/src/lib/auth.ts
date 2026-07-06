import type { UserProfile } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/** The signed-in user from the Supabase session (server-side), or null. */
export async function getSessionUser(): Promise<UserProfile | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: isAdmin }, { data: profile }] = await Promise.all([
    supabase.rpc("am_i_admin"),
    supabase.rpc("get_my_profile"),
  ]);
  const row = (profile ?? null) as {
    display_name: string | null;
    photo_url: string | null;
  } | null;

  // Prefer the nickname the user set on their profile (`users.display_name`);
  // auth metadata / the email prefix are only signup-time fallbacks.
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    display_name:
      row?.display_name ||
      (meta.full_name as string) ||
      (meta.name as string) ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email ?? "",
    photo_url: row?.photo_url ?? (meta.avatar_url as string) ?? null,
    experience_level: null,
    is_admin: isAdmin === true,
  };
}
