import { createInstance, type TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";
import zh from "@/locales/zh/common.json";
import { formatReps, formatSeconds } from "../format-duration";

function tFor(lng: "en" | "zh"): TFunction {
  const i18n = createInstance();
  void i18n.init({
    lng,
    initImmediate: false,
    resources: { en: { common: en }, zh: { common: zh } },
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n) as TFunction;
}

describe("formatSeconds", () => {
  const cases: [number, string, string][] = [
    [0, "0 sec", "0 秒"],
    [15, "15 sec", "15 秒"],
    [59, "59 sec", "59 秒"],
    [60, "1 min", "1 分鐘"],
    [90, "1 min 30 sec", "1 分 30 秒"],
    [145, "2 min 25 sec", "2 分 25 秒"],
    [300, "5 min", "5 分鐘"],
  ];

  it.each(cases)("%i s → long form in English and Chinese", (sec, enText, zhText) => {
    expect(formatSeconds(tFor("en"), sec)).toBe(enText);
    expect(formatSeconds(tFor("zh"), sec)).toBe(zhText);
  });

  it("has a compact form for tight spaces such as slider labels", () => {
    expect(formatSeconds(tFor("en"), 45, "short")).toBe("45s");
    expect(formatSeconds(tFor("en"), 120, "short")).toBe("2m");
    expect(formatSeconds(tFor("en"), 170, "short")).toBe("2m 50s");
    expect(formatSeconds(tFor("zh"), 170, "short")).toBe("2 分 50 秒");
  });

  it("switches to minutes exactly at 60 seconds, and copes with odd input", () => {
    expect(formatSeconds(tFor("en"), 59)).toBe("59 sec");
    expect(formatSeconds(tFor("en"), 60)).toBe("1 min");
    expect(formatSeconds(tFor("en"), -5)).toBe("0 sec");
    expect(formatSeconds(tFor("en"), Number.NaN)).toBe("0 sec");
    expect(formatSeconds(tFor("en"), 61.6)).toBe("1 min 2 sec");
  });
});

describe("formatReps", () => {
  it("localizes timed work stored as English text in the plan", () => {
    expect(formatReps(tFor("en"), "45 sec")).toBe("45 sec");
    expect(formatReps(tFor("zh"), "45 sec")).toBe("45 秒");
    expect(formatReps(tFor("zh"), "15-20 min")).toBe("15–20 分鐘");
    expect(formatReps(tFor("en"), "15-20 min")).toBe("15–20 min");
  });

  it("leaves rep counts alone", () => {
    for (const reps of ["8-12", "12-15", "6-10", "10"]) {
      expect(formatReps(tFor("zh"), reps)).toBe(reps);
    }
  });
});
