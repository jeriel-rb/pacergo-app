import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Booking } from './types';

export function useBookings() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['bookings', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`seeker_id.eq.${uid},companion_id.eq.${uid}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });
}
