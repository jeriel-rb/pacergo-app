import { calendarDateKeyInAppTz } from "./app-timezone";

/** Stored weeks in a generated plan. Week 5 of real time shows week 1 again. */
export const PLAN_BLOCK_WEEKS = 4;

/**
 * Which stored week (1–4) to open for a plan saved at `createdAt`.
 *
 * `created_at` is a UTC instant. The day boundary is Asia/Taipei midnight,
 * the same clock as workout logs and the home ring. A plan created at
 * 00:30 Taipei is already on that calendar day, even though UTC is still
 * the evening before. Editing a plan does not change `created_at`, so the
 * week does not reset. A missing timestamp opens week 1.
 */
export function planBlockWeek(
  createdAt: string | Date | null | undefined,
  now: Date = new Date(),
  blockWeeks: number = PLAN_BLOCK_WEEKS,
): number {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt ?? "");
  if (Number.isNaN(created.getTime()) || blockWeeks < 1) return 1;

  const days = daysBetweenDateKeys(
    calendarDateKeyInAppTz(created),
    calendarDateKeyInAppTz(now),
  );
  if (days <= 0) return 1;
  return (Math.floor(days / 7) % blockWeeks) + 1;
}

/** Whole days from `startKey` to `endKey`, both `YYYY-MM-DD`. */
function daysBetweenDateKeys(startKey: string, endKey: string): number {
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const end = Date.parse(`${endKey}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
