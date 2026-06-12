import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { useProfile } from '@/features/profile/useProfile';
import type { NewBooking } from './types';

export function useCreateBooking() {
  const { session } = useSession();
  const { data: me } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBooking) => {
      const { error } = await supabase.from('bookings').insert({
        ...input,
        seeker_id: session?.user.id,
        seeker_name: me?.display_name ?? null,
        seeker_photo: me?.photo_url ?? null,
        status: 'requested',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
