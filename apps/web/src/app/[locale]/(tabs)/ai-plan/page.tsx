import type { PlanGender } from "@pacergo/shared";
import { getCurrentProfile } from "@/lib/profile";
import { AiPlanView } from "@/features/ai-plan/ai-plan-view";

// Per-request so the auto-selected gender reflects the latest saved profile.
export const dynamic = "force-dynamic";

export default async function AiPlanPage() {
  const profile = await getCurrentProfile();
  // Plans are authored for male/female; "other"/unset defaults to male and the
  // user can switch on the page.
  const initialGender: PlanGender = profile?.gender === "female" ? "female" : "male";
  return <AiPlanView initialGender={initialGender} />;
}
