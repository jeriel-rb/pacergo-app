import { getTrainingPlanServer } from "@/lib/plan-view.server";
import { PlanOverviewView } from "@/features/ai-plan/plan/plan-overview-view";
import { PlanNotFound } from "@/features/ai-plan/plan/plan-not-found";

export const dynamic = "force-dynamic";

export default async function PlanOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getTrainingPlanServer(id);
  if (!result) return <PlanNotFound />;
  return <PlanOverviewView label={result.label} goal={result.goal} plan={result.plan} />;
}
