"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { exerciseModality, parseRepRange, type GeneratedSession } from "@pacergo/shared";
import type { PlanRestTimer } from "@/lib/plan-view.server";
import { useLocale } from "@/shared/hooks/use-locale";
import { useDurationFormat } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import { RestCountdown } from "./rest-countdown";
import type { useWorkoutProgress } from "./use-workout-progress";
import { isSetDone, setKey, type ExerciseSlot } from "./workout-progress";
import { SetLogger } from "./set-logger";
import { useExerciseLog } from "./use-exercise-log";

/** Everything the exercise screen needs to track this exercise in its workout. */
export interface ExerciseWorkout {
  planId: string;
  week: number;
  dayIndex: number;
  restTimer: PlanRestTimer;
  slot: ExerciseSlot;
  session: GeneratedSession;
}

/** "Your sets" — tick each set as you finish it, right where the steps are.
 *  Main-lift sets start the rest countdown, and when every set is done the next exercise is one
 *  tap away. Main lifts with a rep target also log actual weight × reps per
 *  set (saved to the account, calibrating the next suggestion). `tracking` is
 *  the page's shared workout state. */
export function SetTracker({
  workout,
  tracking,
  equipment,
}: {
  workout: ExerciseWorkout;
  tracking: ReturnType<typeof useWorkoutProgress>;
  /** The exercise's equipment ids — bodyweight/band work logs reps only. */
  equipment: string[];
}) {
  const { week, restTimer, slot } = workout;
  const { t } = useTranslation("plan");
  const locale = useLocale();
  const pathname = usePathname();
  const format = useDurationFormat();
  const { progress, rest, left, toggle, nudge, stop, markDone } = tracking;

  const { group, exercise } = slot;
  const key = setKey(group, exercise.slug);
  const doneCount = (progress.done[key] ?? []).filter((n) => n < exercise.sets).length;
  const allDone = doneCount >= exercise.sets;
  // Sets go in order: the next one is live, ticked ones stay put (only the latest
  // can be undone), and the ones after the next are dimmed until their turn.
  const lastDone = Math.max(-1, ...(progress.done[key] ?? []).filter((n) => n < exercise.sets));
  const nextSet = Array.from({ length: exercise.sets }, (_, i) => i).find((i) => !isSetDone(progress, key, i)) ?? -1;

  // Working sets of a main lift with a rep target log weight × reps; warm-up,
  // cool-down, cardio and timed holds just get ticked.
  const logsPerformance = group === "main" && parseRepRange(exercise.reps) !== null;
  const loaded = !["bodyweight", "band"].includes(exerciseModality({ slug: exercise.slug, equipment }));

  const exerciseBase = pathname.replace(/\/exercise\/[^/]+$/, "");
  const nextHref = slot.next
    ? `${exerciseBase}/exercise/${slot.next.exercise.slug}?week=${week}&group=${slot.next.group}`
    : `${exerciseBase}?week=${week}`;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("workout.yourSets")}</h2>
          {doneCount > 0 && (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {t("workout.setsDone", { done: doneCount, total: exercise.sets })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {exercise.sets} × {format.reps(exercise.reps)} · {t("daily.rest")} {format.seconds(exercise.restSec)}
        </p>
        {logsPerformance ? (
          <LoggedSets
            workout={workout}
            isDone={(set) => isSetDone(progress, key, set)}
            nextSet={nextSet}
            lastDone={lastDone}
            loaded={loaded}
            onTick={(set) => toggle(group, exercise, set, slot.isLastMain && set === exercise.sets - 1)}
            onRestoredDone={(sets) => markDone(key, sets)}
          />
        ) : (
          <>
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: exercise.sets }, (_, set) => {
              const done = isSetDone(progress, key, set);
              const upcoming = !done && set !== nextSet; // not this set's turn yet
              const locked = done && set !== lastDone; // ticked, and something later is ticked too
              return (
                <button
                  key={set}
                  type="button"
                  aria-pressed={done}
                  aria-label={t("workout.setLabel", { number: set + 1 })}
                  disabled={upcoming || locked}
                  onClick={() => toggle(group, exercise, set, slot.isLastMain && set === exercise.sets - 1)}
                  className={cn(
                    "flex h-12 min-w-12 flex-col items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition-colors",
                    done && "border-primary bg-primary text-primary-foreground disabled:opacity-100",
                    !done && set === nextSet && "border-primary text-foreground hover:bg-accent",
                    upcoming && "border-border bg-background text-muted-foreground opacity-40",
                  )}
                >
                  {done ? <Check size={18} aria-hidden /> : set + 1}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {group === "main" && restTimer.enabled ? t("workout.tapHint") : t("workout.tapHintNoRest")}
          </p>
          </>
        )}

        {rest && <RestCountdown left={left} onNudge={nudge} onStop={stop} />}

        {allDone && (
          <Link
            href={nextHref}
            className="flex items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="min-w-0 truncate">
              {slot.next
                ? t("workout.next", { name: slot.next.exercise.name[locale] })
                : t("workout.backToWorkout")}
            </span>
            <ArrowRight size={16} className="shrink-0" aria-hidden />
          </Link>
        )}
    </section>
  );
}

/** Owns one main lift's performance log (needs its own hook, so it's only
 *  mounted for exercises that log). */
function LoggedSets({
  workout,
  isDone,
  nextSet,
  lastDone,
  loaded,
  onTick,
  onRestoredDone,
}: {
  workout: ExerciseWorkout;
  isDone: (set: number) => boolean;
  nextSet: number;
  lastDone: number;
  loaded: boolean;
  onTick: (set: number) => void;
  onRestoredDone: (sets: number[]) => void;
}) {
  const { exercise } = workout.slot;
  const log = useExerciseLog({
    day: { planId: workout.planId, week: workout.week, dayIndex: workout.dayIndex },
    slug: exercise.slug,
    setCount: exercise.sets,
    targetReps: exercise.reps,
    onRestoredDone,
  });
  return (
    <SetLogger
      setCount={exercise.sets}
      reps={exercise.reps}
      loaded={loaded}
      log={log}
      isDone={isDone}
      nextSet={nextSet}
      lastDone={lastDone}
      onTick={onTick}
    />
  );
}
