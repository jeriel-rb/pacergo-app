import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { getLocalizedPath } from "@/lib/locale-path";
import { getSavedFitnessProfileServer } from "@/lib/fitness-profile.server";
import { NutritionView } from "@/features/ai-plan/nutrition/nutrition-view";
import { NutritionOnboarding } from "@/features/ai-plan/nutrition/nutrition-onboarding";

export const dynamic = "force-dynamic";

/** Only same-app paths — never an absolute or protocol-relative URL. */
function safeNext(next: string | string[] | undefined): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
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
  const [{ locale }, { next }, profile, saved] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
    getSavedFitnessProfileServer(),
  ]);
  if (!profile || !saved) notFound();

  const answers = saved.answers;
  const nextHref = safeNext(next);

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
  return <NutritionView userId={profile.id} saved={saved} answers={answers} nextHref={nextHref} />;
}
