import { getTrainingPlanForEditServer } from "@/lib/plan-view.server";
import { CustomizePlanView } from "@/features/ai-plan/plan/customize-plan-view";
import { PlanNotFound } from "@/features/ai-plan/plan/plan-not-found";

export const dynamic = "force-dynamic";

export default async function UpdatePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getTrainingPlanForEditServer(id);
  if (!result) return <PlanNotFound />;
  return (
    <CustomizePlanView
      planId={id}
      currentLabel={result.label}
      onboardingSnapshot={result.onboardingSnapshot}
    />
  );
}
