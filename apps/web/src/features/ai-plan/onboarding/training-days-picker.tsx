"use client";

import { useTranslation } from "react-i18next";
import { trainingDaysCount, type OnboardingDaysPerWeek } from "@pacergo/shared";
import { cn } from "@/lib/utils";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Which weekdays to train on, for an already-chosen frequency (Monday–
 *  Sunday). At most `trainingDaysCount(daysPerWeek)` can be selected — a full
 *  selection has to drop a day before another can be added — and callers
 *  require exactly that many (`trainingDaysComplete`) before continuing.
 *  Unselected days become rest days. Hidden for "every day". */
export function TrainingDaysPicker({
  daysPerWeek,
  value,
  onChange,
}: {
  daysPerWeek: OnboardingDaysPerWeek;
  value: readonly number[];
  onChange: (days: number[]) => void;
}) {
  const { t } = useTranslation("onboarding");
  const count = trainingDaysCount(daysPerWeek);
  if (count === 7) return null;

  const selected = [...new Set(value)];
  const full = selected.length >= count;

  function toggle(day: number) {
    if (selected.includes(day)) onChange(selected.filter((d) => d !== day));
    else if (!full) onChange([...selected, day].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t("trainingPreferences.trainingDays.title")}</p>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={t("trainingPreferences.trainingDays.title")}>
        {WEEKDAYS.map((day) => {
          const on = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(day)}
              className={cn(
                "rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent disabled:opacity-40 disabled:hover:bg-card",
              )}
            >
              {t(`trainingPreferences.trainingDays.days.${day}`)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("trainingPreferences.trainingDays.hint", { selected: selected.length, count })}
      </p>
    </div>
  );
}
