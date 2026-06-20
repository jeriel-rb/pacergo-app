import { getRecommendedTrainers } from "@pacergo/api";
import { HomeView } from "@/features/home/home-view";

export default async function HomePage() {
  const trainers = await getRecommendedTrainers();
  return <HomeView trainers={trainers} />;
}
