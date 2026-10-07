/**
 * Regenerate the exercise catalog inside backend/migrations/0001_init.sql.
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
const INIT = path.resolve(WEB, "../../backend/migrations/0001_init.sql");
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
let init = await fs.readFile(INIT, "utf8");
const start = init.indexOf(BEGIN);
const end = init.indexOf(END);
if (start >= 0 && end > start) {
  init = init.slice(0, start) + block + init.slice(end + END.length).replace(/^\n/, "");
} else {
  if (!init.endsWith("\n")) init += "\n";
  init += `\n-- AI plan exercise catalog. Regenerated in place by generate-exercises-seed.mjs.\n${block}`;
}
await fs.writeFile(INIT, init);
console.log(`Updated ${path.relative(process.cwd(), INIT)} (${sql.split("\n").length} catalog lines)`);
