/** A conversation row in the inbox list. */
export interface ConversationSummary {
  id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  last_message_at: string;
  last_body: string | null;
  unread: number;
}

/** The other participant in a single conversation. */
export interface ConversationHeader {
  id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
}

/** A single chat message. */
export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
