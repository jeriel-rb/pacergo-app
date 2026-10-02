import { PLAN_RULES_VERSION } from "@pacergo/shared";
import { getTrainingPlanServer } from "@/lib/plan-view.server";
import { DailyWorkoutView } from "@/features/ai-plan/plan/daily-workout-view";
import { PlanNotFound } from "@/features/ai-plan/plan/plan-not-found";

export const dynamic = "force-dynamic";

export default async function DailyWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; dayIndex: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id, dayIndex } = await params;
  const { week: weekParam } = await searchParams;
  const result = await getTrainingPlanServer(id);
  if (!result) return <PlanNotFound />;

  // The week tab the user came from (1–4); the exercises can differ by week
  // depending on their Variety setting. Anything unusable falls back to week 1.
  const parsed = Number(weekParam);
  const week = Number.isInteger(parsed) && parsed >= 1 && parsed <= result.plan.weeks.length ? parsed : 1;

  const index = Number(dayIndex);
  const day = result.plan.weeks[week - 1]?.days.find((d) => d.dayIndex === index);
  if (!day) return <PlanNotFound />;

  return (
    <DailyWorkoutView
      planId={id}
      day={day}
      week={week}
      restTimer={result.restTimer}
      outdated={(result.plan.rulesVersion ?? 0) < PLAN_RULES_VERSION}
    />
  );
}
