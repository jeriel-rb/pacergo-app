"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ImageOff } from "lucide-react";
import type { ExerciseDetailServer } from "@/lib/plan-view.server";
import { useLocale } from "@/shared/hooks/use-locale";
import { exerciseArtSlugForDbSlug } from "@/shared/assets/exercise-art";
import { ExerciseArt } from "@/shared/components/atoms/exercise-art";
import { SetTracker, type ExerciseWorkout } from "./set-tracker";
import { useWorkoutProgress } from "./use-workout-progress";

/** A-5 exercise detail: name, an animated line-art illustration (exercises
 *  without artwork yet keep the "coming soon" placeholder), the workout's sets to
 *  tick off (when opened from a plan day), target muscles, 3-6 numbered steps and
 *  1-3 tips, zh-TW + EN. */
export function ExerciseDetailView({
  exercise,
  workout,
}: {
  exercise: ExerciseDetailServer;
  workout?: ExerciseWorkout;
}) {
  return workout ? (
    <TrackedDetail exercise={exercise} workout={workout} />
  ) : (
    <DetailBody exercise={exercise} />
  );
}

/** Owns the workout state (ticked sets + rest countdown) for this exercise's day. */
function TrackedDetail({ exercise, workout }: { exercise: ExerciseDetailServer; workout: ExerciseWorkout }) {
  const tracking = useWorkoutProgress({
    planId: workout.planId,
    week: workout.week,
    dayIndex: workout.dayIndex,
    restTimer: workout.restTimer,
    session: workout.session,
  });
  return <DetailBody exercise={exercise} workout={workout} tracking={tracking} />;
}

function DetailBody({
  exercise,
  workout,
  tracking,
}: {
  exercise: ExerciseDetailServer;
  workout?: ExerciseWorkout;
  tracking?: ReturnType<typeof useWorkoutProgress>;
}) {
  const { t } = useTranslation("plan");
  const locale = useLocale();
  const pathname = usePathname();

  const name = locale === "zh" ? exercise.nameZh : exercise.nameEn;
  const instructions = locale === "zh" ? exercise.instructionsZh : exercise.instructionsEn;
  const tips = locale === "zh" ? exercise.tipsZh : exercise.tipsEn;

  // Back returns to the same week's day list (the week rides along in ?week=).
  const week = useSearchParams().get("week");
  const dailyPath = pathname.replace(/\/exercise\/[^/]+$/, "") + (week ? `?week=${week}` : "");
  const artSlug = exerciseArtSlugForDbSlug(exercise.slug);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={dailyPath}
          aria-label={t("back")}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-semibold">{name}</h1>
      </div>

      {artSlug ? (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-muted">
          <ExerciseArt slug={artSlug} label={name} className="h-[90%] aspect-square" />
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50">
          <ImageOff size={28} className="text-muted-foreground/60" aria-hidden />
          <p className="text-xs text-muted-foreground">{t("detail.imagePlaceholder")}</p>
        </div>
      )}

      {workout && tracking && (
        <SetTracker workout={workout} tracking={tracking} equipment={exercise.equipment} />
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("detail.targetMuscles")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {exercise.muscleGroups.map((m) => (
            <span
              key={m}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground"
            >
              {t(`library.muscle.${m}`, { defaultValue: m.replace(/_/g, " ") })}
            </span>
          ))}
        </div>
      </section>

      {instructions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("detail.steps")}</h2>
          <ol className="space-y-2">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t("detail.stepsComingSoon")}
        </p>
      )}

      {tips.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-muted p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("detail.tips")}</h2>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
