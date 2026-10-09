import type { ExerciseRecord, GeneratedExercise } from "./generated-plan-types";

/** The cooldown stretch library: which muscles each (QA-passed, illustrated)
 *  stretch works. The exercise table tags every stretch just "mobility", so
 *  this mapping lives here. Only real stretches/mobility drills belong in it —
 *  never strength, activation or core work, however light (no plank, no glute
 *  bridge). */
export interface StretchDef {
  slug: string;
  /** Body region. A cooldown takes at most one stretch per region, so it
   *  covers different areas (not two hamstring stretches). */
  region: string;
  /** Muscle tokens (the exercise table's vocabulary) this stretch releases. */
  targets: readonly string[];
  /** Hold time per side/round, seconds. */
  holdSec: number;
  /** Done once on each side. */
  perSide: boolean;
  /** Slow repetitions instead of a hold (mobility drills such as cat-cow). */
  reps?: string;
  /** A dynamic mobility drill rather than a static recovery stretch: used
   *  where it fits (e.g. spine mobility after back work) but ranked below true
   *  stretches, so a legs day gets hamstring/hip/calf stretches first. */
  mobility?: boolean;
}

export const STRETCH_LIBRARY: readonly StretchDef[] = [
  { slug: "doorway-chest-stretch", region: "chest", targets: ["chest", "upper_chest", "lower_chest", "shoulders", "middle_delts", "biceps"], holdSec: 30, perSide: false },
  { slug: "childs-pose", region: "back", targets: ["lats", "back", "upper_back", "traps", "lower_back", "shoulders", "middle_delts"], holdSec: 40, perSide: false },
  { slug: "cross-body-shoulder-stretch", region: "shoulder", targets: ["rear_delts", "shoulders", "middle_delts", "upper_back", "traps"], holdSec: 30, perSide: true },
  { slug: "kneeling-hip-flexor-stretch", region: "hip_flexor", targets: ["quads", "glutes", "abductors", "abs", "core"], holdSec: 30, perSide: true },
  { slug: "hamstring-stretch", region: "hamstring", targets: ["hamstrings", "glutes", "abductors", "calves", "lower_back"], holdSec: 30, perSide: true },
  { slug: "seated-forward-fold-stretch", region: "hamstring", targets: ["hamstrings", "lower_back", "back", "calves"], holdSec: 40, perSide: false },
  { slug: "standing-quad-stretch", region: "quad", targets: ["quads"], holdSec: 30, perSide: true },
  { slug: "wall-calf-stretch", region: "calf", targets: ["calves"], holdSec: 30, perSide: true },
  { slug: "butterfly-stretch", region: "inner_hip", targets: ["inner_thighs", "glutes", "abductors"], holdSec: 40, perSide: false },
  { slug: "cat-cow-stretch", region: "spine", targets: ["lower_back", "back", "upper_back", "traps", "core", "abs", "obliques"], holdSec: 0, perSide: false, reps: "8-10", mobility: true },
  { slug: "worlds-greatest-stretch", region: "full_body", targets: ["upper_back", "traps", "glutes", "abductors", "hamstrings", "quads", "chest", "obliques"], holdSec: 0, perSide: true, reps: "5", mobility: true },
];

/** Used to top up when a session's muscles match fewer stretches than needed:
 *  broad, safe recovery stretches. */
const GENERAL_STRETCHES = ["childs-pose", "seated-forward-fold-stretch", "worlds-greatest-stretch"] as const;

/** Muscle tokens that stand for several others. */
const EXPANSION: Record<string, readonly string[]> = {
  back: ["lats", "upper_back", "lower_back"],
};

/** The primary muscle (first listed) counts double; secondary muscles once. */
function trainedWeights(main: readonly Pick<ExerciseRecord, "muscleGroups">[]): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (token: string, w: number) => weights.set(token, (weights.get(token) ?? 0) + w);
  for (const e of main) {
    e.muscleGroups.forEach((m, i) => {
      if (m === "cardio") return;
      const w = i === 0 ? 2 : 1;
      add(m, w);
      for (const part of EXPANSION[m] ?? []) add(part, w * 0.5);
    });
  }
  return weights;
}

/**
 * Picks the recovery stretches for one workout: `muscles trained → relevant
 * stretch library → personalised cooldown`. Greedy by coverage — each pick
 * takes the stretch that releases the most still-uncovered trained muscle, then
 * discounts those muscles so the next pick covers something else (a chest day
 * doesn't get four chest stretches). Deterministic, and different workouts get
 * different cooldowns. Never adds an exercise outside `STRETCH_LIBRARY`.
 *
 * `available` is the stretch records that passed QA and that the user can do
 * (e.g. the doorway stretch needs a doorway); unavailable ones are skipped.
 */
export function selectCooldown(input: {
  main: readonly Pick<ExerciseRecord, "muscleGroups">[];
  available: readonly ExerciseRecord[];
  count: number;
}): { def: StretchDef; record: ExerciseRecord }[] {
  const bySlug = new Map(input.available.map((e) => [e.slug, e]));
  const library = STRETCH_LIBRARY.filter((s) => bySlug.has(s.slug));
  const weights = trainedWeights(input.main);
  const picked: StretchDef[] = [];

  const scoreOf = (s: StretchDef) =>
    s.targets.reduce((sum, t) => sum + (weights.get(t) ?? 0), 0) * (s.mobility ? 0.3 : 1);

  while (picked.length < input.count) {
    let best: StretchDef | null = null;
    let bestScore = 0;
    for (const s of library) {
      if (picked.includes(s) || picked.some((p) => p.region === s.region)) continue;
      const score = scoreOf(s);
      if (score > bestScore) {
        best = s;
        bestScore = score;
      }
    }
    if (!best) break;
    picked.push(best);
    for (const t of best.targets) if (weights.has(t)) weights.set(t, weights.get(t)! * 0.35);
  }

  // Not enough muscle-specific matches (e.g. only triceps/biceps trained): top
  // up with general recovery stretches.
  for (const slug of GENERAL_STRETCHES) {
    if (picked.length >= input.count) break;
    const def = library.find((s) => s.slug === slug);
    if (def && !picked.includes(def)) picked.push(def);
  }

  return picked.map((def) => ({ def, record: bySlug.get(def.slug)! }));
}

/** A selected stretch as a plan entry: name, duration/reps, side, short cue. */
export function stretchToExercise(
  def: StretchDef,
  record: ExerciseRecord,
  restSec: number,
): GeneratedExercise {
  return {
    slug: record.slug,
    name: { zh: record.nameZh, en: record.nameEn },
    ...(record.shortCue ? { cue: record.shortCue } : {}),
    ...(def.perSide ? { perSide: true } : {}),
    sets: 1,
    reps: def.reps ?? `${def.holdSec} sec`,
    restSec,
  };
}
