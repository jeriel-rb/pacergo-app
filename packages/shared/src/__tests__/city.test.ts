import { describe, expect, it } from "vitest";
import { cityKey, normalizeCity } from "../matching/city";

describe("normalizeCity", () => {
  it.each([
    "台中", "臺中市", "taichung", "  Taichung   City ", "TAICHUNG", "台中市西屯區", "Xitun, Taichung",
  ])("maps %j to Taichung", (input) => {
    expect(normalizeCity(input)).toBe("Taichung");
  });

  it("keeps New Taipei apart from Taipei", () => {
    expect(normalizeCity("新北市")).toBe("New Taipei");
    expect(normalizeCity("new taipei")).toBe("New Taipei");
    expect(normalizeCity("台北市")).toBe("Taipei");
  });

  it("only tidies unknown places", () => {
    expect(normalizeCity("  yilan   county ")).toBe("Yilan County");
    expect(normalizeCity("")).toBe("");
    expect(normalizeCity(null)).toBe("");
  });
});

describe("cityKey", () => {
  it("finds the city inside a district-level address", () => {
    expect(cityKey("台北市信義區")).toBe("taipei");
    expect(cityKey("Da'an, Taipei")).toBe("taipei");
    expect(cityKey("Somewhere")).toBeNull();
  });
});
