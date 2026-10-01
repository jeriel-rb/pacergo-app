"use client";

import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useSubStepNav } from "./sub-step-nav";

export const TRAINING_PREFERENCES_STEPS = [
  "experience",
  "days-per-week",
  "exclude-muscles",
  "exclude-muscles-select",
  "prioritize-muscles",
  "prioritize-muscles-select",
  "variety",
  "duration",
] as const;

export type TrainingPreferencesStep = (typeof TRAINING_PREFERENCES_STEPS)[number];

/** The two muscle-picker steps only exist when the preceding yes/no
 *  question was answered "Yes" — otherwise goNext/goBack skip past them. */
export function useTrainingPreferencesNav() {
  const { trainingPreferences } = useOnboarding();
  return useSubStepNav(TRAINING_PREFERENCES_STEPS, {
    skip: (step) => {
      if (step === "exclude-muscles-select") {
        return trainingPreferences.excludeMuscles !== true;
      }
      if (step === "prioritize-muscles-select") {
        return trainingPreferences.prioritizeMuscles !== true;
      }
      return false;
    },
  });
}
