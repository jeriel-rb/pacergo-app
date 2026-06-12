import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSendMessage(conversationId: string) {
  const { session } = useSession();
  return useMutation({
    mutationFn: async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session?.user.id,
        body: trimmed,
      });
      if (error) throw error;
    },
  });
}
