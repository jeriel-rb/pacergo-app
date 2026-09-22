/**
 * Copy every exercise illustration from bryllim/workout-guide
 * (https://github.com/bryllim/workout-guide, art licensed CC BY-SA 4.0,
 * derived from Everkinetic) into the web app.
 *
 * Writes:
 *  - public/exercise-art/<slug>/frame-{1,2,3}.svg  (SVG only, no PNGs)
 *  - public/exercise-art/manifest.json             (full per-frame credit/source/changes)
 *  - public/exercise-art/ATTRIBUTION.md, LICENSE-ASSETS (upstream, verbatim)
 *  - src/shared/assets/exercise-catalog.json       (compact catalog the app bundles:
 *    slug, name, equipment, muscles — no attribution, so the big manifest never
 *    ships in the JS bundle)
 *
 * Credits page: /credits (linked from the Terms of Service and Privacy Policy).
 * Registry: src/shared/assets/exercise-art.ts.
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

const upstreamArg = process.argv[2];
if (!upstreamArg) {
  console.error("Usage: node apps/web/scripts/sync-exercise-art.mjs <path-to-workout-guide-clone>");
  process.exit(1);
}
const PKG = path.resolve(upstreamArg, "packages/workout-guide");

const manifest = JSON.parse(await fs.readFile(path.join(PKG, "manifest.json"), "utf8"));

await fs.rm(OUT_DIR, { recursive: true, force: true });

const full = [];
const catalog = [];
for (const entry of manifest) {
  const svgFrames = entry.frames.filter((f) => f.format === "svg");
  if (svgFrames.length !== 3) throw new Error(`${entry.slug}: expected 3 SVG frames`);
  await fs.mkdir(path.join(OUT_DIR, entry.slug), { recursive: true });
  for (const frame of svgFrames) {
    await fs.copyFile(
      path.join(PKG, frame.path),
      path.join(OUT_DIR, entry.slug, `frame-${frame.index}.svg`),
    );
  }
  full.push({
    slug: entry.slug,
    name: entry.name,
    frames: svgFrames.map((f) => ({
      index: f.index,
      path: `${entry.slug}/frame-${f.index}.svg`,
      attribution: f.attribution,
    })),
  });
  catalog.push({
    slug: entry.slug,
    name: entry.name,
    equipment: entry.equipment,
    primaryMuscle: entry.primaryMuscle,
    secondaryMuscles: entry.secondaryMuscles,
    isStretch: entry.isStretch,
  });
}

await fs.writeFile(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(full, null, 2)}\n`);
await fs.copyFile(path.join(PKG, "ATTRIBUTION.md"), path.join(OUT_DIR, "ATTRIBUTION.md"));
await fs.copyFile(path.join(PKG, "LICENSE-ASSETS"), path.join(OUT_DIR, "LICENSE-ASSETS"));
await fs.writeFile(CATALOG_FILE, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`Copied ${catalog.length} exercises (${catalog.length * 3} frames) → ${OUT_DIR}`);
