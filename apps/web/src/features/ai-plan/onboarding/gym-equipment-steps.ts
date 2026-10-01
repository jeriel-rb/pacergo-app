"use client";

import { useSubStepNav } from "./sub-step-nav";

export const GYM_EQUIPMENT_STEPS = [
  "where-do-you-exercise",
  "equipment",
  "add-cardio",
  "choose-cardio",
] as const;

export type GymEquipmentStep = (typeof GYM_EQUIPMENT_STEPS)[number];

/** "Choose your cardio" (the last step) only exists when the preceding "Add
 *  cardio to your plan?" question was answered "Yes" — AddCardioView routes
 *  there (or straight to `goToFinish()`) explicitly per button, rather than
 *  through a `skip` predicate here, since it sets that same answer and
 *  navigates in one click (see the stale-closure note on useSubStepNav). */
export function useGymEquipmentNav() {
  return useSubStepNav(GYM_EQUIPMENT_STEPS, { finishSuffix: "recommended-split" });
}
