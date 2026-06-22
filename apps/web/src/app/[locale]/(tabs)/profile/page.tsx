import { getCurrentProfile } from "@/lib/profile";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { ProfileView } from "@/features/profile/profile-view";

// Per-request so profile edits reflect immediately after router.refresh().
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  return <ProfileView profile={profile} editable={SUPABASE_CONFIGURED} />;
}
