"use client";

import * as React from "react";
import type { PlanRestTimer } from "@/lib/plan-view.server";
import {
  EMPTY_PROGRESS,
  isSetDone,
  nudgeRest,
  parseProgress,
  progressStorageKey,
  secondsLeft,
  setKey,
  startRest,
  stopRest,
  toggleSet,
  type WorkoutGroup,
  type WorkoutProgress,
} from "./workout-progress";
import { playRestAlert, primeRestAlert } from "./rest-alert";

/** One workout day's ticked sets and rest countdown, shared by the day screen
 *  (overview + countdown) and the exercise screen (where sets are ticked). Both
 *  read the same saved state, so leaving to read a step and coming back — or
 *  going back to the day list — loses nothing. State is kept on this device. */
export function useWorkoutProgress({
  planId,
  week,
  dayIndex,
  restTimer,
}: {
  planId: string;
  week: number;
  dayIndex: number;
  restTimer: PlanRestTimer;
}) {
  const storageKey = progressStorageKey(planId, week, dayIndex);
  const [progress, setProgress] = React.useState<WorkoutProgress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  /** End time of the countdown whose alert already went off (or was already over
   *  when the page opened), so it never fires twice. */
  const alerted = React.useRef<number | null>(null);

  // Load this workout's saved sets (after mount — storage isn't there on the server).
  React.useEffect(() => {
    let saved = EMPTY_PROGRESS;
    try {
      saved = parseProgress(window.localStorage.getItem(storageKey));
    } catch {
      // Storage blocked: the workout still works, it just won't be remembered.
    }
    const at = Date.now();
    // A countdown that already ran out while the page was closed: drop it, no alert.
    if (saved.rest && saved.rest.endsAt <= at) saved = stopRest(saved);
    setProgress(saved);
    setNow(at);
    setLoaded(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // Ignore — see above.
    }
  }, [progress, loaded, storageKey]);

  const rest = progress.rest;

  // Tick while a countdown is running (against the end time, so a sleeping tab
  // catches up instead of drifting).
  React.useEffect(() => {
    if (!rest) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rest]);

  const left = rest ? secondsLeft(rest, now) : 0;

  // Countdown finished: alert once (not if it had already run out before the page
  // opened), then clear it so the countdown disappears.
  React.useEffect(() => {
    if (!rest || left > 0) return;
    if (alerted.current !== rest.endsAt) {
      alerted.current = rest.endsAt;
      playRestAlert({ sound: restTimer.sound });
    }
    setProgress((p) => (p.rest?.endsAt === rest.endsAt ? stopRest(p) : p));
  }, [rest, left, restTimer.sound]);

  /** Ticks/unticks a set. Ticking a main-lift set starts that exercise's rest
   *  countdown — except the workout's very last main set (`isFinalSet`), where
   *  there's nothing left to rest for. Warm-up, cool-down and cardio never rest. */
  const toggle = React.useCallback(
    (group: WorkoutGroup, exercise: { slug: string; restSec: number }, set: number, isFinalSet: boolean) => {
      const key = setKey(group, exercise.slug);
      const at = Date.now();
      setNow(at);
      setProgress((p) => {
        const wasDone = isSetDone(p, key, set);
        let next = toggleSet(p, key, set);
        if (!wasDone && restTimer.enabled && group === "main" && !isFinalSet) {
          primeRestAlert();
          next = startRest(next, exercise.restSec, at);
        }
        return next;
      });
    },
    [restTimer.enabled],
  );

  const nudge = React.useCallback((deltaSec: number) => {
    const at = Date.now();
    setNow(at);
    setProgress((p) => nudgeRest(p, deltaSec, at));
  }, []);

  const stop = React.useCallback(() => setProgress((p) => stopRest(p)), []);
  const reset = React.useCallback(() => setProgress(EMPTY_PROGRESS), []);

  return { progress, rest, left, toggle, nudge, stop, reset };
}
