import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { AvailabilitySlot } from './types';

export function useAvailability() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['availability', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      const { data, error } = await supabase
        .from('availability')
        .select('id, weekday, start_minute, end_minute')
        .eq('profile_id', uid)
        .order('weekday');
      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
  });
}

export function useSaveAvailability() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots: { weekday: number; start_minute: number; end_minute: number }[]) => {
      const { error: del } = await supabase.from('availability').delete().eq('profile_id', uid);
      if (del) throw del;
      if (slots.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(slots.map((s) => ({ ...s, profile_id: uid })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', uid] }),
  });
}
