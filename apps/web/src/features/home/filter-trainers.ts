import type { TrainerSummary, ActivitySlug } from "@pacergo/shared";

export type TrainerCategory = "all" | ActivitySlug;

/** Filters the trainer feed by activity category; "all" passes everything through. */
export function filterTrainers(
  list: TrainerSummary[],
  category: TrainerCategory,
): TrainerSummary[] {
  if (category === "all") return list;
  return list.filter((t) => t.activities.includes(category));
}
