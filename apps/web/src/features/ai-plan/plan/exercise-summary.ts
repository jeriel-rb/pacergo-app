"use client";

import { useTranslation } from "react-i18next";
import type { GeneratedExercise } from "@pacergo/shared";
import { useDurationFormat } from "@/lib/format-duration";
import type { WorkoutGroup } from "./workout-progress";

/** One-line prescription for an exercise in a day list or on its screen:
 *  working sets read "4 × 8–12 · Rest 90 sec"; stretches read their duration
 *  and side ("30 sec · each side") — rest means nothing between stretches. */
export function useExerciseSummary() {
  const { t } = useTranslation("plan");
  const format = useDurationFormat();
  return (ex: GeneratedExercise, group: WorkoutGroup): string => {
    if (group === "cooldown") {
      const timed = /sec|min/i.test(ex.reps);
      const amount = timed ? format.reps(ex.reps) : t("daily.slowReps", { reps: ex.reps.replace("-", "–") });
      return ex.perSide ? `${amount} · ${t("daily.eachSide")}` : amount;
    }
    return `${ex.sets} × ${format.reps(ex.reps)} · ${t("daily.rest")} ${format.seconds(ex.restSec)}`;
  };
}
