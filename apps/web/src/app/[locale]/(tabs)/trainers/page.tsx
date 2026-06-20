import { getRecommendedTrainers } from "@pacergo/api";
import { TrainerListView } from "@/features/trainer/trainer-list-view";

export default async function TrainersPage() {
  const trainers = await getRecommendedTrainers();
  return <TrainerListView trainers={trainers} />;
}
