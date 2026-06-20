import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSubmitReview(bookingId: string) {
  const { session } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      revieweeId,
      rating,
      comment,
    }: {
      revieweeId: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        reviewer_id: session?.user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking', bookingId] }),
  });
}
