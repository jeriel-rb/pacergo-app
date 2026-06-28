"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Open (or fetch) the conversation with another user. Requires a booking. */
export async function startConversation(otherId: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_other_id: otherId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Send a message to a conversation. Returns the new message id. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Mark the other party's messages in a conversation as read. */
export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
}
