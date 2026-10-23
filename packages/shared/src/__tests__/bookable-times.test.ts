import { describe, expect, it } from "vitest";
import { bookableStartTimes, weekdayOfDateKey } from "../booking/bookable-times";
import type { AvailabilitySlot } from "../types/trainer";

const h = (hh: number, mm = 0) => hh * 60 + mm;
// Mon 18:00–20:00 — the shape most live trainers use.
const monEvening: AvailabilitySlot[] = [{ weekday: 1, start_minute: h(18), end_minute: h(20) }];
const MONDAY = "2026-10-26";
const TUESDAY = "2026-10-27";
const LONG_AGO = new Date("2026-01-01T00:00:00Z");

describe("weekdayOfDateKey", () => {
  it("reads the weekday off the calendar date (0 = Sunday), whatever the device timezone", () => {
    expect(weekdayOfDateKey("2026-10-25")).toBe(0);
    expect(weekdayOfDateKey(MONDAY)).toBe(1);
    expect(weekdayOfDateKey("2026-10-31")).toBe(6);
  });
});

describe("bookableStartTimes", () => {
  it("offers every half hour where the whole session fits in the window", () => {
    expect(
      bookableStartTimes({ availability: monEvening, dateKey: MONDAY, sessionMinutes: 60, now: LONG_AGO }),
    ).toEqual(["18:00", "18:30", "19:00"]);
  });

  it("offers nothing on a day the trainer isn't available", () => {
    expect(
      bookableStartTimes({ availability: monEvening, dateKey: TUESDAY, sessionMinutes: 60, now: LONG_AGO }),
    ).toEqual([]);
  });

  it("fits longer sessions, and drops a window too short for them", () => {
    const args = { availability: monEvening, dateKey: MONDAY, now: LONG_AGO };
    expect(bookableStartTimes({ ...args, sessionMinutes: 120 })).toEqual(["18:00"]);
    expect(bookableStartTimes({ ...args, sessionMinutes: 150 })).toEqual([]);
  });

  it("merges several windows on one day, sorted and without duplicates", () => {
    const availability: AvailabilitySlot[] = [
      { weekday: 1, start_minute: h(19), end_minute: h(21) },
      { weekday: 1, start_minute: h(9), end_minute: h(10) },
      { weekday: 1, start_minute: h(18), end_minute: h(20) },
    ];
    expect(
      bookableStartTimes({ availability, dateKey: MONDAY, sessionMinutes: 60, now: LONG_AGO }),
    ).toEqual(["09:00", "18:00", "18:30", "19:00", "19:30", "20:00"]);
  });

  it("hides start times already past today (Taipei clock)", () => {
    // 18:10 Taipei on that Monday
    const now = new Date("2026-10-26T18:10:00+08:00");
    expect(
      bookableStartTimes({ availability: monEvening, dateKey: MONDAY, sessionMinutes: 60, now }),
    ).toEqual(["18:30", "19:00"]);
  });

  it("offers nothing without availability", () => {
    expect(
      bookableStartTimes({ availability: [], dateKey: MONDAY, sessionMinutes: 60, now: LONG_AGO }),
    ).toEqual([]);
  });
});
