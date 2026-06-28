import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** The signed-in user's own review for a booking (or null if not reviewed). */
export async function getMyReviewForBooking(
  bookingId: string,
): Promise<MyReview | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_review_for_booking", {
    p_booking_id: bookingId,
  });
  return (data ?? null) as MyReview | null;
}
