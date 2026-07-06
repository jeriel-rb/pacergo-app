import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { NewBooking } from './types';

/**
 * Create the booking through the `create_booking` RPC (same path as web).
 * The server snapshots activity/tier/price from the offering and both
 * parties' names/photos — the client no longer denormalizes anything.
 */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBooking) => {
      const { data, error } = await supabase.rpc('create_booking', {
        p_companion_id: input.companion_id,
        p_offering_id: input.offering_id,
        p_scheduled_start: input.scheduled_start,
        p_duration_min: input.duration_min,
        p_location_name: input.location_name,
        p_seeker_note: input.seeker_note,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
