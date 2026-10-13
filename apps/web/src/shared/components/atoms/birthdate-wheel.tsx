"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { earliestBirthdateForAge, latestBirthdateForAge } from "@pacergo/shared";
import { WheelPicker } from "./wheel-picker";

type Ymd = { y: number; m: number; d: number };

function parseYmd(iso: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

function toIso({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

/** ISO birthdate `defaultAge` years ago, used before the user scrolls. */
export function defaultBirthdate(defaultAge: number): string {
  return `${new Date().getFullYear() - defaultAge}-01-01`;
}

/** Year / month / day scroll wheels for a birthdate, bounded so the derived
 *  age stays within [minAge, maxAge]. Shows `defaultBirthdate(defaultAge)`
 *  while `value` is null; callers commit that default on confirm. */
export function BirthdateWheel({
  value,
  onChange,
  minAge,
  maxAge,
  defaultAge,
  ariaLabel,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  minAge: number;
  maxAge: number;
  defaultAge: number;
  ariaLabel?: string;
}) {
  const { i18n } = useTranslation();
  const min = parseYmd(earliestBirthdateForAge(maxAge))!;
  const max = parseYmd(latestBirthdateForAge(minAge))!;
  const current = parseYmd(value ?? "") ?? parseYmd(defaultBirthdate(defaultAge))!;

  const years = React.useMemo(() => range(min.y, max.y), [min.y, max.y]);
  const months = React.useMemo(
    () => range(current.y === min.y ? min.m : 1, current.y === max.y ? max.m : 12),
    [current.y, min.y, min.m, max.y, max.m],
  );
  const days = React.useMemo(() => {
    const atMin = current.y === min.y && current.m === min.m;
    const atMax = current.y === max.y && current.m === max.m;
    return range(atMin ? min.d : 1, atMax ? max.d : daysInMonth(current.y, current.m));
  }, [current.y, current.m, min.y, min.m, min.d, max.y, max.m, max.d]);

  /** Clamp a changed date into the allowed window and to a real day. */
  function commit(next: Ymd) {
    const d = Math.min(next.d, daysInMonth(next.y, next.m));
    let iso = toIso({ ...next, d });
    if (iso < toIso(min)) iso = toIso(min);
    if (iso > toIso(max)) iso = toIso(max);
    onChange(iso);
  }

  const fmt = (opts: Intl.DateTimeFormatOptions, y: number, m: number, d: number) =>
    new Intl.DateTimeFormat(i18n.language, opts).format(new Date(y, m - 1, d));

  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center justify-center gap-2 py-4">
      <WheelPicker
        values={years}
        value={current.y}
        onChange={(y) => commit({ ...current, y })}
        formatValue={(y) => fmt({ year: "numeric" }, y, 1, 1)}
        className="w-28"
      />
      <WheelPicker
        values={months}
        value={current.m}
        onChange={(m) => commit({ ...current, m })}
        formatValue={(m) => fmt({ month: "short" }, 2000, m, 1)}
        className="w-20"
      />
      <WheelPicker
        values={days}
        value={current.d}
        onChange={(d) => commit({ ...current, d })}
        formatValue={(d) => fmt({ day: "numeric" }, 2000, 1, d)}
        className="w-20"
      />
    </div>
  );
}
