import { orderPair } from '../orderPair';
import { mergeMessage } from '../mergeMessage';
import type { Message } from '../types';

describe('orderPair', () => {
  it('returns the two ids sorted ascending regardless of input order', () => {
    expect(orderPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderPair('a', 'b')).toEqual(['a', 'b']);
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
