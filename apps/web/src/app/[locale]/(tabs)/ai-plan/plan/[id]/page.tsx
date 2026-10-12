import { getTrainingPlanServer } from "@/lib/plan-view.server";
import { getSavedFitnessProfileServer } from "@/lib/fitness-profile.server";
import { getCurrentProfile } from "@/lib/profile";
import { PlanOverviewView } from "@/features/ai-plan/plan/plan-overview-view";
import { PlanNotFound } from "@/features/ai-plan/plan/plan-not-found";

export const dynamic = "force-dynamic";

export default async function PlanOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, saved, profile] = await Promise.all([
    getTrainingPlanServer(id),
    getSavedFitnessProfileServer(),
    getCurrentProfile(),
  ]);
  if (!result || !saved || !profile) return <PlanNotFound />;
  return (
    <PlanOverviewView
      planId={id}
      label={result.label}
      goal={result.goal}
      plan={result.plan}
      createdAt={result.createdAt}
      userId={profile.id}
      profileAnswers={saved.answers}
      trainingPreferences={saved.trainingPreferences}
      gymEquipment={saved.gymEquipment}
    />
  );
}
