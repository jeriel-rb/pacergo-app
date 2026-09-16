import { describe, it, expect } from "vitest";
import {
  getCurrentLocale,
  getLocalizedHref,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";

describe("locale-path", () => {
  it("treats unprefixed paths as the default locale (zh)", () => {
    expect(getCurrentLocale("/trainers")).toBe("zh");
  });

  it("detects an explicit en prefix", () => {
    expect(getCurrentLocale("/en/trainers")).toBe("en");
  });

  it("does not strip a non-locale leading segment", () => {
    expect(pathWithoutLeadingLocale("/trainers")).toBe("/trainers");
  });

  it("strips a real locale prefix", () => {
    expect(pathWithoutLeadingLocale("/en/trainers")).toBe("/trainers");
  });

  it("localizes to a prefixed path for en", () => {
    expect(getLocalizedPath("/trainers", "en")).toBe("/en/trainers");
  });

  it("localizes to an unprefixed path for the default locale", () => {
    expect(getLocalizedPath("/trainers", "zh")).toBe("/trainers");
  });

  it("handles the root path in both directions", () => {
    expect(getLocalizedPath("/", "en")).toBe("/en");
    expect(getLocalizedPath("/en", "zh")).toBe("/");
  });

  it("localizes hrefs with hash fragments", () => {
    expect(getLocalizedHref("/#how-it-works", "en")).toBe("/en#how-it-works");
    expect(getLocalizedHref("/#how-it-works", "zh")).toBe("/#how-it-works");
    expect(getLocalizedHref("/legal/terms", "en")).toBe("/en/legal/terms");
  });
});
