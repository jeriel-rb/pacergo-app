import { HubView } from "@/features/ai-plan/onboarding/hub-view";
import { getActivePlanIdServer } from "@/lib/plan-view.server";

export const dynamic = "force-dynamic";

/** "Let's Get Started" setup hub. Reached directly (new plan, adjust
 *  settings) or via /ai-plan when the user has no active plan. */
export default async function AiPlanSetupPage() {
  const activePlanId = await getActivePlanIdServer().catch(() => null);
  return <HubView activePlanId={activePlanId} />;
}
