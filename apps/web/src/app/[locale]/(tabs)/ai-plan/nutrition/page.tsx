import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { getLocalizedPath } from "@/lib/locale-path";
import { sanitizeInternalRedirect } from "@/lib/auth-callback";
import { getSavedFitnessProfileServer } from "@/lib/fitness-profile.server";
import { getActivePlanIdServer, getTrainingPlanServer } from "@/lib/plan-view.server";
import { NutritionView } from "@/features/ai-plan/nutrition/nutrition-view";
import { NutritionOnboarding } from "@/features/ai-plan/nutrition/nutrition-onboarding";

export const dynamic = "force-dynamic";

/** Same-app paths only — same rules as the auth callback `next` param.
 *  Returns null when the value is missing or was rejected (so we don't treat
 *  the sanitizer's home fallback as an intentional next). */
function safeNext(next: string | string[] | undefined, locale: string): string | null {
  if (typeof next !== "string" || !next) return null;
  const sanitized = sanitizeInternalRedirect(next, locale);
  try {
    const raw = new URL(next, "https://pacergo.local");
    const ok = new URL(sanitized, "https://pacergo.local");
    if (raw.pathname !== ok.pathname) return null;
  } catch {
    return null;
  }
  return sanitized;
}

/** AI Nutrition: the intro / build flow until the user has built a plan,
 *  then the saved result (reopenable from My Plans and every plan). */
export default async function NutritionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [{ locale }, { next }, profile, saved, activePlanId] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
    getSavedFitnessProfileServer(),
    getActivePlanIdServer().catch(() => null),
  ]);
  if (!profile || !saved) notFound();

  const answers = saved.answers;
  const nextHref = safeNext(next, locale);
  const activePlan = activePlanId ? await getTrainingPlanServer(activePlanId) : null;

  if (saved.nutritionStatus !== "built") {
    return (
      <NutritionOnboarding
        userId={profile.id}
        saved={saved}
        answers={answers}
        nextHref={nextHref}
        exitHref={getLocalizedPath("/ai-plan/my-plans", locale)}
      />
    );
  }
  return (
    <NutritionView
      userId={profile.id}
      saved={saved}
      answers={answers}
      nextHref={nextHref}
      activePlanGoal={activePlan?.goal ?? null}
    />
  );
}
