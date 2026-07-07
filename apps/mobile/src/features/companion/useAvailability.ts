import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { useMyListing } from './useMyListing';
import type { AvailabilitySlot } from './types';

export function useAvailability() {
  const listing = useMyListing();
  return { ...listing, data: listing.data?.availability as AvailabilitySlot[] | undefined };
}

export function useSaveAvailability() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots: { weekday: number; start_minute: number; end_minute: number }[]) => {
      const { error } = await supabase.rpc('set_my_availability', { p_slots: slots });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myListing', uid] }),
  });
}
