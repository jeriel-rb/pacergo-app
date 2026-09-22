import { RetiredStepRedirect } from "@/features/ai-plan/onboarding/retired-step-redirect";

// The gender question was removed from onboarding (it never changed the plan;
// gender lives on the profile). Old links and in-progress sessions skip ahead.
export default function GenderPage() {
  return <RetiredStepRedirect to="age" />;
}
