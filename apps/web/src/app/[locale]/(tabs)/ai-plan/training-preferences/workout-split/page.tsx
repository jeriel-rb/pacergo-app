import { RetiredStepRedirect } from "@/features/ai-plan/onboarding/retired-step-redirect";

// The three-option split picker was replaced by one AI-recommended split,
// shown once every input (incl. equipment) is known — see recommended-split.
export default function WorkoutSplitPage() {
  return <RetiredStepRedirect to="variety" />;
}
