export type Conversation = {
  id: string;
  participant_a: string;
  participant_b: string;
  a_name: string | null;
  a_photo: string | null;
  b_name: string | null;
  b_photo: string | null;
  booking_id: string | null;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
