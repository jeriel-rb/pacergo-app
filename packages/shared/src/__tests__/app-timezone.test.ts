import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  calendarDateKeyInAppTz,
  formatAppDateTimeCsv,
  formatInAppTimeZone,
  wallTimeToUtcIso,
} from "../time/app-timezone";

describe("wallTimeToUtcIso", () => {
  it("treats offset-less wall clock as Asia/Taipei (+08:00)", () => {
    // 14:00 Taipei = 06:00 UTC
    expect(wallTimeToUtcIso("2026-09-17", "14:00")).toBe(
      "2026-09-17T06:00:00.000Z",
    );
  });

  it("accepts HH:mm:ss", () => {
    expect(wallTimeToUtcIso("2026-01-01", "00:00:00")).toBe(
      "2025-12-31T16:00:00.000Z",
    );
  });
});

describe("formatAppDateTimeCsv", () => {
  it("renders UTC instants in Taipei with an explicit zone label", () => {
    // 09:55 UTC → 17:55 Taipei
    expect(formatAppDateTimeCsv("2026-10-01T09:55:00Z")).toBe(
      `2026-10-01 17:55:00 ${APP_TIME_ZONE}`,
    );
  });
});

describe("formatInAppTimeZone", () => {
  it("forces Asia/Taipei even when formatting options omit timeZone", () => {
    const out = formatInAppTimeZone("2026-10-01T06:00:00Z", "en", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    // 06:00 UTC → 14:00 Taipei
    expect(out).toMatch(/14:00/);
  });
});

describe("calendarDateKeyInAppTz", () => {
  it("returns YYYY-MM-DD for a known UTC instant in Taipei", () => {
    // 2026-09-16 22:00 UTC = 2026-09-17 06:00 Taipei
    expect(calendarDateKeyInAppTz(new Date("2026-09-16T22:00:00Z"))).toBe(
      "2026-09-17",
    );
  });
});
