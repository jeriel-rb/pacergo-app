import { getRecommendedTrainers } from "@pacergo/api";
import { HomeView } from "@/features/home/home-view";
import { getSessionUser } from "@/lib/auth";
import { getSavedCompanionIds } from "@/lib/saved";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trainers, user, savedIds] = await Promise.all([
    getRecommendedTrainers(),
    getSessionUser(),
    getSavedCompanionIds(),
  ]);
  return <HomeView trainers={trainers} user={user} savedIds={savedIds} />;
}
