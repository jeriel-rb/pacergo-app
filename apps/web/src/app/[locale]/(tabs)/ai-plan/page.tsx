import { redirect } from "next/navigation";
import { getActivePlanIdServer } from "@/lib/plan-view.server";
import { getLocalizedPath } from "@/lib/locale-path";

export const dynamic = "force-dynamic";

/** AI Training Plan entry. Opens the user's active plan directly; with no
 *  plan yet it goes to setup — which itself shows onboarding (not done), or
 *  a create/regenerate step (done, but the plan is missing). */
export default async function AiPlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activePlanId = await getActivePlanIdServer().catch(() => null);
  redirect(
    getLocalizedPath(activePlanId ? `/ai-plan/plan/${activePlanId}` : "/ai-plan/setup", locale),
  );
}
