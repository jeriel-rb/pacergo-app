import { getRecommendedTrainers } from "@pacergo/api";
import { TrainerListView } from "@/features/trainer/trainer-list-view";
import { getSavedCompanionIds } from "@/lib/saved";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const [trainers, savedIds] = await Promise.all([
    getRecommendedTrainers(),
    getSavedCompanionIds(),
  ]);
  return <TrainerListView trainers={trainers} savedIds={savedIds} />;
}
