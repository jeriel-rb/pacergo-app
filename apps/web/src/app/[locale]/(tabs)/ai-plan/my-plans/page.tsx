import { getActivePlanIdServer, listTrainingPlansServer } from "@/lib/plan-view.server";
import { MyPlansView } from "@/features/ai-plan/plan/my-plans-view";

export const dynamic = "force-dynamic";

export default async function MyPlansPage() {
  const [plans, activePlanId] = await Promise.all([
    listTrainingPlansServer(),
    getActivePlanIdServer().catch(() => null),
  ]);
  return <MyPlansView plans={plans} activePlanId={activePlanId} />;
}
