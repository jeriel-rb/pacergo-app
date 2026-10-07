import { redirect } from "next/navigation";
import { getActivePlanIdServer, getPlanGenerationInProgressServer } from "@/lib/plan-view.server";
import { getLocalizedPath } from "@/lib/locale-path";

export const dynamic = "force-dynamic";

/** AI Training Plan entry. Opens the user's active plan directly. With no plan
 *  but a build that was interrupted (tab closed mid-generation) it resumes that
 *  build; otherwise it goes to setup — which itself shows onboarding (not done),
 *  or a create/regenerate step (done, but the plan is missing). */
export default async function AiPlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activePlanId = await getActivePlanIdServer().catch(() => null);
  if (activePlanId) redirect(getLocalizedPath(`/ai-plan/plan/${activePlanId}`, locale));

  const resuming = await getPlanGenerationInProgressServer().catch(() => false);
  redirect(getLocalizedPath(resuming ? "/ai-plan/creating-plan" : "/ai-plan/setup", locale));
}
