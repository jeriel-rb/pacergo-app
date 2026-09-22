import { getExerciseDetailServer, getTrainingPlanServer } from "@/lib/plan-view.server";
import { ExerciseDetailView } from "@/features/ai-plan/plan/exercise-detail-view";
import { PlanNotFound } from "@/features/ai-plan/plan/plan-not-found";
import type { ExerciseWorkout } from "@/features/ai-plan/plan/set-tracker";
import { findExerciseSlot } from "@/features/ai-plan/plan/workout-progress";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; dayIndex: string; slug: string }>;
  searchParams: Promise<{ week?: string; group?: string }>;
}) {
  const { id, dayIndex, slug } = await params;
  const { week: weekParam, group } = await searchParams;
  const exercise = await getExerciseDetailServer(slug);
  if (!exercise) return <PlanNotFound />;

  // Which set-tracking belongs to this exercise: its slot in this plan's day.
  // A link that doesn't match the plan (older link, refreshed plan) just shows
  // the how-to without the sets.
  let workout: ExerciseWorkout | undefined;
  const result = await getTrainingPlanServer(id);
  if (result) {
    const parsed = Number(weekParam);
    const week = Number.isInteger(parsed) && parsed >= 1 && parsed <= result.plan.weeks.length ? parsed : 1;
    const index = Number(dayIndex);
    const session = result.plan.weeks[week - 1]?.days.find((d) => d.dayIndex === index)?.session;
    const slot = session ? findExerciseSlot(session, slug, group) : null;
    if (slot) workout = { planId: id, week, dayIndex: index, restTimer: result.restTimer, slot };
  }

  return <ExerciseDetailView exercise={exercise} workout={workout} />;
}
