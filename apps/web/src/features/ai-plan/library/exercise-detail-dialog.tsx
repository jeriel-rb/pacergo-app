"use client";

import { useTranslation } from "react-i18next";
import type { ExerciseCatalogEntry } from "@/shared/assets/exercise-catalog";
import { ExerciseArt } from "@/shared/components/atoms/exercise-art";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useExerciseLabels } from "./use-exercise-labels";

/** Animated illustration + equipment / muscle facts for one catalog exercise.
 *  Used by the exercise library and by the equipment / cardio pickers. */
export function ExerciseDetailDialog({
  exercise,
  onClose,
}: {
  exercise: ExerciseCatalogEntry | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("plan");
  const { nameOf, labelOf } = useExerciseLabels();

  return (
    <Dialog open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {exercise && (
          <>
            <DialogTitle className="pr-8">{nameOf(exercise)}</DialogTitle>
            <DialogDescription className="sr-only">
              {labelOf("equipment", exercise.equipment)} · {labelOf("muscle", exercise.primaryMuscle)}
            </DialogDescription>
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted">
              <ExerciseArt
                slug={exercise.slug}
                label={nameOf(exercise)}
                animate
                className="h-[92%] w-[92%]"
              />
            </div>
            <dl className="space-y-3 text-sm">
              <DetailRow label={t("library.detail.equipment")}>
                {labelOf("equipment", exercise.equipment)}
              </DetailRow>
              <DetailRow label={t("library.detail.primary")}>
                {labelOf("muscle", exercise.primaryMuscle)}
              </DetailRow>
              {exercise.secondaryMuscles.length > 0 && (
                <DetailRow label={t("library.detail.secondary")}>
                  {exercise.secondaryMuscles
                    .map((m) => labelOf("muscle", m))
                    .join(t("library.listSeparator"))}
                </DetailRow>
              )}
              {exercise.isStretch && (
                <DetailRow label={t("library.kindLabel")}>{t("library.detail.stretch")}</DetailRow>
              )}
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
