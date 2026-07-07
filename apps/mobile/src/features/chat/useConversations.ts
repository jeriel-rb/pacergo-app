import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { ConversationSummary } from './types';

export function useConversations() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['conversations', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data, error } = await supabase.rpc('my_conversations');
      if (error) throw error;
      return (data ?? []) as ConversationSummary[];
    },
  });
}
