import { orderPair } from '../orderPair';
import { counterpartOf } from '../counterpartOf';
import { mergeMessage } from '../mergeMessage';
import type { Conversation, Message } from '../types';

describe('orderPair', () => {
  it('returns the two ids sorted ascending regardless of input order', () => {
    expect(orderPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderPair('a', 'b')).toEqual(['a', 'b']);
  });
});

const convo: Conversation = {
  id: 'c1',
  participant_a: 'a',
  participant_b: 'b',
  a_name: 'Alice',
  a_photo: null,
  b_name: 'Bob',
  b_photo: null,
  booking_id: null,
  last_message_at: '2026-07-01T00:00:00Z',
};

describe('counterpartOf', () => {
  it('returns participant_b when I am participant_a', () => {
    expect(counterpartOf(convo, 'a')).toEqual({ id: 'b', name: 'Bob', photo: null });
  });

  it('returns participant_a when I am participant_b', () => {
    expect(counterpartOf(convo, 'b')).toEqual({ id: 'a', name: 'Alice', photo: null });
  });
});

describe('mergeMessage', () => {
  const m1: Message = { id: 'm1', conversation_id: 'c1', sender_id: 'a', body: 'hi', created_at: '1' };
  const m2: Message = { id: 'm2', conversation_id: 'c1', sender_id: 'b', body: 'yo', created_at: '2' };

  it('appends a new message', () => {
    expect(mergeMessage([m1], m2)).toEqual([m1, m2]);
  });

  it('ignores a duplicate by id', () => {
    expect(mergeMessage([m1, m2], m1)).toEqual([m1, m2]);
  });
});
