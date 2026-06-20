import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSavedIds() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  return useQuery({
    queryKey: ['saved', seekerId],
    enabled: Boolean(seekerId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('saved_companions')
        .select('companion_id')
        .eq('seeker_id', seekerId);
      if (error) throw error;
      return (data ?? []).map((r: { companion_id: string }) => r.companion_id);
    },
  });
}

export function useToggleSaved() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companionId, saved }: { companionId: string; saved: boolean }) => {
      if (saved) {
        const { error } = await supabase
          .from('saved_companions')
          .delete()
          .eq('seeker_id', seekerId)
          .eq('companion_id', companionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_companions')
          .insert({ seeker_id: seekerId, companion_id: companionId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved', seekerId] }),
  });
}
