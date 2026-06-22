import { getRecommendedTrainers } from "@pacergo/api";
import { HomeView } from "@/features/home/home-view";
import { getSessionUser } from "@/lib/auth";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trainers, user] = await Promise.all([
    getRecommendedTrainers(),
    getSessionUser(),
  ]);
  return <HomeView trainers={trainers} user={user} />;
}
