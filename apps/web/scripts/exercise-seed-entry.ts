/**
 * Builds the exercise catalog block inside backend/migrations/0001_init.sql
 * (see generate-exercises-seed.mjs, which bundles and runs this).
 *
 * One `exercises` row per catalog exercise:
 *  - identity   ← exercise-catalog.json (name, muscles, equipment) + zh name
 *  - rules      ← computed: which onboarding equipment unlocks it, which gym
 *                 types can do it, which muscle groups the plan should count
 *  - content    ← exercise-content.json (hand-written steps/tips; may be empty)
 */
import { EQUIPMENT_PRESETS, ONBOARDING_GYM_TYPES } from "@pacergo/shared";
import { EXERCISE_CATALOG } from "@/shared/assets/exercise-catalog";
import content from "@/shared/assets/exercise-content.json";
import zhNames from "@/shared/assets/exercise-names.zh.json";
import { availableExercises, providersOf } from "@/features/ai-plan/onboarding/equipment-exercises";

/** Catalog muscle → the plan generator's muscle vocabulary (FOCUS_MUSCLES). */
const MUSCLE_MAP: Record<string, string[]> = {
  Chest: ["chest"],
  Shoulders: ["shoulders"],
  "Rear Delts": ["rear_delts"],
  "Upper Back": ["upper_back"],
  "Posterior Chain": ["hamstrings", "glutes", "lower_back"],
  Hamstrings: ["hamstrings"],
  Back: ["back"],
  Lats: ["lats"],
  Biceps: ["biceps"],
  Quads: ["quads"],
  Glutes: ["glutes"],
  Calves: ["calves"],
  Forearms: ["forearms"],
  Triceps: ["triceps"],
  Core: ["core"],
  Legs: ["quads", "glutes"],
  "Lower Back": ["lower_back"],
  Adductors: ["inner_thighs"],
  Mobility: ["mobility"],
  Hips: ["hips"],
  Grip: ["forearms"],
  Cardio: ["cardio"],
  Groin: ["inner_thighs"],
};

const names = zhNames as Record<string, string>;
const texts = content as Record<
  string,
  { instructionsEn: string[]; instructionsZh: string[]; tipsEn: string[]; tipsZh: string[] }
>;

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (items: readonly string[]) =>
  items.length === 0 ? "array[]::text[]" : `array[${items.map(lit).join(", ")}]`;

/** The catalog has one "Chest" and one "Core". The plan's muscle options are
 *  finer (upper / middle / lower chest; abs / obliques / lower abs), so the
 *  main muscle is refined from the exercise name. */
function refineMainMuscle(slug: string, token: string): string {
  if (token === "chest") {
    if (/incline|upper/.test(slug) && !/decline/.test(slug)) return "upper_chest";
    if (/decline|dip/.test(slug)) return "lower_chest";
  }
  if (token === "core") {
    if (/russian|woodchop|side-|oblique|twist|pallof|copenhagen|windmill|heel-tap|bicycle/.test(slug)) return "obliques";
    if (/leg-raise|reverse-crunch|knee-raise|knee-tuck|v-up|flutter|toe-touch|hollow|dragon/.test(slug)) return "lower_abs";
    return "abs";
  }
  return token;
}

/** Conditioning / plyometric moves the catalog files under "Bodyweight". They're
 *  warm-up or finisher work, not main lifts, so they're tagged like cardio. */
const CONDITIONING = new Set([
  "burpee",
  "half-burpee",
  "squat-thrust",
  "high-knees",
  "jumping-jack",
  "skater-hop",
  "lateral-shuffle",
  "sprawl",
  "mountain-climber",
  "plank-jack",
  "bear-crawl",
  "crab-walk",
  "inchworm",
]);

/** Cardio, conditioning and stretches are never picked as main lifts, so they
 *  carry only their own tag — the generator's push/pull/legs pools then can't
 *  select them. */
function muscleGroupsFor(e: (typeof EXERCISE_CATALOG)[number]): string[] {
  if (e.equipment === "Cardio" || CONDITIONING.has(e.slug)) return ["cardio"];
  if (e.isStretch) return ["mobility"];
  const out: string[] = [];
  for (const m of [e.primaryMuscle, ...e.secondaryMuscles]) {
    for (const g of MUSCLE_MAP[m] ?? []) if (!out.includes(g)) out.push(g);
  }
  // Refine the main (first) muscle, keeping the broad one as a second tag for
  // core so "core" still identifies the family.
  if (out[0]) {
    const refined = refineMainMuscle(e.slug, out[0]);
    if (refined !== out[0]) {
      const broad = out[0];
      out[0] = refined;
      if (broad === "core" && !out.includes("core")) out.splice(1, 0, "core");
    }
  }
  return out;
}

export function renderSeedSql(): string {
  const gymAvailability = Object.fromEntries(
    ONBOARDING_GYM_TYPES.map((g) => [
      g,
      new Set(availableExercises(EQUIPMENT_PRESETS[g], g).map((e) => e.slug)),
    ]),
  );

  const rows = EXERCISE_CATALOG.map((e) => {
    const p = providersOf(e);
    const text = texts[e.slug];
    const gyms = ONBOARDING_GYM_TYPES.filter((g) => gymAvailability[g]!.has(e.slug));
    return `(${[
      lit(e.slug),
      lit(e.name),
      lit(names[e.slug] ?? e.name),
      arr(muscleGroupsFor(e)),
      arr([...p.equipment, ...p.cardio]),
      arr(gyms),
      arr(text?.instructionsEn ?? []),
      arr(text?.instructionsZh ?? []),
      arr(text?.tipsEn ?? []),
      arr(text?.tipsZh ?? []),
    ].join(", ")})`;
  });

  const slugs = EXERCISE_CATALOG.map((e) => lit(e.slug)).join(", ");
  const withContent = EXERCISE_CATALOG.filter((e) => texts[e.slug]).length;

  return `-- AI Plan exercise library — GENERATED, do not edit by hand.
-- Regenerate with:  node apps/web/scripts/generate-exercises-seed.mjs
-- This block is the catalog load. It lives at the end of 0001_init.sql.
--
-- One row per illustrated exercise (${EXERCISE_CATALOG.length}), keyed by the catalog slug (kebab-case),
-- built from:
--   apps/web/src/shared/assets/exercise-catalog.json   name, equipment, muscles
--   apps/web/src/shared/assets/exercise-names.zh.json  Traditional Chinese names
--   apps/web/src/shared/assets/exercise-content.json   steps + tips (${withContent} of ${EXERCISE_CATALOG.length} written so far)
-- and the equipment rules in features/ai-plan/onboarding/equipment-exercises.ts.
--
-- Columns:
--   muscle_groups       the plan generator's muscle vocabulary (push/pull/legs pools)
--   equipment           onboarding equipment / cardio ids — ANY ONE unlocks the
--                       exercise; empty = needs no equipment
--   equipment_settings  gym types (large/small/garage/bodyweight) that can do it
--
-- Idempotent and replacing: it upserts every catalog row and DELETES any other
-- row (the old snake_case list), so running it on a live database swaps the old
-- exercise list for this one. Saved plans keep working — they store their own
-- copy of each exercise's name, and old slugs are resolved by the app.

insert into exercises
  (slug, name_en, name_zh, muscle_groups, equipment, equipment_settings,
   instructions_en, instructions_zh, tips_en, tips_zh)
values
${rows.join(",\n")}
on conflict (slug) do update set
  name_en            = excluded.name_en,
  name_zh            = excluded.name_zh,
  muscle_groups      = excluded.muscle_groups,
  equipment          = excluded.equipment,
  equipment_settings = excluded.equipment_settings,
  instructions_en    = excluded.instructions_en,
  instructions_zh    = excluded.instructions_zh,
  tips_en            = excluded.tips_en,
  tips_zh            = excluded.tips_zh;

delete from exercises where slug <> all (array[${slugs}]);
`;
}
