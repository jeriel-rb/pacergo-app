import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { TrainerSummary } from '@pacergo/shared';

export function useSavedIds() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  return useQuery({
    queryKey: ['saved', seekerId],
    enabled: Boolean(seekerId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('my_saved_companion_ids');
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });
}

/** Saved companions with display data (same summary shape as web feeds). */
export function useSavedFeed() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  return useQuery({
    queryKey: ['savedFeed', seekerId],
    enabled: Boolean(seekerId),
    queryFn: async (): Promise<TrainerSummary[]> => {
      const { data, error } = await supabase.rpc('saved_companions_feed');
      if (error) throw error;
      return (data ?? []) as TrainerSummary[];
    },
  });
}

export function useToggleSaved() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companionId: string) => {
      const { error } = await supabase.rpc('toggle_saved_companion', {
        p_companion_id: companionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved', seekerId] });
      qc.invalidateQueries({ queryKey: ['savedFeed', seekerId] });
    },
  });
}
