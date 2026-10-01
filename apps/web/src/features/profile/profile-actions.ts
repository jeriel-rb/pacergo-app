import type { ExperienceLevel } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearOnboardingStorage } from "@/features/ai-plan/onboarding-store";
import { avatarObjectPath } from "./avatar";
import { bannerObjectPath } from "./banner";

export interface ProfileFields {
  display_name: string;
  bio: string | null;
  experience_level: ExperienceLevel | null;
  home_area: string | null;
}

async function requireUserId(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/** Persist the editable `users` columns for the signed-in user (via RPC).
 *  Gender isn't one of them: it lives in the Fitness Profile, and passing null
 *  leaves the account column untouched (see update_my_profile). */
export async function updateProfileFields(fields: ProfileFields): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: fields.display_name,
    p_bio: fields.bio,
    p_experience_level: fields.experience_level,
    p_home_area: fields.home_area,
    p_gender: null,
  });
  if (error) throw new Error(error.message);
}

/** Upload a new avatar to Storage and save its public URL. Returns the URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const uid = await requireUserId(supabase);
  const path = avatarObjectPath(uid, file);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new image shows even though the path is stable.
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error } = await supabase.rpc("set_my_photo_url", { p_url: url });
  if (error) throw new Error(error.message);
  return url;
}

/** Clear the avatar, reverting to the lettered initials. */
export async function removeAvatar(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_my_photo_url", { p_url: null });
  if (error) throw new Error(error.message);
}

/** Upload a new banner to Storage and save its public URL. Returns the URL. */
export async function uploadBanner(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const uid = await requireUserId(supabase);
  const path = bannerObjectPath(uid, file);

  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("banners").getPublicUrl(path);
  // Cache-bust so the new image shows even though the path is stable.
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error } = await supabase.rpc("set_my_banner_url", { p_url: url });
  if (error) throw new Error(error.message);
  return url;
}

/** Clear the banner, reverting to the brand gradient. */
export async function removeBanner(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_my_banner_url", { p_url: null });
  if (error) throw new Error(error.message);
}

/** Set a new password for the signed-in user. */
export async function changePassword(newPassword: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** Change the login email. Triggers a Supabase confirmation email. */
export async function changeEmail(
  newEmail: string,
  redirectTo?: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  );
  if (error) throw new Error(error.message);
}

/** Permanently delete the account (cascades to the profile) and sign out. */
export async function deleteAccount(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_current_user");
  if (error) throw new Error(error.message);
  clearOnboardingStorage();
  await supabase.auth.signOut();
}
