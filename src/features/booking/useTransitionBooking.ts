import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { BookingAction } from './stateMachine';

// Each action maps to a SECURITY DEFINER RPC that enforces role + the allowed
// FSM and sets cancelled_by / completed_at server-side. Clients cannot UPDATE
// bookings directly.
const ACTION_RPC: Record<BookingAction, string> = {
  accept: 'accept_booking',
  decline: 'decline_booking',
  cancel: 'cancel_booking',
  complete: 'complete_booking',
};

export function useTransitionBooking(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: BookingAction) => {
      const { error } = await supabase.rpc(ACTION_RPC[action], { p_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
