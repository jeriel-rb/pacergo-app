import { RetiredStepRedirect } from "@/features/ai-plan/onboarding/retired-step-redirect";

// The use-case question was removed from onboarding (its options never changed
// the plan). Old links and in-progress sessions skip ahead.
export default function UseCasePage() {
  return <RetiredStepRedirect to="age" />;
}
