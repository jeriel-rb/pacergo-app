import { describe, it, expect } from "vitest";
import type { TrainerSummary } from "@pacergo/shared";
import { excludeSelf, filterTrainers } from "../filter-trainers";

const make = (id: string, activities: TrainerSummary["activities"]): TrainerSummary => ({
  id,
  display_name: id,
  photo_url: null,
  banner_url: null,
  tier: "C",
  activities,
  home_area: "台北市",
  price_ntd: 650,
  is_free: false,
  rating_avg: 4.5,
  rating_count: 10,
  experience_level: "beginner",
});

const list: TrainerSummary[] = [
  make("a", ["gym"]),
  make("b", ["running", "hiking"]),
  make("c", ["gym", "running"]),
];

describe("filterTrainers", () => {
  it("returns the full list for 'all'", () => {
    expect(filterTrainers(list, "all")).toHaveLength(3);
  });

  it("filters by a single activity", () => {
    const running = filterTrainers(list, "running");
    expect(running.map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("returns an empty list when no trainer matches", () => {
    expect(filterTrainers(list, "yoga")).toHaveLength(0);
  });
});

describe("excludeSelf", () => {
  it("removes the signed-in trainer and leaves everyone else", () => {
    expect(excludeSelf(list, "b").map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("keeps the full list when nobody is signed in", () => {
    expect(excludeSelf(list, null)).toHaveLength(3);
  });
});
