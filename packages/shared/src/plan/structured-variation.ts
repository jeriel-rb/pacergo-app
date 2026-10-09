import type { OnboardingVariety } from "../onboarding/onboarding-types";
import { ISOLATION_SLUGS } from "./exercise-meta";
import type { ExerciseRecord } from "./generated-plan-types";

/**
 * Optional performance signal for plan generation (Engine A). Recent /
 * struggling lifts bias Exposure B+ away from the same lead — never random.
 * Live load advice (Engine B) still owns set-to-set weight changes.
 */
export interface PlanPerformanceHistory {
  /** Newest-first slugs logged recently (any plan). */
  recentSlugs?: readonly string[];
  /** Slugs that felt too heavy or repeatedly missed the rep floor. */
  strugglingSlugs?: readonly string[];
}

/** Angle / machine family — used to rotate emphasis across exposures. */
export function emphasisKey(slug: string): string {
  if (/incline|low-to-high|upper/.test(slug)) return "incline";
  if (/decline|high-to-low|lower/.test(slug)) return "decline";
  if (/machine|smith|hack|leg-press|chest-supported|pec-deck|assisted/.test(slug)) return "machine";
  if (/cable|pulldown|pushdown|face-pull/.test(slug)) return "cable";
  if (/dumbbell|kettlebell|db-/.test(slug)) return "dumbbell";
  if (/barbell|bb-|ez-bar|trap-bar|landmine/.test(slug)) return "barbell";
  if (/push-up|pull-up|chin-up|dip|bodyweight|wall-|knee-|pike|inverted/.test(slug)) return "bodyweight";
  return "other";
}

function softAvoidSet(history: PlanPerformanceHistory | undefined, extra: ReadonlySet<string>): Set<string> {
  const out = new Set(extra);
  for (const s of history?.recentSlugs ?? []) out.add(s);
  for (const s of history?.strugglingSlugs ?? []) out.add(s);
  return out;
}

/** How far to rotate the pattern list for this exposure. Frequency is the
 *  exposure index itself; `dynamic` steps farther so high-frequency weeks remix
 *  accessories harder while staying deterministic. */
export function exposureOffset(
  exposureIndex: number,
  variety: OnboardingVariety,
): number {
  if (exposureIndex <= 0) return 0;
  const step = variety === "dynamic" ? 2 : 1;
  return exposureIndex * step;
}

/**
 * Re-order one muscle's ranked candidates for Exposure A/B/C.
 * - Exposure 0: keep ranking; only demote struggling leads when an alt exists.
 * - Later exposures: rotate compounds + isolations; prefer a different
 *   emphasis key than the prior lead; soft-avoid recently used / logged slugs.
 */
export function orderGroupForExposure(
  group: readonly ExerciseRecord[],
  exposureIndex: number,
  variety: OnboardingVariety,
  softAvoid: ReadonlySet<string>,
  history?: PlanPerformanceHistory,
): ExerciseRecord[] {
  if (group.length <= 1) return [...group];

  const patterns = group.filter((e) => !ISOLATION_SLUGS.has(e.slug));
  const isolations = group.filter((e) => ISOLATION_SLUGS.has(e.slug));
  // The pool ranks compounds ahead of single-joint moves, so an isolation at
  // the head of a group that also has compounds is a prioritised one (shrugs
  // for traps, lateral raises for middle delts). It keeps the lead; the rest
  // of the group is ordered as usual.
  if (patterns.length > 0 && ISOLATION_SLUGS.has(group[0]!.slug)) {
    return [group[0]!, ...orderGroupForExposure(group.slice(1), exposureIndex, variety, softAvoid, history)];
  }

  const avoid = softAvoidSet(history, softAvoid);

  const rotate = <T>(arr: T[], offset: number): T[] => {
    if (arr.length === 0) return [];
    const o = ((offset % arr.length) + arr.length) % arr.length;
    return [...arr.slice(o), ...arr.slice(0, o)];
  };

  const preferLead = (list: ExerciseRecord[], bannedEmphasis?: string): ExerciseRecord[] => {
    if (list.length === 0) return list;
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      let s = 0;
      if (avoid.has(e.slug)) s += 4;
      if (history?.strugglingSlugs?.includes(e.slug)) s += 3;
      if (bannedEmphasis && emphasisKey(e.slug) === bannedEmphasis) s += 2;
      if (history?.recentSlugs?.includes(e.slug)) s += 1;
      if (s < bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    if (bestIdx === 0) return [...list];
    const lead = list[bestIdx]!;
    return [lead, ...list.filter((e) => e !== lead)];
  };

  if (exposureIndex <= 0) {
    // Measurable overload session: keep the pool's ranked order. Only demote
    // a struggling lead when a cleaner alternative exists — never A–Z reshuffle.
    if (patterns.length === 0) return [...isolations];
    const lead = patterns[0]!;
    const struggling = history?.strugglingSlugs?.includes(lead.slug);
    if (struggling && patterns.length > 1) {
      const alt = patterns.find((e) => !history?.strugglingSlugs?.includes(e.slug));
      if (alt) return [alt, ...patterns.filter((e) => e !== alt), ...isolations];
    }
    return [...patterns, ...isolations];
  }

  const offset = exposureOffset(exposureIndex, variety);
  let rotatedPatterns = rotate(patterns, offset);
  const priorLead = patterns[0];
  const banned = priorLead ? emphasisKey(priorLead.slug) : undefined;
  rotatedPatterns = preferLead(rotatedPatterns, banned);

  const isoOffset = variety === "dynamic" ? offset : exposureIndex;
  const rotatedIso = preferLead(rotate(isolations, isoOffset));
  return [...rotatedPatterns, ...rotatedIso];
}

/** Prefer unused slugs when topping up / filling rounds. */
export function preferUnused(
  candidates: readonly ExerciseRecord[],
  used: ReadonlySet<string>,
): ExerciseRecord[] {
  const fresh = candidates.filter((e) => !used.has(e.slug));
  return fresh.length > 0 ? fresh : [...candidates];
}
