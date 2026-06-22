import { getRecommendedTrainers } from "@pacergo/api";
import { HomeView } from "@/features/home/home-view";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trainers = await getRecommendedTrainers();
  return <HomeView trainers={trainers} />;
}
