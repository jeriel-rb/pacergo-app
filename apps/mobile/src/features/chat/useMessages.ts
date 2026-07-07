import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { mergeMessage } from './mergeMessage';
import type { Message } from './types';

export function useMessages(conversationId: string) {
  const qc = useQueryClient();
  const key = ['messages', conversationId];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase.rpc('conversation_messages', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      // Opening the thread clears the unread badge (fire and forget).
      void supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          qc.setQueryData<Message[]>(key, (old) => mergeMessage(old ?? [], payload.new as Message));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return query;
}
