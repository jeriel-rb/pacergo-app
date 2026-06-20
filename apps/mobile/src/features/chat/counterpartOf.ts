import type { Conversation } from './types';

export function counterpartOf(
  convo: Conversation,
  myId: string
): { id: string; name: string | null; photo: string | null } {
  if (convo.participant_a === myId) {
    return { id: convo.participant_b, name: convo.b_name, photo: convo.b_photo };
  }
  return { id: convo.participant_a, name: convo.a_name, photo: convo.a_photo };
}
