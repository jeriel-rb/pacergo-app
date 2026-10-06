import type { TrainerSummary, ActivitySlug } from "@pacergo/shared";

export type TrainerCategory = "all" | ActivitySlug;

/** Drops the signed-in user so a trainer never sees their own listing in the feed. */
export function excludeSelf(
  list: TrainerSummary[],
  userId: string | null | undefined,
): TrainerSummary[] {
  if (!userId) return list;
  return list.filter((t) => t.id !== userId);
}

/** Filters the trainer feed by activity category; "all" passes everything through. */
export function filterTrainers(
  list: TrainerSummary[],
  category: TrainerCategory,
): TrainerSummary[] {
  if (category === "all") return list;
  return list.filter((t) => t.activities.includes(category));
}
