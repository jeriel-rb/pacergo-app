import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXERCISE_ART_ALIAS_TARGETS,
  exerciseArtFrame,
  exerciseArtSlugForDbSlug,
  hasExerciseArt,
} from "../exercise-art";
import {
  CARDIO_ART,
  CARDIO_HERO_ART,
  EQUIPMENT_ART,
} from "@/features/ai-plan/onboarding/equipment-images";

const PUBLIC_DIR = path.resolve(__dirname, "../../../../public");
const onDisk = (url: string) => fs.existsSync(path.join(PUBLIC_DIR, url));

describe("exercise art registry", () => {
  it("only references art that was synced (re-run scripts/sync-exercise-art.mjs)", () => {
    for (const slug of EXERCISE_ART_ALIAS_TARGETS) expect(hasExerciseArt(slug), slug).toBe(true);
  });

  it("has all three frames of every equipment/cardio illustration on disk", () => {
    const slugs = [...Object.values(EQUIPMENT_ART), ...Object.values(CARDIO_ART), CARDIO_HERO_ART];
    for (const slug of slugs) {
      for (const n of [1, 2, 3] as const) expect(onDisk(exerciseArtFrame(slug, n)), `${slug} ${n}`).toBe(true);
    }
  });

  it("resolves seeded slugs directly and via aliases, and misses cleanly", () => {
    expect(exerciseArtSlugForDbSlug("push_up")).toBe("push-up");
    expect(exerciseArtSlugForDbSlug("barbell_bench_press")).toBe("bench-press");
    expect(exerciseArtSlugForDbSlug("stationary_bike")).toBe("cycling");
    for (const slug of ["stationary_bike", "push_up", "barbell_bench_press"]) {
      for (const n of [1, 2, 3] as const) {
        expect(onDisk(exerciseArtFrame(exerciseArtSlugForDbSlug(slug)!, n)), `${slug} ${n}`).toBe(true);
      }
    }
    expect(exerciseArtSlugForDbSlug("barbell_lunge")).toBeNull();
  });

  it("ships the upstream attribution and license alongside the art", () => {
    for (const file of ["ATTRIBUTION.md", "LICENSE-ASSETS", "manifest.json"]) {
      expect(onDisk(`/exercise-art/${file}`), file).toBe(true);
    }
  });
});
