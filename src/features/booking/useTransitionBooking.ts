import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { actionToStatus, type BookingAction } from './stateMachine';

export function useTransitionBooking(bookingId: string) {
  const { session } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: BookingAction) => {
      const status = actionToStatus(action);
      const patch: Record<string, unknown> = { status };
      if (action === 'cancel') patch.cancelled_by = session?.user.id;
      if (action === 'complete') patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
