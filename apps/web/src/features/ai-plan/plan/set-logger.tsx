"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, History } from "lucide-react";
import { EFFORT_FEEDBACK, type LoggedSet } from "@pacergo/shared";
import { useLocale } from "@/shared/hooks/use-locale";
import { useDurationFormat } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import type { useExerciseLog } from "./use-exercise-log";
import { displayWeight, toKg, useWeightUnit, type WeightUnit } from "./weight-unit";

function formatSets(sets: readonly LoggedSet[], unit: WeightUnit, repsLabel: string): string {
  const done = sets.filter((s) => (s.reps ?? 0) > 0);
  if (done.length === 0) return "—";
  const weights = [...new Set(done.map((s) => s.weightKg ?? 0))];
  if (weights.length === 1) {
    const reps = done.map((s) => s.reps).join(" / ");
    return weights[0]! > 0 ? `${displayWeight(weights[0]!, unit)} ${unit} × ${reps}` : `${reps} ${repsLabel}`;
  }
  return done.map((s) => `${displayWeight(s.weightKg ?? 0, unit)}×${s.reps}`).join(", ");
}

/** Weight × reps logging for a main lift's working sets — the exercise
 *  screen's existing "Your sets" card, extended. Ticking a set keeps its
 *  existing behaviour (order, rest countdown); the numbers beside it are what
 *  gets saved to the account and calibrates the next suggestion. */
export function SetLogger({
  setCount,
  reps,
  loaded,
  log,
  isDone,
  nextSet,
  lastDone,
  onTick,
}: {
  setCount: number;
  reps: string;
  /** Show a weight field (free weights, machines, cables; not bodyweight/bands). */
  loaded: boolean;
  log: ReturnType<typeof useExerciseLog>;
  isDone: (set: number) => boolean;
  nextSet: number;
  lastDone: number;
  onTick: (set: number) => void;
}) {
  const { t } = useTranslation("plan");
  const locale = useLocale();
  const format = useDurationFormat();
  const [unit, setUnit] = useWeightUnit();
  const allDone = Array.from({ length: setCount }, (_, i) => isDone(i)).every(Boolean);
  const repsLabel = t("workout.log.repsUnit");

  const date = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale === "zh" ? "zh-TW" : "en", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      {loaded && (
        <div className="flex items-center justify-end gap-1" role="group" aria-label={t("workout.log.unitToggle")}>
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {log.previous && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <History size={14} className="mt-0.5 shrink-0" aria-hidden />
          {t("workout.log.lastTime", {
            date: date(log.previous.performedOn),
            sets: formatSets(log.previous.sets, unit, repsLabel),
          })}
          {log.previous.effort && ` · ${t(`workout.log.effort.${log.previous.effort}`)}`}
        </p>
      )}

      {loaded && log.suggestion && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold">
              {t("workout.log.suggested", { weight: `${displayWeight(log.suggestion.weightKg, unit)} ${unit}` })}
            </p>
            <p className="text-muted-foreground">{t(`workout.log.reason.${log.suggestion.reason}`)}</p>
          </div>
          <button
            type="button"
            onClick={() => log.applySuggestion(Math.max(0, nextSet))}
            disabled={nextSet < 0}
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40"
          >
            {t("workout.log.useSuggestion")}
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("workout.log.target", { reps: format.reps(reps) })}
      </p>

      <ol className="space-y-2">
        {log.sets.slice(0, setCount).map((s, set) => {
          const done = isDone(set);
          const upcoming = !done && set !== nextSet;
          const locked = done && set !== lastDone;
          return (
            <li key={set} className={cn("flex items-center gap-2", upcoming && "opacity-50")}>
              <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                {t("workout.setLabel", { number: set + 1 })}
              </span>
              {loaded && (
                <>
                  <NumberField
                    label={`${t("workout.log.weight")} ${set + 1}`}
                    value={s.weightKg == null ? null : displayWeight(s.weightKg, unit)}
                    step={unit === "lb" ? 1 : 0.5}
                    onChange={(v) => log.updateSet(set, { weightKg: v == null ? null : toKg(v, unit) })}
                  />
                  <span className="text-xs text-muted-foreground">{unit} ×</span>
                </>
              )}
              <NumberField
                label={`${t("workout.log.reps")} ${set + 1}`}
                value={s.reps}
                step={1}
                placeholder={reps.match(/\d+/g)?.at(-1) ?? ""}
                onChange={(v) => log.updateSet(set, { reps: v == null ? null : Math.round(v) })}
              />
              <span className="text-xs text-muted-foreground">{repsLabel}</span>
              <button
                type="button"
                aria-pressed={done}
                aria-label={t("workout.setLabel", { number: set + 1 })}
                disabled={upcoming || locked}
                onClick={() => {
                  if (!done) log.completeSet(set);
                  onTick(set);
                }}
                className={cn(
                  "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  done && "border-primary bg-primary text-primary-foreground disabled:opacity-100",
                  !done && set === nextSet && "border-primary hover:bg-accent",
                  upcoming && "border-border",
                )}
              >
                <Check size={18} aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">{t("workout.log.effortTitle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {EFFORT_FEEDBACK.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={log.effort === e}
                onClick={() => log.setEffort(e)}
                className={cn(
                  "rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                  log.effort === e ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
                )}
              >
                {t(`workout.log.effort.${e}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {log.saveState !== "idle" && (
        <p
          className={cn("text-xs", log.saveState === "error" ? "text-destructive" : "text-muted-foreground")}
          aria-live="polite"
        >
          {t(`workout.log.save.${log.saveState}`)}
        </p>
      )}
    </div>
  );
}

/** Numeric input that keeps what's being typed ("62.", "") and reports a
 *  parsed number (or null when cleared). */
function NumberField({
  label,
  value,
  step,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null;
  step: number;
  placeholder?: string;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = React.useState(value == null ? "" : String(value));
  const focused = React.useRef(false);
  React.useEffect(() => {
    if (!focused.current) setText(value == null ? "" : String(value));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(value == null ? "" : String(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.value === "" ? null : Number(e.target.value);
        if (n === null || (Number.isFinite(n) && n >= 0)) onChange(n);
      }}
      className="h-10 w-16 min-w-0 rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums focus:border-primary focus:outline-none"
    />
  );
}
