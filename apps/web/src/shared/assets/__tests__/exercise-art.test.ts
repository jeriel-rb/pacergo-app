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

  it("has the static illustration of every equipment/cardio item on disk", () => {
    const slugs = [...Object.values(EQUIPMENT_ART), ...Object.values(CARDIO_ART), CARDIO_HERO_ART];
    for (const slug of slugs) expect(onDisk(exerciseArtFrame(slug)), slug).toBe(true);
  });

  it("keeps exactly one frame per exercise (static illustrations)", () => {
    const dir = path.join(PUBLIC_DIR, "exercise-art");
    const folders = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(folders.length).toBeGreaterThan(0);
    for (const folder of folders) {
      expect(fs.readdirSync(path.join(dir, folder.name)), folder.name).toEqual(["frame-1.svg"]);
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
