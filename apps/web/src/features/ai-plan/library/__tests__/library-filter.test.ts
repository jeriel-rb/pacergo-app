import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "@/shared/assets/exercise-catalog";
import {
  LIBRARY_FILTERS_DEFAULT,
  activeFilterCount,
  distinctValues,
  filterExercises,
  libraryKey,
} from "../library-filter";

const opts = {
  nameOf: (e: { name: string }) => e.name,
  labelOf: (_kind: "equipment" | "muscle", value: string) => value,
  locale: "en",
};
const run = (patch: Partial<typeof LIBRARY_FILTERS_DEFAULT> = {}) =>
  filterExercises(EXERCISE_CATALOG, { ...LIBRARY_FILTERS_DEFAULT, ...patch }, opts);

describe("exercise library filtering", () => {
  it("returns the whole catalog by default, sorted A–Z", () => {
    const all = run();
    expect(all).toHaveLength(EXERCISE_CATALOG.length);
    const names = all.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("searches names case-insensitively", () => {
    const hits = run({ query: "  BENCH press " });
    expect(hits.length).toBeGreaterThan(2);
    expect(hits.every((e) => e.name.toLowerCase().includes("bench press"))).toBe(true);
  });

  it("searches the English name even when the display name is Chinese", () => {
    const hits = filterExercises(
      EXERCISE_CATALOG,
      { ...LIBRARY_FILTERS_DEFAULT, query: "deadlift" },
      { ...opts, nameOf: () => "中文", locale: "zh" },
    );
    expect(hits.length).toBeGreaterThan(5);
  });

  it("filters by equipment, muscle and exercise/stretch kind", () => {
    expect(run({ equipment: "Kettlebell" }).every((e) => e.equipment === "Kettlebell")).toBe(true);
    expect(run({ muscle: "Chest" }).every((e) => e.primaryMuscle === "Chest")).toBe(true);
    const stretches = run({ kind: "stretches" });
    const exercises = run({ kind: "exercises" });
    expect(stretches.every((e) => e.isStretch)).toBe(true);
    expect(stretches.length + exercises.length).toBe(EXERCISE_CATALOG.length);
  });

  it("filters to the exercises a gym type can do", () => {
    const gymSlugs = new Set(EXERCISE_CATALOG.slice(0, 10).map((e) => e.slug));
    const hits = filterExercises(EXERCISE_CATALOG, { ...LIBRARY_FILTERS_DEFAULT, gym: "small_gym" }, { ...opts, gymSlugs });
    expect(hits.map((e) => e.slug).sort()).toEqual([...gymSlugs].sort());
    // No gym filter → the set is ignored.
    expect(filterExercises(EXERCISE_CATALOG, LIBRARY_FILTERS_DEFAULT, { ...opts, gymSlugs })).toHaveLength(
      EXERCISE_CATALOG.length,
    );
  });

  it("combines filters and reports an empty result cleanly", () => {
    const both = run({ equipment: "Barbell", muscle: "Chest" });
    expect(both.length).toBeGreaterThan(0);
    expect(run({ equipment: "Barbell", query: "zzzz" })).toEqual([]);
  });

  it("sorts by muscle group, then name", () => {
    const sorted = run({ sort: "muscle" });
    const muscles = sorted.map((e) => e.primaryMuscle);
    expect(muscles).toEqual([...muscles].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("counts non-default filters and builds i18n-safe keys", () => {
    expect(activeFilterCount(LIBRARY_FILTERS_DEFAULT)).toBe(0);
    expect(activeFilterCount({ ...LIBRARY_FILTERS_DEFAULT, equipment: "Barbell", sort: "muscle" })).toBe(2);
    expect(activeFilterCount({ ...LIBRARY_FILTERS_DEFAULT, gym: "garage_gym" })).toBe(1);
    expect(libraryKey("Pull-up Bar")).toBe("pull_up_bar");
    expect(libraryKey("Rear Delts")).toBe("rear_delts");
  });

  it("lists filter values most common first", () => {
    const eq = distinctValues(EXERCISE_CATALOG, (e) => e.equipment);
    expect(eq[0]).toBe("Bodyweight");
    expect(new Set(eq).size).toBe(eq.length);
  });
});
