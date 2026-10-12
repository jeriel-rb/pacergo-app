"use client";

import { REVIEW_PAGE_SIZE, type Review } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** The next page of public reviews for an active trainer, newest first. */
export async function fetchCompanionReviewPage(id: string, offset: number): Promise<Review[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("companion_reviews", {
    p_id: id,
    p_limit: REVIEW_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as Review[];
}
