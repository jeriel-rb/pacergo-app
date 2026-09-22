import { listTrainingPlansServer } from "@/lib/plan-view.server";
import { MyPlansView } from "@/features/ai-plan/plan/my-plans-view";

export const dynamic = "force-dynamic";

export default async function MyPlansPage() {
  const plans = await listTrainingPlansServer();
  return <MyPlansView plans={plans} />;
}
