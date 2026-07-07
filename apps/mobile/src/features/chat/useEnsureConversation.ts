import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * Find-or-create the conversation with another user via start_conversation
 * (server requires an existing booking between the two and snapshots names).
 */
export function useEnsureConversation() {
  return useMutation({
    mutationFn: async ({ otherId }: { otherId: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('start_conversation', {
        p_other_id: otherId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}
