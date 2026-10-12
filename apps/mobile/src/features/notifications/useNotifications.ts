import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATION_PAGE_SIZE } from '@pacergo/shared';
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
  return useInfiniteQuery({
    queryKey: ['notifications', uid],
    enabled: Boolean(uid),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<AppNotification[]> => {
      const { data, error } = await supabase.rpc('my_notifications', {
        p_limit: NOTIFICATION_PAGE_SIZE,
        p_offset: pageParam,
      });
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length === NOTIFICATION_PAGE_SIZE ? lastOffset + NOTIFICATION_PAGE_SIZE : undefined,
  });
}

export function useMarkNotificationsRead() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', uid] }),
  });
}
