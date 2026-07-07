import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Booking } from './types';

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase.rpc('booking_detail', { p_id: id });
      if (error) throw error;
      return (data ?? null) as Booking | null;
    },
  });
}
