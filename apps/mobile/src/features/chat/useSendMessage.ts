import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useSendMessage(conversationId: string) {
  return useMutation({
    mutationFn: async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const { error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_body: trimmed,
      });
      if (error) throw error;
    },
  });
}
