import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useBlockedIds() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['blocks', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', uid);
      if (error) throw error;
      return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
    },
  });
}

export function useBlock() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: uid, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks', uid] });
      qc.invalidateQueries({ queryKey: ['nearby'] });
    },
  });
}

export function useUnblock() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', uid)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks', uid] }),
  });
}
