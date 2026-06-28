"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Submit (or update) the caller's review for a completed booking (via RPC). */
export async function submitReview(
  bookingId: string,
  rating: number,
  comment: string | null,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("submit_review", {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
  });
  if (error) throw new Error(error.message);
}
