import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/** Submit via the reviews RPC — the reviewee is derived server-side. */
export function useSubmitReview(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      const { error } = await supabase.rpc('submit_review', {
        p_booking_id: bookingId,
        p_rating: rating,
        p_comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking', bookingId] }),
  });
}
