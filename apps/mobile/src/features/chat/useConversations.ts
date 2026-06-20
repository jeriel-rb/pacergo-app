import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Conversation } from './types';

export function useConversations() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['conversations', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
}
