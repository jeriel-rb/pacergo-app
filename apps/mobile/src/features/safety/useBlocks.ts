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
      const { data, error } = await supabase.rpc('my_blocked_ids');
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });
}

export function useBlock() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.rpc('block_user', { p_user_id: blockedId });
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
      const { error } = await supabase.rpc('unblock_user', { p_user_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks', uid] }),
  });
}
