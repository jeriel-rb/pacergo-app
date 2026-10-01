import type { GeneratedExercise, GeneratedSession } from "@pacergo/shared";

/** Which part of a day an exercise sits in — part of a set's identity because
 *  the same exercise can appear in the warm-up and in the main block. */
export type WorkoutGroup = "cardio" | "warmup" | "main" | "cooldown";

/** A rest countdown in progress. Stored as an end time (not a ticking number) so
 *  it stays correct when the tab sleeps or the user opens an exercise and comes
 *  back. */
export interface ActiveRest {
  endsAt: number;
  totalSec: number;
}

export interface WorkoutProgress {
  /** Ticked sets, `"<group>:<slug>"` → set numbers (0-based). */
  done: Record<string, number[]>;
  rest: ActiveRest | null;
}

export const EMPTY_PROGRESS: WorkoutProgress = { done: {}, rest: null };

/** Rest can be nudged by this much from the countdown bar. */
export const REST_NUDGE_SEC = 15;

export const setKey = (group: WorkoutGroup, slug: string) => `${group}:${slug}`;

export const progressStorageKey = (planId: string, week: number, dayIndex: number) =>
  `pacergo.workout.v1:${planId}:${week}:${dayIndex}`;

/** Parses whatever is in storage; anything malformed becomes an empty workout. */
export function parseProgress(raw: string | null): WorkoutProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const value = JSON.parse(raw) as Partial<WorkoutProgress> | null;
    const done: Record<string, number[]> = {};
    for (const [key, sets] of Object.entries(value?.done ?? {})) {
      if (Array.isArray(sets)) done[key] = sets.filter((n) => Number.isInteger(n) && n >= 0);
    }
    const rest = value?.rest;
    const validRest =
      rest && Number.isFinite(rest.endsAt) && Number.isFinite(rest.totalSec) && rest.totalSec > 0
        ? { endsAt: rest.endsAt, totalSec: rest.totalSec }
        : null;
    return { done, rest: validRest };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function isSetDone(progress: WorkoutProgress, key: string, set: number): boolean {
  return progress.done[key]?.includes(set) ?? false;
}

/** Ticks or unticks one set. Unticking also cancels a running rest countdown,
 *  since the set it followed didn't happen. */
export function toggleSet(progress: WorkoutProgress, key: string, set: number): WorkoutProgress {
  const current = progress.done[key] ?? [];
  const has = current.includes(set);
  const next = has ? current.filter((n) => n !== set) : [...current, set].sort((a, b) => a - b);
  return { done: { ...progress.done, [key]: next }, rest: has ? null : progress.rest };
}

/** Marks sets done without touching the rest countdown — restoring sets the
 *  account already has logged (another device, or after signing back in). */
export function markSetsDone(progress: WorkoutProgress, key: string, sets: readonly number[]): WorkoutProgress {
  const current = progress.done[key] ?? [];
  const next = [...new Set([...current, ...sets])].sort((a, b) => a - b);
  return next.length === current.length ? progress : { ...progress, done: { ...progress.done, [key]: next } };
}

/** Every main-lift set of the day is done — the workout counts as finished. */
export function mainSetsComplete(session: GeneratedSession, progress: WorkoutProgress): boolean {
  return (
    session.main.length > 0 &&
    session.main.every((e) => (progress.done[setKey("main", e.slug)] ?? []).filter((n) => n < e.sets).length >= e.sets)
  );
}

export function startRest(progress: WorkoutProgress, totalSec: number, now: number): WorkoutProgress {
  if (totalSec <= 0) return { ...progress, rest: null };
  return { ...progress, rest: { endsAt: now + totalSec * 1000, totalSec } };
}

export const stopRest = (progress: WorkoutProgress): WorkoutProgress => ({ ...progress, rest: null });

/** Adds (or removes) seconds on the running countdown; never below zero. */
export function nudgeRest(progress: WorkoutProgress, deltaSec: number, now: number): WorkoutProgress {
  if (!progress.rest) return progress;
  const endsAt = Math.max(now, progress.rest.endsAt + deltaSec * 1000);
  return { ...progress, rest: { endsAt, totalSec: Math.max(1, progress.rest.totalSec + deltaSec) } };
}

/** Whole seconds left, rounded up so the bar shows 0:01 until the very end. */
export const secondsLeft = (rest: ActiveRest, now: number): number =>
  Math.max(0, Math.ceil((rest.endsAt - now) / 1000));

export const clockText = (sec: number): string =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Every (group, exercise) block of a session, in the order the day shows them. */
export function sessionBlocks(session: GeneratedSession) {
  const cardio = session.cardio ? [{ group: "cardio" as const, exercise: session.cardio.exercise }] : [];
  const blocks = [
    ...(session.cardio?.placement === "start" ? cardio : []),
    ...session.warmup.map((exercise) => ({ group: "warmup" as const, exercise })),
    ...session.main.map((exercise) => ({ group: "main" as const, exercise })),
    ...session.cooldown.map((exercise) => ({ group: "cooldown" as const, exercise })),
    ...(session.cardio?.placement === "end" ? cardio : []),
  ];
  return blocks;
}

/** Sets ticked so far / sets in the whole session. */
export function sessionProgress(session: GeneratedSession, progress: WorkoutProgress) {
  let total = 0;
  let done = 0;
  for (const { group, exercise } of sessionBlocks(session)) {
    total += exercise.sets;
    done += (progress.done[setKey(group, exercise.slug)] ?? []).filter((n) => n < exercise.sets).length;
  }
  return { done, total };
}

/** Where an exercise sits in a day: its block, the exercise that follows it, and
 *  whether it's the last main lift (its final set starts no rest countdown). */
export interface ExerciseSlot {
  group: WorkoutGroup;
  exercise: GeneratedExercise;
  next: { group: WorkoutGroup; exercise: GeneratedExercise } | null;
  isLastMain: boolean;
}

/** Finds `slug` in a day's session. The same exercise can be in two blocks (a
 *  warm-up squat and a main-lift squat), so `groupHint` (from the link the user
 *  followed) picks the block; without a usable hint the main block wins. */
export function findExerciseSlot(
  session: GeneratedSession,
  slug: string,
  groupHint?: string | null,
): ExerciseSlot | null {
  const blocks = sessionBlocks(session);
  const matches = blocks.flatMap((b, i) => (b.exercise.slug === slug ? [i] : []));
  if (matches.length === 0) return null;
  const index =
    matches.find((i) => blocks[i]!.group === groupHint) ??
    matches.find((i) => blocks[i]!.group === "main") ??
    matches[0]!;
  const block = blocks[index]!;
  const lastMain = session.main[session.main.length - 1];
  return {
    group: block.group,
    exercise: block.exercise,
    next: blocks[index + 1] ?? null,
    isLastMain: block.group === "main" && lastMain?.slug === block.exercise.slug,
  };
}
