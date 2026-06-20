import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type AppNotification = {
  id: string;
  type: string;
  payload: { booking_id?: string; status?: string };
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['notifications', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, payload, read_at, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', uid)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', uid] }),
  });
}
