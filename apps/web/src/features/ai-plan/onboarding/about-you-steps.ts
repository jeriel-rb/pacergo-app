"use client";

import { useSubStepNav } from "./sub-step-nav";

/** Only questions that change the plan: goal → reps/rest, obstacle → session
 *  length and low-impact mode, age + height/weight → low-impact mode. (Gender
 *  and "what will you use Pacergo for" were dropped — they changed nothing.) */
export const ABOUT_YOU_STEPS = ["goal", "obstacle", "age", "height-weight"] as const;

export type AboutYouStep = (typeof ABOUT_YOU_STEPS)[number];

export function useAboutYouNav() {
  return useSubStepNav(ABOUT_YOU_STEPS);
}
