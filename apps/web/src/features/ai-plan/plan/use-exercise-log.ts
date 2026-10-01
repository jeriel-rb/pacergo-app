"use client";

import * as React from "react";
import {
  parseRepRange,
  recommendLoad,
  type EffortFeedback,
  type LoadRecommendation,
  type LoggedSet,
} from "@pacergo/shared";
import {
  fetchDayLogs,
  fetchExerciseHistory,
  logExerciseSets,
  type ExerciseHistoryEntry,
  type WorkoutDayRef,
} from "@/lib/workout-logs";

const SAVE_DELAY_MS = 700;

export type LogSaveState = "idle" | "saving" | "saved" | "error";

/**
 * One exercise's actual performance for today: weight (kg) × reps per set and
 * simple effort feedback, saved to the account as it's entered. Also loads the
 * exercise's earlier history and the calibrated suggestion for today's load,
 * which prefills empty weights (the user can always type their own).
 *
 * `onRestoredDone` reports sets the account already has reps for today (another
 * device, or after signing back in) so the caller can show them as done.
 */
export function useExerciseLog({
  day,
  slug,
  setCount,
  targetReps,
  onRestoredDone,
}: {
  day: WorkoutDayRef;
  slug: string;
  setCount: number;
  targetReps: string;
  onRestoredDone: (sets: number[]) => void;
}) {
  const empty = React.useCallback(
    (): LoggedSet[] => Array.from({ length: setCount }, () => ({ weightKg: null, reps: null })),
    [setCount],
  );
  const [sets, setSets] = React.useState<LoggedSet[]>(empty);
  const [effort, setEffortState] = React.useState<EffortFeedback | null>(null);
  const [history, setHistory] = React.useState<ExerciseHistoryEntry[]>([]);
  const [suggestion, setSuggestion] = React.useState<LoadRecommendation | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saveState, setSaveState] = React.useState<LogSaveState>("idle");
  const dirty = React.useRef(false);
  const restored = React.useRef(onRestoredDone);
  restored.current = onRestoredDone;

  const { planId, week, dayIndex } = day;
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDayLogs({ planId, week, dayIndex }), fetchExerciseHistory(slug)])
      .then(([dayLogs, past]) => {
        if (cancelled) return;
        const today = dayLogs[slug];
        const rec = recommendLoad({ targetReps, previous: past[0] ?? null });
        // Starting reference: the calibrated suggestion, else last time's load.
        const lastTop = past[0]?.sets.reduce((m, s) => Math.max(m, s.weightKg ?? 0), 0) || null;
        const startKg = rec?.weightKg ?? lastTop;
        const base = empty();
        const merged = base.map((s, i) => today?.sets[i] ?? { ...s, weightKg: startKg });
        setSets(merged);
        setEffortState(today?.effort ?? null);
        setHistory(past);
        setSuggestion(rec);
        const doneSets = (today?.sets ?? []).flatMap((s, i) => ((s.reps ?? 0) > 0 && i < setCount ? [i] : []));
        if (doneSets.length) restored.current(doneSets);
      })
      .catch(() => {
        // Offline or not migrated yet: logging still works locally this visit.
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [planId, week, dayIndex, slug, targetReps, setCount, empty]);

  // Autosave shortly after the last edit.
  React.useEffect(() => {
    if (!loaded || !dirty.current) return;
    setSaveState("saving");
    const id = window.setTimeout(() => {
      logExerciseSets({ planId, week, dayIndex, slug }, { sets, effort })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [sets, effort, loaded, planId, week, dayIndex, slug]);

  const updateSet = React.useCallback((index: number, patch: Partial<LoggedSet>) => {
    dirty.current = true;
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  /** Fill what the user didn't type when they tick a set: reps default to the
   *  top of the target range; weight stays whatever is shown. */
  const completeSet = React.useCallback(
    (index: number) => {
      const top = parseRepRange(targetReps)?.high ?? null;
      dirty.current = true;
      setSets((prev) => prev.map((s, i) => (i === index && s.reps == null ? { ...s, reps: top } : s)));
    },
    [targetReps],
  );

  const setEffort = React.useCallback((value: EffortFeedback) => {
    dirty.current = true;
    setEffortState(value);
  }, []);

  /** Apply the suggested load to every set not yet done. */
  const applySuggestion = React.useCallback(
    (fromSet: number) => {
      if (!suggestion) return;
      dirty.current = true;
      setSets((prev) => prev.map((s, i) => (i >= fromSet ? { ...s, weightKg: suggestion.weightKg } : s)));
    },
    [suggestion],
  );

  return {
    loaded,
    sets,
    effort,
    previous: history[0] ?? null,
    suggestion,
    saveState,
    updateSet,
    completeSet,
    setEffort,
    applySuggestion,
  };
}
