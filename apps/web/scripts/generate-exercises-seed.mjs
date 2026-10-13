/**
 * Regenerate the exercise catalog seed at backend/seeds/03_ai_plan_exercises.sql.
 *
 *   node apps/web/scripts/generate-exercises-seed.mjs
 *
 * Bundles exercise-seed-entry.ts with esbuild (so it can reuse the app's own
 * equipment rules and the @/ alias), runs it, and replaces the marked block.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, "..");
const SEED = path.resolve(WEB, "../../backend/seeds/03_ai_plan_exercises.sql");
const BEGIN = "-- BEGIN ai_plan_exercises\n";
const END = "-- END ai_plan_exercises";

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
const sql = mod.renderSeedSql().trimEnd();
const block = `${BEGIN}${sql}\n${END}\n`;

const header = `-- AI Plan exercise catalog (equipment + gym-type settings).
-- GENERATED — do not edit by hand.
-- Regenerate: node apps/web/scripts/generate-exercises-seed.mjs
-- Loaded after migrations via config.toml [db.seed] (supabase db reset).

`;

let seed = "";
try {
  seed = await fs.readFile(SEED, "utf8");
} catch {
  seed = header;
}

const start = seed.indexOf(BEGIN);
const end = seed.indexOf(END);
if (start >= 0 && end > start) {
  seed = seed.slice(0, start) + block + seed.slice(end + END.length).replace(/^\n/, "");
} else {
  seed = header + block;
}
await fs.writeFile(SEED, seed);
console.log(`Updated ${path.relative(process.cwd(), SEED)} (${sql.split("\n").length} catalog lines)`);
