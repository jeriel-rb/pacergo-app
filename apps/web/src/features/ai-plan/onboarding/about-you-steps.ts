"use client";

import { useSubStepNav } from "./sub-step-nav";

/** Only questions that change the plan or the nutrition targets: goal →
 *  reps/rest + calories/protein, obstacle → session length and low-impact
 *  mode, gender + age + height/weight → low-impact mode + calories/protein,
 *  activity level → calories. ("What will you use PacerGo for" was dropped —
 *  it changed nothing.) */
export const ABOUT_YOU_STEPS = [
  "goal",
  "obstacle",
  "gender",
  "age",
  "height-weight",
  "activity-level",
] as const;

export type AboutYouStep = (typeof ABOUT_YOU_STEPS)[number];

export function useAboutYouNav() {
  return useSubStepNav(ABOUT_YOU_STEPS);
}
