import type {
  ChatMessage,
  ConversationHeader,
  ConversationSummary,
} from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/** The signed-in user's conversations (inbox). */
export async function getMyConversations(): Promise<ConversationSummary[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_conversations");
  return (data ?? []) as ConversationSummary[];
}

/** The other participant in a conversation the caller is part of, or null. */
export async function getConversationHeader(
  id: string,
): Promise<ConversationHeader | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("conversation_header", {
    p_conversation_id: id,
  });
  return (data ?? null) as ConversationHeader | null;
}

/** Messages in a conversation (oldest first). */
export async function getConversationMessages(
  id: string,
): Promise<ChatMessage[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("conversation_messages", {
    p_conversation_id: id,
  });
  return (data ?? []) as ChatMessage[];
}

/** Whether the caller has a booking with another user (gates messaging). */
export async function hasBookingWith(otherId: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("has_booking_with", {
    p_other_id: otherId,
  });
  return Boolean(data);
}
