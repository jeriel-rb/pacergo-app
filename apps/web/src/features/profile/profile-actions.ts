import type { ExperienceLevel } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarObjectPath } from "./avatar";

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

/** Persist the editable `users` columns for the signed-in user. */
export async function updateProfileFields(fields: ProfileFields): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const uid = await requireUserId(supabase);
  const { error } = await supabase.from("users").update(fields).eq("id", uid);
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

  const { error } = await supabase
    .from("users")
    .update({ photo_url: url })
    .eq("id", uid);
  if (error) throw new Error(error.message);
  return url;
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
  await supabase.auth.signOut();
}
