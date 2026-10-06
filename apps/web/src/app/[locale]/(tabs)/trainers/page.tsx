import { getRecommendedTrainers } from "@pacergo/api";
import { rankCompanions } from "@pacergo/shared";
import { getSessionUser } from "@/lib/auth";
import { excludeSelf } from "@/features/home/filter-trainers";
import { getProfileSetupServer } from "@/lib/profile-setup.server";
import { TrainerListView } from "@/features/trainer/trainer-list-view";
import { getSavedCompanionIds } from "@/lib/saved";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const [trainers, savedIds, profileSetup, user] = await Promise.all([
    getRecommendedTrainers(),
    getSavedCompanionIds(),
    getProfileSetupServer().catch(() => null),
    getSessionUser(),
  ]);
  return (
    <TrainerListView
      trainers={excludeSelf(rankCompanions(trainers, profileSetup), user?.id)}
      savedIds={savedIds}
    />
  );
}
