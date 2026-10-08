import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXERCISE_ART_ALIAS_TARGETS,
  exerciseArtFrame,
  exerciseArtFrameCount,
  exerciseArtSlugForDbSlug,
  hasExerciseArt,
} from "../exercise-art";
import {
  CARDIO_ART,
  CARDIO_HERO_ART,
  EQUIPMENT_ART,
} from "@/features/ai-plan/onboarding/equipment-images";
import { EXERCISE_CATALOG } from "../exercise-catalog";
import FRAME_COUNTS from "../exercise-art-frames.json";

const PUBLIC_DIR = path.resolve(__dirname, "../../../../public");
const onDisk = (url: string) => fs.existsSync(path.join(PUBLIC_DIR, url));

describe("exercise art registry", () => {
  it("only references art that was synced (re-run scripts/sync-exercise-art.mjs)", () => {
    for (const slug of EXERCISE_ART_ALIAS_TARGETS) expect(hasExerciseArt(slug), slug).toBe(true);
  });

  it("has the first-frame illustration of every equipment/cardio item on disk", () => {
    const slugs = [...Object.values(EQUIPMENT_ART), ...Object.values(CARDIO_ART), CARDIO_HERO_ART];
    for (const slug of slugs) expect(onDisk(exerciseArtFrame(slug)), slug).toBe(true);
  });

  it("keeps every catalog slug's synced frames on disk and nowhere else", () => {
    const dir = path.join(PUBLIC_DIR, "exercise-art");
    const folders = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const catalogSlugs = new Set(EXERCISE_CATALOG.map((e) => e.slug));
    expect(folders.length).toBe(EXERCISE_CATALOG.length);
    for (const folder of folders) {
      expect(catalogSlugs.has(folder.name), folder.name).toBe(true);
      const count = exerciseArtFrameCount(folder.name);
      expect(count, folder.name).toBeGreaterThanOrEqual(1);
      expect(FRAME_COUNTS[folder.name as keyof typeof FRAME_COUNTS], folder.name).toBe(count);
      const files = fs.readdirSync(path.join(dir, folder.name)).sort();
      expect(files).toEqual(
        Array.from({ length: count }, (_, i) => `frame-${i + 1}.svg`),
      );
    }
  });

  it("resolves seeded slugs directly and via aliases, and misses cleanly", () => {
    expect(exerciseArtSlugForDbSlug("push_up")).toBe("push-up");
    expect(exerciseArtSlugForDbSlug("barbell_bench_press")).toBe("bench-press");
    expect(exerciseArtSlugForDbSlug("stationary_bike")).toBe("cycling");
    for (const slug of ["stationary_bike", "push_up", "barbell_bench_press"]) {
      expect(onDisk(exerciseArtFrame(exerciseArtSlugForDbSlug(slug)!)), slug).toBe(true);
    }
    expect(exerciseArtSlugForDbSlug("barbell_lunge")).toBeNull();
  });

  it("ships the upstream attribution and license alongside the art", () => {
    for (const file of ["ATTRIBUTION.md", "LICENSE-ASSETS", "manifest.json"]) {
      expect(onDisk(`/exercise-art/${file}`), file).toBe(true);
    }
  });
});
