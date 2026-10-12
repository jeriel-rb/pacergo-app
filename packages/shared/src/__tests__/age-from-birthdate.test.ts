import { describe, expect, it } from "vitest";
import {
  ageFromBirthdate,
  earliestBirthdateForAge,
  latestBirthdateForAge,
} from "../time/age-from-birthdate";

describe("ageFromBirthdate", () => {
  const on = new Date(2026, 9, 12); // 12 Oct 2026

  it("counts whole years and waits for the birthday", () => {
    expect(ageFromBirthdate("2005-10-12", on)).toBe(21);
    expect(ageFromBirthdate("2005-10-13", on)).toBe(20);
    expect(ageFromBirthdate("2000-01-01", on)).toBe(26);
  });

  it("rejects junk", () => {
    expect(ageFromBirthdate("not-a-date", on)).toBeNull();
    expect(ageFromBirthdate("2026-02-31", on)).toBeNull();
  });

  it("bounds helpers keep age inside 13–100", () => {
    expect(ageFromBirthdate(latestBirthdateForAge(13, on), on)).toBe(13);
    expect(ageFromBirthdate(earliestBirthdateForAge(100, on), on)).toBe(100);
  });
});
