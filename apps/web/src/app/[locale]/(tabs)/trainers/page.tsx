import { getRecommendedTrainers } from "@pacergo/api";
import { TrainerListView } from "@/features/trainer/trainer-list-view";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const trainers = await getRecommendedTrainers();
  return <TrainerListView trainers={trainers} />;
}
