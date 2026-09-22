/**
 * Regenerate backend/seeds/03_ai_plan_exercises.sql from the exercise catalog.
 *
 *   node apps/web/scripts/generate-exercises-seed.mjs
 *
 * Bundles exercise-seed-entry.ts with esbuild (so it can reuse the app's own
 * equipment rules and the @/ alias), runs it, and writes the SQL.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, "..");
const OUT = path.resolve(WEB, "../../backend/seeds/03_ai_plan_exercises.sql");

const result = await build({
  entryPoints: [path.join(HERE, "exercise-seed-entry.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  alias: { "@": path.join(WEB, "src") },
  logLevel: "error",
});

const code = result.outputFiles[0].text;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const sql = mod.renderSeedSql();

await fs.writeFile(OUT, sql);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${sql.split("\n").length} lines)`);
