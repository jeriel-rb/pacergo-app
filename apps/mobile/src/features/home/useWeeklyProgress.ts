import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type WeeklyProgress = { target: number; done: number };

export function useWeeklyProgress() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['weeklyProgress', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<WeeklyProgress> => {
      const { data, error } = await supabase.rpc('weekly_progress');
      if (error) throw error;
      const r = (data ?? {}) as Partial<WeeklyProgress>;
      return { target: r.target ?? 5, done: r.done ?? 0 };
    },
  });
}

export function useSetWeeklyTarget() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (target: number) => {
      const { error } = await supabase.rpc('set_weekly_target', { p_target: target });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weeklyProgress', uid] }),
  });
}
