"use client";

import { useTranslation } from "react-i18next";
import {
  bookableStartTimes,
  calendarDayKeyFromLocalDate,
  type AvailabilitySlot,
} from "@pacergo/shared";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { fmtTime } from "@/features/trainer/trainer-sections";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Weekly windows as "Mon, Wed 18:00–20:00": days sharing a window are grouped. */
function summarize(
  availability: AvailabilitySlot[],
  weekdays: string[],
  separator: string,
): string[] {
  const daysByRange = new Map<string, number[]>();
  const sorted = [...availability].sort(
    (a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute,
  );
  for (const slot of sorted) {
    const range = `${fmtTime(slot.start_minute)}–${fmtTime(slot.end_minute)}`;
    const days = daysByRange.get(range) ?? [];
    if (!days.includes(slot.weekday)) days.push(slot.weekday);
    daysByRange.set(range, days);
  }
  return [...daysByRange].map(
    ([range, days]) => `${days.map((d) => weekdays[d]).join(separator)} ${range}`,
  );
}

/**
 * Booking form "when": the trainer's weekly windows, a calendar where only
 * days with room for this session can be picked, then that day's open start
 * times. Taipei wall clock throughout (see `bookableStartTimes`).
 */
export function BookingWhenField({
  availability,
  sessionMinutes,
  date,
  time,
  onDateChange,
  onTimeChange,
  now = new Date(),
}: {
  availability: AvailabilitySlot[];
  /** Length of the chosen plan; a start time is offered only if it fits. */
  sessionMinutes: number;
  date: Date | undefined;
  /** `HH:mm`, or "" for none. */
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  now?: Date;
}) {
  const { t } = useTranslation(["sessions", "trainer"]);
  const locale = useLocale();
  const weekdays = t("trainer:weekdaysShort", { returnObjects: true }) as string[];

  if (availability.length === 0) {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("book.when")}</span>
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
          {t("book.noAvailability")}
        </p>
      </div>
    );
  }

  const timesFor = (dateKey: string) =>
    bookableStartTimes({ availability, dateKey, sessionMinutes, now });
  const dateKey = date ? calendarDayKeyFromLocalDate(date) : null;
  const times = dateKey ? timesFor(dateKey) : [];

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{t("book.when")}</span>

      <ul className="flex flex-wrap gap-1.5">
        {summarize(availability, weekdays, locale === "zh" ? "、" : ", ").map((line) => (
          <li
            key={line}
            className="rounded-md border border-border bg-secondary px-2 py-1 text-xs"
          >
            {line}
          </li>
        ))}
      </ul>

      <DatePicker
        date={date}
        onChange={(next) => {
          onDateChange(next);
          // Keep the time only if the new day offers it too.
          const nextTimes = next ? timesFor(calendarDayKeyFromLocalDate(next)) : [];
          if (!nextTimes.includes(time)) onTimeChange("");
        }}
        minDate={now}
        isDateDisabled={(key) => timesFor(key).length === 0}
        placeholder={t("book.whenDate")}
        aria-label={t("book.whenDate")}
      />

      {dateKey ? (
        <div
          role="group"
          aria-label={t("book.startTime")}
          className="grid grid-cols-4 gap-2 sm:grid-cols-5"
        >
          {times.map((slot) => {
            const selected = slot === time;
            return (
              <button
                key={slot}
                type="button"
                aria-pressed={selected}
                onClick={() => onTimeChange(slot)}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium tabular-nums transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {fmtTime(toMinutes(slot))}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("book.pickDayFirst")}</p>
      )}

      <p className="text-xs text-muted-foreground">{t("book.whenHint")}</p>
    </div>
  );
}
