import { describe, expect, it } from "vitest";
import { rankCompanions, type ProfileSetupState, type TrainerSummary } from "../index";

const t = (id: string, over: Partial<TrainerSummary>): TrainerSummary => ({
  id, display_name: id, photo_url: null, banner_url: null, tier: "B", activities: ["gym"],
  home_area: "Kaohsiung", price_ntd: 0, is_free: true, rating_avg: 4, rating_count: 1,
  experience_level: null, ...over,
});
const profile = (over: Partial<ProfileSetupState>): ProfileSetupState => ({
  status: "completed", primaryActivity: null, experience: null, city: null, ...over,
});

describe("rankCompanions", () => {
  const list = [t("a", {}), t("b", { activities: ["running"] }), t("c", { activities: ["running"], home_area: "Da'an, Taipei" })];
  it("keeps order with no profile", () => {
    expect(rankCompanions(list, null).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("puts same-activity and same-city first", () => {
    const r = rankCompanions(list, profile({ primaryActivity: "running", city: "Taipei" }));
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("matches a Chinese district address with an English city name", () => {
    const l = [t("a", {}), t("z", { home_area: "台北市信義區" })];
    expect(rankCompanions(l, profile({ city: "Taipei" })).map((x) => x.id)).toEqual(["z", "a"]);
  });
  it("'other' activity does not score", () => {
    expect(rankCompanions(list, profile({ primaryActivity: "other" })).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("prefers a companion at or one level above the user", () => {
    const l = [t("x", { experience_level: "beginner" }), t("y", { experience_level: "advanced" })];
    expect(rankCompanions(l, profile({ experience: "intermediate" })).map((x) => x.id)).toEqual(["y", "x"]);
  });
});
