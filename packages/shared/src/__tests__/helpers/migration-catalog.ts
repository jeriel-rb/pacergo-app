import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExerciseRecord } from "../../plan/generated-plan-types";

/**
 * The real exercise catalog for tests, read straight from the generated seed
 * in backend/seeds/03_ai_plan_exercises.sql (the same rows that load into the
 * live `exercises` table on db reset). There is no copy to keep in sync:
 * regenerate the seed and every test sees the change.
 *
 * Only what the generator reads is parsed — slug, names, muscle tags,
 * equipment and gym types, and whether instructions exist. Every exercise
 * counts as illustrated (the art check lives in the web app).
 */
const SEED = fileURLToPath(new URL("../../../../../backend/seeds/03_ai_plan_exercises.sql", import.meta.url));

const STR = "'((?:[^']|'')*)'";
const ARR = "(array\\[[^\\]]*\\]|array\\[\\]::text\\[\\])";
const ROW = new RegExp(`^\\(${STR}, ${STR}, ${STR}, ${ARR}, ${ARR}, ${ARR}, (array\\[\\]::text\\[\\]|array\\[)`);

const unquote = (s: string) => s.replace(/''/g, "'");
const items = (arr: string) => [...arr.matchAll(/'((?:[^']|'')*)'/g)].map((m) => unquote(m[1]!));

let cached: ExerciseRecord[] | null = null;

export function loadMigrationCatalog(): ExerciseRecord[] {
  if (cached) return cached;
  const sql = readFileSync(SEED, "utf8");
  const start = sql.indexOf("-- BEGIN ai_plan_exercises");
  const end = sql.indexOf("-- END ai_plan_exercises");
  if (start < 0 || end < start) throw new Error("ai_plan_exercises block not found in 03_ai_plan_exercises.sql");
  const lines = sql.slice(start, end).split("\n").filter((l) => l.startsWith("('"));
  const rows = lines.map((line) => {
    const m = ROW.exec(line);
    if (!m) throw new Error(`Could not parse catalog row: ${line.slice(0, 80)}`);
    return {
      slug: unquote(m[1]!),
      nameEn: unquote(m[2]!),
      nameZh: unquote(m[3]!),
      muscleGroups: items(m[4]!),
      equipment: items(m[5]!),
      equipmentSettings: items(m[6]!),
      hasInstructions: m[7] === "array[",
      hasIllustration: true,
    } satisfies ExerciseRecord;
  });
  cached = rows;
  return rows;
}
