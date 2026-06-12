import type { Message } from './types';

export function mergeMessage(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  return [...list, incoming];
}
