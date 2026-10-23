import type { AvailabilitySlot } from '../types/trainer';
import { wallTimeToUtcIso } from '../time/app-timezone';

/** Booking start times are offered on this grid, counted from each window's start. */
export const BOOKING_SLOT_STEP_MINUTES = 30;

/** Weekday (0 = Sunday … 6 = Saturday) of a `YYYY-MM-DD` calendar date. */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Minutes since midnight → `HH:mm`. */
export function minutesToTime(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Start times (`HH:mm`, Taipei wall clock) a member can book on `dateKey`:
 * the whole session must fit inside one of the trainer's weekly windows
 * (`availability`, Taipei time), and times already past are left out.
 * Empty = the trainer isn't bookable that day.
 */
export function bookableStartTimes({
  availability,
  dateKey,
  sessionMinutes,
  now = new Date(),
  stepMinutes = BOOKING_SLOT_STEP_MINUTES,
}: {
  availability: AvailabilitySlot[];
  dateKey: string;
  sessionMinutes: number;
  now?: Date;
  stepMinutes?: number;
}): string[] {
  const weekday = weekdayOfDateKey(dateKey);
  const starts = new Set<number>();
  for (const slot of availability) {
    if (slot.weekday !== weekday) continue;
    for (let start = slot.start_minute; start + sessionMinutes <= slot.end_minute; start += stepMinutes) {
      starts.add(start);
    }
  }
  return [...starts]
    .sort((a, b) => a - b)
    .map(minutesToTime)
    .filter((time) => new Date(wallTimeToUtcIso(dateKey, time)) > now);
}
