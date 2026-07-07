import type { ChatMessage, ConversationSummary } from '@pacergo/shared';

export type { ConversationSummary };

/** A chat message; realtime rows also carry conversation_id. */
export type Message = ChatMessage & { conversation_id?: string };
