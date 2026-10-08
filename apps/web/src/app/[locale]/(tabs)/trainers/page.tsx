import { getRecommendedTrainers } from "@pacergo/api";
import { rankCompanions } from "@pacergo/shared";
import { getProfileSetupServer } from "@/lib/profile-setup.server";
import { TrainerListView } from "@/features/trainer/trainer-list-view";
import { getSavedCompanionIds } from "@/lib/saved";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const [trainers, savedIds, profileSetup] = await Promise.all([
    getRecommendedTrainers(),
    getSavedCompanionIds(),
    getProfileSetupServer().catch(() => null),
  ]);
  return (
    <TrainerListView
      trainers={rankCompanions(trainers, profileSetup)}
      savedIds={savedIds}
    />
  );
}
