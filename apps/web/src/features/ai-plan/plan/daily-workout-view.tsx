"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Dumbbell, PartyPopper, RotateCcw } from "lucide-react";
import type { GeneratedDay, GeneratedExercise } from "@pacergo/shared";
import type { PlanRestTimer } from "@/lib/plan-view.server";
import { useLocale } from "@/shared/hooks/use-locale";
import { useDurationFormat } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import { RestCountdown } from "./rest-countdown";
import { useWorkoutProgress } from "./use-workout-progress";
import { sessionProgress, setKey, type WorkoutGroup, type WorkoutProgress } from "./workout-progress";

/** A-4 daily workout screen: warm-up / main / cool-down (+ cardio, placed per
 *  the user's chosen start/end preference). It is the overview of the workout:
 *  each exercise shows how many of its sets are done. The sets themselves are
 *  ticked on the exercise's own screen, next to its steps. A running rest
 *  countdown shows here too, under the progress bar. */
export function DailyWorkoutView({
  planId,
  day,
  week,
  restTimer,
}: {
  planId: string;
  day: GeneratedDay;
  week: number;
  restTimer: PlanRestTimer;
}) {
  const { t } = useTranslation("plan");
  const locale = useLocale();
  const pathname = usePathname();
  const session = day.session;

  const overviewPath = pathname.replace(/\/day\/\d+$/, "");
  const { progress, rest, left, nudge, stop, reset } = useWorkoutProgress({
    planId,
    week,
    dayIndex: day.dayIndex,
    restTimer,
    session,
  });

  function onReset() {
    if (window.confirm(t("workout.resetConfirm"))) reset();
  }

  const totals = session ? sessionProgress(session, progress) : { done: 0, total: 0 };
  const complete = totals.total > 0 && totals.done >= totals.total;

  const groups: { group: WorkoutGroup; title: string; exercises: GeneratedExercise[] }[] = session
    ? [
        ...(session.cardio?.placement === "start"
          ? [{ group: "cardio" as const, title: t("daily.cardio"), exercises: [session.cardio.exercise] }]
          : []),
        { group: "warmup", title: t("daily.warmup"), exercises: session.warmup },
        { group: "main", title: t("daily.main"), exercises: session.main },
        { group: "cooldown", title: t("daily.cooldown"), exercises: session.cooldown },
        ...(session.cardio?.placement === "end"
          ? [{ group: "cardio" as const, title: t("daily.cardio"), exercises: [session.cardio.exercise] }]
          : []),
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`${overviewPath}?week=${week}`}
          aria-label={t("back")}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-semibold">{day.dayLabel[locale]}</h1>
      </div>

      {!session ? (
        <p className="text-sm text-muted-foreground">{t("overview.restDay")}</p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-muted-foreground">
                {totals.done === 0
                  ? t("workout.openHint")
                  : t("workout.progress", { done: totals.done, total: totals.total })}
              </span>
              {totals.done > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  <RotateCcw size={12} aria-hidden />
                  {t("workout.reset")}
                </button>
              )}
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totals.total}
              aria-valuenow={totals.done}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {rest && <RestCountdown left={left} onNudge={nudge} onStop={stop} />}

          {complete && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5">
              <PartyPopper size={20} className="shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{t("workout.complete.title")}</p>
                <p className="text-xs text-muted-foreground">{t("workout.complete.body", { total: totals.total })}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {groups.map(({ group, title, exercises }) => (
              <ExerciseGroup
                key={group + title}
                title={title}
                group={group}
                exercises={exercises}
                progress={progress}
                locale={locale}
                pathname={pathname}
                week={week}
              />
            ))}
          </div>

        </>
      )}
    </div>
  );
}

function ExerciseGroup({
  title,
  group,
  exercises,
  progress,
  locale,
  pathname,
  week,
}: {
  title: string;
  group: WorkoutGroup;
  exercises: GeneratedExercise[];
  progress: WorkoutProgress;
  locale: "zh" | "en";
  pathname: string;
  week: number;
}) {
  const { t } = useTranslation("plan");
  const format = useDurationFormat();
  if (exercises.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <div className="space-y-2.5">
        {exercises.map((ex) => {
          const done = (progress.done[setKey(group, ex.slug)] ?? []).filter((n) => n < ex.sets).length;
          const finished = done >= ex.sets;
          return (
            <Link
              key={setKey(group, ex.slug)}
              href={`${pathname}/exercise/${ex.slug}?week=${week}&group=${group}`}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:bg-accent",
                finished ? "border-primary/40" : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  finished ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {finished ? <Check size={18} aria-hidden /> : <Dumbbell size={18} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{ex.name[locale]}</span>
                <span className="block text-xs text-muted-foreground">
                  {ex.sets} × {format.reps(ex.reps)} · {t("daily.rest")} {format.seconds(ex.restSec)}
                </span>
              </span>
              {done > 0 && !finished && (
                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                  {done}/{ex.sets}
                </span>
              )}
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
