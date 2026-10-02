import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "@/shared/assets/exercise-catalog";
import zhNames from "@/shared/assets/exercise-names.zh.json";
import en from "@/locales/en/plan.json";
import zh from "@/locales/zh/plan.json";
import { libraryKey } from "../library-filter";

const ART_DIR = path.resolve(__dirname, "../../../../../public/exercise-art");

describe("exercise library content", () => {
  it("uses all 302 workout-guide exercises", () => {
    expect(EXERCISE_CATALOG).toHaveLength(302);
  });

  it("has its static illustration on disk for every exercise", () => {
    for (const e of EXERCISE_CATALOG) {
      expect(fs.existsSync(path.join(ART_DIR, e.slug, "frame-1.svg")), e.slug).toBe(true);
    }
  });

  it("has a Traditional Chinese name for every exercise, and no strays", () => {
    const names = zhNames as Record<string, string>;
    for (const e of EXERCISE_CATALOG) expect(names[e.slug], e.slug).toBeTruthy();
    const slugs = new Set(EXERCISE_CATALOG.map((e) => e.slug));
    for (const key of Object.keys(names)) expect(slugs.has(key), key).toBe(true);
  });

  it("has an en + zh label for every equipment and muscle value", () => {
    const values = {
      equipment: new Set(EXERCISE_CATALOG.map((e) => e.equipment)),
      muscle: new Set(EXERCISE_CATALOG.flatMap((e) => [e.primaryMuscle, ...e.secondaryMuscles])),
    };
    for (const locale of [en, zh]) {
      for (const kind of ["equipment", "muscle"] as const) {
        const labels = locale.library[kind] as Record<string, string>;
        for (const v of values[kind]) expect(labels[libraryKey(v)], `${kind}:${v}`).toBeTruthy();
      }
    }
  });

  it("labels every muscle group used by the seeded plan exercises", () => {
    const seed = fs.readFileSync(
      path.resolve(__dirname, "../../../../../../../backend/seeds/03_ai_plan_exercises.sql"),
      "utf8",
    );
    const keys = new Set<string>();
    for (const line of seed.split("\n").filter((l) => l.startsWith("('"))) {
      // The first array in each row is muscle_groups.
      const start = line.indexOf("array[");
      const list = line.slice(start, line.indexOf("]", start));
      for (const m of list.matchAll(/'([a-z_]+)'/g)) keys.add(m[1]!);
    }
    expect(keys.size).toBeGreaterThan(15);
    for (const locale of [en, zh]) {
      const labels = locale.library.muscle as Record<string, string>;
      for (const key of keys) expect(labels[key], key).toBeTruthy();
    }
  });

  it("seeds one row per catalog exercise, keyed by catalog slug, with the carried-over content", () => {
    const seed = fs.readFileSync(
      path.resolve(__dirname, "../../../../../../../backend/seeds/03_ai_plan_exercises.sql"),
      "utf8",
    );
    const rows = seed.split("\n").filter((l) => l.startsWith("('"));
    expect(rows).toHaveLength(EXERCISE_CATALOG.length);
    const slugs = rows.map((l) => /^\('([a-z-]+)'/.exec(l)![1]);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual(EXERCISE_CATALOG.map((e) => e.slug).sort());
    expect(seed).toContain("delete from exercises where slug <> all");
  });

  it("ships the upstream attribution and license with the art", () => {
    for (const f of ["ATTRIBUTION.md", "LICENSE-ASSETS", "manifest.json"]) {
      expect(fs.existsSync(path.join(ART_DIR, f)), f).toBe(true);
    }
  });
});
