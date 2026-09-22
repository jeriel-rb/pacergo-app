"use client";

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

/** "long" reads as words ("2 min 25 sec"); "short" is compact for tight spots
 *  such as slider labels ("2m 25s"). */
export type DurationStyle = "long" | "short";

/** Seconds → localized text. Under a minute it's seconds; from a minute up it's
 *  minutes, plus the leftover seconds when there are any:
 *  45 → "45 sec", 60 → "1 min", 145 → "2 min 25 sec". Wording comes from
 *  `common.json` → `duration.*`, so it follows the UI language. `t` must be
 *  bound to (or able to reach) the `common` namespace. */
export function formatSeconds(t: TFunction, totalSec: number, style: DurationStyle = "long"): string {
  const sec = Math.max(0, Math.round(Number.isFinite(totalSec) ? totalSec : 0));
  const key = (name: string) => `common:duration.${style}.${name}`;
  if (sec < 60) return t(key("seconds"), { count: sec });
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return seconds === 0
    ? t(key("minutes"), { count: minutes })
    : t(key("minutesSeconds"), { minutes, seconds });
}

/** A reps prescription for display. Timed work is stored as text in the plan
 *  ("45 sec", "15-20 min") — this localizes it ("45 秒", "15–20 分鐘"); rep
 *  counts like "8-12" are language-neutral and pass through unchanged. */
export function formatReps(t: TFunction, reps: string): string {
  const timed = /^(\d+)(?:\s*-\s*(\d+))?\s*(sec|min)$/i.exec(reps.trim());
  if (!timed) return reps;
  const [, from, to, unit] = timed;
  const name = unit!.toLowerCase() === "min" ? "minutesRange" : "secondsRange";
  const range = to ? `${from}–${to}` : from!;
  return t(`common:duration.long.${name}`, { range });
}

/** `formatSeconds` / `formatReps` bound to the current UI language. */
export function useDurationFormat() {
  const { t } = useTranslation("common");
  return {
    seconds: (sec: number, style: DurationStyle = "long") => formatSeconds(t, sec, style),
    reps: (reps: string) => formatReps(t, reps),
  };
}
