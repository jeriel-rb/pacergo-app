/**
 * Pacergo business timezone.
 *
 * Sessions happen in Taiwan. Store UTC (`timestamptz`); parse wall-clock
 * inputs and render all user/admin timestamps in Asia/Taipei so a "2pm"
 * booking means 14:00 Taipei regardless of the device's configured TZ.
 * Taipei observes UTC+8 year-round (no DST).
 */
export const APP_TIME_ZONE = "Asia/Taipei" as const;
/** Fixed offset used when building ISO strings from wall-clock inputs. */
export const APP_UTC_OFFSET = "+08:00" as const;

export type AppLocale = "zh" | "en";

function localeTag(locale: AppLocale): string {
  return locale === "zh" ? "zh-TW" : "en-US";
}

/**
 * Interpret a calendar date + time-of-day as Taipei wall clock → UTC ISO.
 * `dateKey` = `YYYY-MM-DD`, `time` = `HH:mm` or `HH:mm:ss`.
 */
export function wallTimeToUtcIso(dateKey: string, time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateKey}T${normalized}${APP_UTC_OFFSET}`).toISOString();
}

/** `YYYY-MM-DD` for `date` in the app timezone (defaults to now). */
export function calendarDateKeyInAppTz(date: Date = new Date()): string {
  // en-CA yields ISO-like YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * `YYYY-MM-DD` from a Date picker's local calendar cell (getFullYear/Month/Date).
 * Use when the user picked a day on a calendar — then pass to wallTimeToUtcIso
 * so that day is treated as a Taipei business date.
 */
export function calendarDayKeyFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a stored UTC instant for in-app display (always Asia/Taipei). */
export function formatInAppTimeZone(
  iso: string | Date,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(d);
}

/**
 * Excel-friendly timestamp in Asia/Taipei with an explicit zone label:
 * `YYYY-MM-DD HH:mm:ss Asia/Taipei`.
 */
export function formatAppDateTimeCsv(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  let hour = get("hour");
  if (hour === "24") hour = "00";

  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")} ${APP_TIME_ZONE}`;
}
