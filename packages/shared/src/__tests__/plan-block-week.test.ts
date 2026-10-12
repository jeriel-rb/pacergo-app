import { describe, expect, it } from "vitest";
import { planBlockWeek } from "../time/plan-block-week";

describe("planBlockWeek", () => {
  it("stays on week 1 for the Taipei day the plan was created", () => {
    // 16:30 UTC is 00:30 the next calendar day in Taipei.
    // Counting the UTC date would start the block a day early.
    expect(planBlockWeek("2026-10-04T16:30:00.000Z", new Date("2026-10-04T16:30:00.000Z"))).toBe(1);
    expect(planBlockWeek("2026-10-04T16:30:00.000Z", new Date("2026-10-11T15:00:00.000Z"))).toBe(1);
  });

  it("opens week 2 at the next Taipei midnight, not the UTC date", () => {
    // Created 00:30 Taipei on Oct 5. Seven Taipei days later is 00:00 on Oct 12.
    // The same instant is still Oct 11 in UTC, which would stay on week 1.
    expect(planBlockWeek("2026-10-04T16:30:00.000Z", new Date("2026-10-11T16:00:00.000Z"))).toBe(2);
  });

  it("wraps week 5 back onto week 1 and keeps week 4 on day 27", () => {
    expect(planBlockWeek("2026-10-05T00:00:00.000Z", new Date("2026-11-01T16:00:00.000Z"))).toBe(1);
    expect(planBlockWeek("2026-10-05T00:00:00.000Z", new Date("2026-10-31T16:00:00.000Z"))).toBe(4);
  });

  it("opens week 1 when the timestamp is missing or invalid", () => {
    expect(planBlockWeek("not-a-date", new Date("2026-10-12T00:00:00.000Z"))).toBe(1);
  });
});
