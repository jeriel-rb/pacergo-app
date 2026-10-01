/** One performed set, as logged. Weight is always kilograms. */
export interface LoggedSet {
  weightKg: number | null;
  reps: number | null;
}

export type EffortFeedback = "too_light" | "just_right" | "too_heavy";

export const EFFORT_FEEDBACK: readonly EffortFeedback[] = ["too_light", "just_right", "too_heavy"] as const;

export interface PreviousPerformance {
  sets: LoggedSet[];
  effort: EffortFeedback | null;
}

export type LoadAction = "increase" | "maintain" | "decrease";

/** Why the recommendation moved (or didn't) — the UI turns it into copy. */
export type LoadReason =
  | "hit_top_of_range"
  | "felt_too_light"
  | "within_range"
  | "missed_bottom_of_range"
  | "felt_too_heavy";

export interface LoadRecommendation {
  weightKg: number;
  action: LoadAction;
  reason: LoadReason;
  /** The working weight the recommendation is based on. */
  previousKg: number;
}

/** Tunables for the basic calibration loop — kept together so they can be
 *  revised without touching the logic. */
export const PROGRESSION_RULES = {
  /** Load step as a fraction of the working weight… */
  stepFraction: 0.025,
  /** …clamped to this range (kg), then rounded to `roundToKg`. */
  minStepKg: 1,
  maxStepKg: 5,
  roundToKg: 0.5,
} as const;

/** "6-10" → { low: 6, high: 10 }, "12" → { 12, 12 }; timed work ("30 sec")
 *  has no rep range → null. */
export function parseRepRange(reps: string): { low: number; high: number } | null {
  if (/sec|min|s$/i.test(reps)) return null;
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  return { low: Math.min(...nums), high: Math.max(...nums) };
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function stepFor(weightKg: number): number {
  const r = PROGRESSION_RULES;
  const raw = Math.min(r.maxStepKg, Math.max(r.minStepKg, weightKg * r.stepFraction));
  return Math.max(r.roundToKg, roundTo(raw, r.roundToKg));
}

/**
 * Basic calibration: Plan → actual performance → next recommendation.
 * Looks at the heaviest working weight last time and how the sets at that
 * weight went against the target rep range:
 *
 * - Every set reached the top of the range (and it wasn't "too heavy"), or it
 *   felt "too light" without missing reps → add one load step.
 * - Felt "too heavy" and sets fell short of the range → take one step off.
 * - Otherwise → keep the weight and aim for more reps.
 *
 * Returns null when there's nothing to calibrate from (no weighted sets, or
 * timed work). Always just a suggestion — the user can enter any weight.
 */
export function recommendLoad(input: {
  targetReps: string;
  previous: PreviousPerformance | null;
}): LoadRecommendation | null {
  const range = parseRepRange(input.targetReps);
  const prev = input.previous;
  if (!range || !prev) return null;

  const working = prev.sets.filter(
    (s): s is { weightKg: number; reps: number } => (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0,
  );
  if (working.length === 0) return null;

  const top = Math.max(...working.map((s) => s.weightKg));
  const atTop = working.filter((s) => s.weightKg === top);
  const allHitTop = atTop.every((s) => s.reps >= range.high);
  const missedBottom = atTop.some((s) => s.reps < range.low);
  const step = stepFor(top);

  const result = (action: LoadAction, reason: LoadReason): LoadRecommendation => ({
    weightKg: roundTo(action === "increase" ? top + step : action === "decrease" ? Math.max(0, top - step) : top, PROGRESSION_RULES.roundToKg),
    action,
    reason,
    previousKg: top,
  });

  if (prev.effort === "too_heavy") {
    return missedBottom ? result("decrease", "felt_too_heavy") : result("maintain", "felt_too_heavy");
  }
  if (allHitTop) return result("increase", "hit_top_of_range");
  if (prev.effort === "too_light" && !missedBottom) return result("increase", "felt_too_light");
  if (missedBottom) return result("maintain", "missed_bottom_of_range");
  return result("maintain", "within_range");
}

export const KG_PER_LB = 0.45359237;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
