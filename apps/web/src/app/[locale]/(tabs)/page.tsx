import { getRecommendedTrainers } from "@pacergo/api";
import { rankCompanions } from "@pacergo/shared";
import { HomeView } from "@/features/home/home-view";
import { getSessionUser } from "@/lib/auth";
import { getSavedCompanionIds } from "@/lib/saved";
import { getWeeklyProgress } from "@/lib/goals";
import { getProfileSetupServer } from "@/lib/profile-setup.server";
import { getActivePlanIdServer } from "@/lib/plan-view.server";

// Render per-request so live Supabase changes show without a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trainers, user, savedIds, weeklyProgress, profileSetup, activePlanId] = await Promise.all([
    getRecommendedTrainers(),
    getSessionUser(),
    getSavedCompanionIds(),
    getWeeklyProgress(),
    getProfileSetupServer().catch(() => null),
    getActivePlanIdServer().catch(() => null),
  ]);
  return (
    <HomeView
      trainers={rankCompanions(trainers, profileSetup)}
      user={user}
      savedIds={savedIds}
      weeklyProgress={weeklyProgress}
      profileSetup={profileSetup}
      hasActivePlan={Boolean(activePlanId)}
    />
  );
}
