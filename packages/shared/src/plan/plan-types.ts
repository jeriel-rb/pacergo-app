import type { TrainingFrequency, TrainingGoal, TrainingLocation } from "../enums/training";
import type { OnboardingExperience } from "../onboarding/onboarding-types";
import type { PlanGender } from "../enums/gender";

/** A bilingual string pair — every piece of authored/generated copy in the
 *  plan is one of these; the UI picks `[locale]` at render time. */
export interface Bi {
  zh: string;
  en: string;
}

/** The mobile plan screen's chips. Web onboarding collects a richer set and
 *  calls `generateTrainingPlan` directly. */
export interface PlanSelection {
  goal: TrainingGoal;
  gender: PlanGender;
  /** Same words as the web plan: Beginner is `beginner`, Basic is `basic`. */
  level: OnboardingExperience;
  frequency: TrainingFrequency;
  location: TrainingLocation;
  locale: "zh" | "en";
}
