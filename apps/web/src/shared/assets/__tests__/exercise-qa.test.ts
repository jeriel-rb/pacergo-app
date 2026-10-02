import { describe, expect, it } from "vitest";
import {
  ADVANCED_SKILL_SLUGS,
  ISOLATION_SLUGS,
  LOW_PRIORITY_ISOLATION_SLUGS,
  QA_EXCLUDED_EXERCISES,
  STRETCH_LIBRARY,
  TIMED_SLUGS,
} from "@pacergo/shared";
import { EXERCISE_CATALOG } from "../exercise-catalog";
import content from "../exercise-content.json";
import { exerciseArtSlugForDbSlug } from "../exercise-art";

const bySlug = new Map(EXERCISE_CATALOG.map((e) => [e.slug, e]));
const text = content as Record<string, { instructionsEn: string[]; instructionsZh: string[] }>;

describe("exercise library QA", () => {
  it("only excludes exercises that exist in the library", () => {
    for (const slug of Object.keys(QA_EXCLUDED_EXERCISES)) expect(bySlug.has(slug), slug).toBe(true);
  });

  it("every slug in the programming lists (skill, timed, isolation) exists in the library", () => {
    const lists = { ADVANCED_SKILL_SLUGS, TIMED_SLUGS, ISOLATION_SLUGS, LOW_PRIORITY_ISOLATION_SLUGS };
    for (const [name, list] of Object.entries(lists)) {
      for (const slug of list) expect(bySlug.has(slug), `${name}: ${slug}`).toBe(true);
    }
  });

  it("has instructions in both languages for every exercise, with matching step counts", () => {
    for (const e of EXERCISE_CATALOG) {
      const c = text[e.slug];
      expect(c?.instructionsEn.length, `${e.slug} en`).toBeGreaterThanOrEqual(3);
      expect(c?.instructionsZh.length, `${e.slug} zh`).toBe(c?.instructionsEn.length);
    }
  });

  it("every exercise has an illustration", () => {
    for (const e of EXERCISE_CATALOG) expect(exerciseArtSlugForDbSlug(e.slug), e.slug).toBe(e.slug);
  });

  describe("the cooldown stretch library", () => {
    it("only contains real stretches / mobility drills that exist, and passed QA", () => {
      for (const s of STRETCH_LIBRARY) {
        const entry = bySlug.get(s.slug);
        expect(entry, s.slug).toBeDefined();
        expect(entry!.isStretch, `${s.slug} is a stretch`).toBe(true);
        expect(QA_EXCLUDED_EXERCISES[s.slug], `${s.slug} failed QA`).toBeUndefined();
        expect(text[s.slug]?.instructionsEn.length, `${s.slug} instructions`).toBeGreaterThan(0);
      }
    });

    it("never includes strength, activation or core exercises (e.g. plank, glute bridge)", () => {
      const slugs = STRETCH_LIBRARY.map((s) => s.slug);
      for (const banned of ["plank", "glute-bridge", "side-plank", "dead-bug", "bird-dog"]) {
        expect(slugs).not.toContain(banned);
      }
    });
  });

  it("the hamstring stretch instructions match its illustration (heel on a raised support)", () => {
    expect(text["hamstring-stretch"]!.instructionsEn.join(" ")).toMatch(/step|bench|rail/i);
  });
});
