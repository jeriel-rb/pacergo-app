/**
 * Copy exercise illustrations from bryllim/workout-guide
 * (https://github.com/bryllim/workout-guide, art licensed CC BY-SA 4.0,
 * derived from Everkinetic) into the web app.
 *
 * Only exercises already in `exercise-catalog.json` are synced — upstream
 * additions are ignored so intentionally removed catalog entries stay gone.
 *
 * Writes:
 *  - public/exercise-art/<slug>/frame-N.svg       (all SVG frames)
 *  - public/exercise-art/manifest.json             (per-frame credit)
 *  - public/exercise-art/ATTRIBUTION.md, LICENSE-ASSETS
 *  - src/shared/assets/exercise-art-frames.json    (slug → frame count)
 *  - refreshes equipment/muscle fields on the existing catalog rows from
 *    upstream when the slug still exists there (does not append new slugs)
 *
 * Usage:
 *   git clone --depth 1 https://github.com/bryllim/workout-guide.git <dir>
 *   node apps/web/scripts/sync-exercise-art.mjs <dir>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(SCRIPT_DIR, "../public/exercise-art");
const CATALOG_FILE = path.resolve(SCRIPT_DIR, "../src/shared/assets/exercise-catalog.json");
const FRAMES_FILE = path.resolve(SCRIPT_DIR, "../src/shared/assets/exercise-art-frames.json");

const upstreamArg = process.argv[2];
if (!upstreamArg) {
  console.error("Usage: node apps/web/scripts/sync-exercise-art.mjs <path-to-workout-guide-clone>");
  process.exit(1);
}
const PKG = path.resolve(upstreamArg, "packages/workout-guide");

const manifest = JSON.parse(await fs.readFile(path.join(PKG, "manifest.json"), "utf8"));
const catalog = JSON.parse(await fs.readFile(CATALOG_FILE, "utf8"));
const allowed = new Set(catalog.map((e) => e.slug));
const bySlug = new Map(manifest.map((e) => [e.slug, e]));

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

const full = [];
const frameCounts = {};
let missingUpstream = 0;

for (const row of catalog) {
  const entry = bySlug.get(row.slug);
  if (!entry) {
    missingUpstream += 1;
    // Keep a placeholder so hasExerciseArt stays true only when we actually
    // copied art — catalog rows without upstream art lose their folder.
    continue;
  }
  const svgFrames = entry.frames
    .filter((f) => f.format === "svg")
    .sort((a, b) => a.index - b.index);
  if (svgFrames.length === 0) throw new Error(`${entry.slug}: no SVG frames`);

  await fs.mkdir(path.join(OUT_DIR, entry.slug), { recursive: true });
  for (const frame of svgFrames) {
    await fs.copyFile(
      path.join(PKG, frame.path),
      path.join(OUT_DIR, entry.slug, `frame-${frame.index}.svg`),
    );
  }
  frameCounts[entry.slug] = svgFrames.length;
  full.push({
    slug: entry.slug,
    name: entry.name,
    frames: svgFrames.map((f) => ({
      index: f.index,
      path: `${entry.slug}/frame-${f.index}.svg`,
      attribution: f.attribution,
    })),
  });
  // Refresh metadata for existing rows only — never grow the catalog.
  row.name = entry.name;
  row.equipment = entry.equipment;
  row.primaryMuscle = entry.primaryMuscle;
  row.secondaryMuscles = entry.secondaryMuscles;
  row.isStretch = entry.isStretch;
}

if (!allowed.size) throw new Error("exercise-catalog.json is empty");

await fs.writeFile(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(full, null, 2)}\n`);
await fs.copyFile(path.join(PKG, "ATTRIBUTION.md"), path.join(OUT_DIR, "ATTRIBUTION.md"));
await fs.copyFile(path.join(PKG, "LICENSE-ASSETS"), path.join(OUT_DIR, "LICENSE-ASSETS"));
await fs.writeFile(CATALOG_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
await fs.writeFile(FRAMES_FILE, `${JSON.stringify(frameCounts, null, 2)}\n`);

const multi = Object.values(frameCounts).filter((n) => n > 1).length;
console.log(
  `Synced ${full.length}/${catalog.length} catalog exercises (${multi} with multiple frames; ${missingUpstream} missing upstream) → ${OUT_DIR}`,
);
