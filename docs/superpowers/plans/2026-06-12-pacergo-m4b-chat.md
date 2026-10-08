# PacerGo M4b — Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realtime 1:1 chat so booking parties can coordinate — a conversations inbox, a message thread with live updates via Supabase Realtime, and a "Message" entry from a booking.

**Architecture:** Migration `0006` adds `conversations` (sorted participant pair, denormalized counterpart names, optional `booking_id`) and `messages`, RLS scoping both to participants, a trigger to bump `last_message_at`, and the realtime publication for `messages`. Pure helpers (TDD): `orderPair` (canonical participant ordering), `counterpartOf` (the other party + their denormalized name/photo), `mergeMessage` (id-deduped append). Hooks: `useEnsureConversation` (find-or-create sorted), `useConversations` (inbox), `useMessages` (initial fetch + realtime subscription updating the query cache), `useSendMessage`. A Chat inbox tab lists conversations; a `/chat/[id]` thread renders messages + an input; the booking detail gains a "Message" button.

**Tech Stack:** expo-router, Supabase (Postgres + RLS + Realtime), TanStack Query, NativeWind, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M4** chat side (screens 15–16).

**Builds on:** M0–M4a (UI kit, SessionProvider, profile/booking hooks, `useProfile`).

**Conventions:** commands from repo root; `@/` → `src/`; run jest **un-piped** when gating a commit (a `jest | tail` pipeline masks jest's exit code); `npm run typecheck`; bundle via `npx expo export --platform ios --output-dir /tmp/pacergo-export` then delete. Jest mocks of `@/lib/supabase/client` use `__esModule: true` + inline `jest.fn()`s.

**Verification boundary:** live chat requires migrations `0001`–`0006` applied + Realtime enabled. This plan verifies via unit/component tests, `tsc`, and a production bundle.

---

## File structure (M4b)

```
supabase/migrations/0006_chat.sql
src/features/chat/
  types.ts
  orderPair.ts             # PURE (TDD)
  counterpartOf.ts         # PURE (TDD)
  mergeMessage.ts          # PURE (TDD)
  useEnsureConversation.ts
  useConversations.ts
  useMessages.ts           # initial fetch + realtime subscription
  useSendMessage.ts
src/app/(tabs)/chat.tsx     # MODIFY: inbox
src/app/chat/[id].tsx       # thread
src/app/booking/[id].tsx    # MODIFY: add Message button
src/app/_layout.tsx         # MODIFY: register chat/[id]
src/locales/*.json          # MODIFY
```

---

## Task 1: Branch + chat migration

**Files:** Create `supabase/migrations/0006_chat.sql`

- [ ] **Step 1: Branch**

```bash
git checkout main
git checkout -b feat/m4b-chat
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/0006_chat.sql`:

```sql
-- 1:1 conversation between a sorted pair of participants.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references profiles (id) on delete cascade,
  participant_b uuid not null references profiles (id) on delete cascade,
  a_name text,
  a_photo text,
  b_name text,
  b_photo text,
  booking_id uuid references bookings (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);
create index if not exists conversations_a_idx on conversations (participant_a);
create index if not exists conversations_b_idx on conversations (participant_b);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "conversations participant read" on conversations;
create policy "conversations participant read" on conversations for select to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "conversations participant insert" on conversations;
create policy "conversations participant insert" on conversations for insert to authenticated
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "conversations participant update" on conversations;
create policy "conversations participant update" on conversations for update to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b)
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "messages participant read" on messages;
create policy "messages participant read" on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "messages sender insert" on messages;
create policy "messages sender insert" on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Bump last_message_at when a message lands (definer so the sender needn't
-- hold an explicit conversations UPDATE grant beyond participation).
create or replace function bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_bump_conversation on messages;
create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation();

-- Realtime stream for messages.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): chat schema (conversations, messages, RLS, realtime)"
```

---

## Task 2: Pure chat helpers (TDD)

**Files:**
- Create: `src/features/chat/types.ts`
- Create: `src/features/chat/orderPair.ts`
- Create: `src/features/chat/counterpartOf.ts`
- Create: `src/features/chat/mergeMessage.ts`
- Test: `src/features/chat/__tests__/chatHelpers.test.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test**

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- chatHelpers
```
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the three helpers**

`src/features/chat/orderPair.ts`:

```ts
export function orderPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}
```

`src/features/chat/counterpartOf.ts`:

```ts
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
```

`src/features/chat/mergeMessage.ts`:

```ts
import type { Message } from './types';

export function mergeMessage(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  return [...list, incoming];
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- chatHelpers
```
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(chat): pure helpers (orderPair, counterpartOf, mergeMessage)"
```

---

## Task 3: Chat hooks

**Files:**
- Create: `src/features/chat/useEnsureConversation.ts`
- Create: `src/features/chat/useConversations.ts`
- Create: `src/features/chat/useMessages.ts`
- Create: `src/features/chat/useSendMessage.ts`
- Test: `src/features/chat/__tests__/useSendMessage.test.tsx`

- [ ] **Step 1: Write the failing test for `useSendMessage`**

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { from: jest.fn(() => ({ insert: mockInsert })) },
}));
jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'me' } }, loading: false }),
}));

import { useSendMessage } from '../useSendMessage';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSendMessage', () => {
  it('inserts a message from the current user', async () => {
    const { result } = renderHook(() => useSendMessage('c1'), { wrapper });
    result.current.mutate('hello');
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      conversation_id: 'c1',
      sender_id: 'me',
      body: 'hello',
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- useSendMessage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hooks**

`src/features/chat/useEnsureConversation.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { useProfile } from '@/features/profile/useProfile';
import { orderPair } from './orderPair';

export type EnsureInput = {
  otherId: string;
  otherName: string | null;
  otherPhoto: string | null;
  bookingId?: string | null;
};

export function useEnsureConversation() {
  const { session } = useSession();
  const { data: me } = useProfile();
  const myId = session?.user.id;

  return useMutation({
    mutationFn: async (input: EnsureInput): Promise<string> => {
      if (!myId) throw new Error('no session');
      const [a, b] = orderPair(myId, input.otherId);
      const myName = me?.display_name ?? null;
      const myPhoto = me?.photo_url ?? null;
      const aIsMe = a === myId;

      const { data: existing, error: selErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_a', a)
        .eq('participant_b', b)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing?.id) return existing.id as string;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_a: a,
          participant_b: b,
          a_name: aIsMe ? myName : input.otherName,
          a_photo: aIsMe ? myPhoto : input.otherPhoto,
          b_name: aIsMe ? input.otherName : myName,
          b_photo: aIsMe ? input.otherPhoto : myPhoto,
          booking_id: input.bookingId ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
  });
}
```

`src/features/chat/useConversations.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Conversation } from './types';

export function useConversations() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['conversations', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
}
```

`src/features/chat/useMessages.ts`:

```ts
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
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
```

`src/features/chat/useSendMessage.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSendMessage(conversationId: string) {
  const { session } = useSession();
  return useMutation({
    mutationFn: async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session?.user.id,
        body: trimmed,
      });
      if (error) throw error;
    },
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- useSendMessage
```
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(chat): conversation/message hooks with realtime subscription"
```

---

## Task 4: Chat inbox

**Files:**
- Modify: `src/app/(tabs)/chat.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add chat strings to both locale files**

`src/locales/en.json` — replace the `"chatScreen"` object with:

```json
"chatScreen": {
  "title": "Messages",
  "empty": "No conversations yet.",
  "placeholder": "Message…",
  "send": "Send"
}
```

`src/locales/zh-Hant.json` — replace the `"chatScreen"` object with:

```json
"chatScreen": {
  "title": "訊息",
  "empty": "目前沒有對話。",
  "placeholder": "輸入訊息…",
  "send": "送出"
}
```

- [ ] **Step 2: Replace the chat inbox screen**

`src/app/(tabs)/chat.tsx`:

```tsx
import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useConversations } from '@/features/chat/useConversations';
import { counterpartOf } from '@/features/chat/counterpartOf';
import { useSession } from '@/features/auth/useSession';

export default function ChatInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id ?? '';
  const { data } = useConversations();

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <AppText variant="h1" className="mb-3">
          {t('chatScreen.title')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24 }}
        data={data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const other = counterpartOf(item, uid);
          return (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}`)}
              className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={other.name ?? ''} photoUrl={other.photo} size={48} />
              <AppText variant="h3">{other.name ?? ''}</AppText>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {t('chatScreen.empty')}
          </AppText>
        }
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(chat): conversations inbox"
```

---

## Task 5: Chat thread

**Files:**
- Create: `src/app/chat/[id].tsx`

- [ ] **Step 1: Create the thread screen**

`src/app/chat/[id].tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/features/chat/useMessages';
import { useSendMessage } from '@/features/chat/useSendMessage';
import { useSession } from '@/features/auth/useSession';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data: messages } = useMessages(id);
  const send = useSendMessage(id);
  const [text, setText] = useState('');

  function onSend() {
    if (!text.trim()) return;
    send.mutate(text);
    setText('');
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 8 }}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const mine = item.sender_id === uid;
            return (
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  mine ? 'self-end bg-brand-deep' : 'self-start bg-dark-surface'
                }`}
              >
                <AppText variant="body" className={mine ? 'text-white' : 'text-dark-text'}>
                  {item.body}
                </AppText>
              </View>
            );
          }}
        />
        <View className="flex-row items-center gap-2 border-t border-white/10 px-4 py-2">
          <TextInput
            placeholder={t('chatScreen.placeholder')}
            placeholderTextColor="#6B6B74"
            value={text}
            onChangeText={setText}
            className="flex-1 rounded-full bg-dark-surface px-4 py-3 text-dark-text"
          />
          <Pressable onPress={onSend} className="rounded-full bg-brand-deep px-5 py-3">
            <AppText className="text-white">{t('chatScreen.send')}</AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(chat): realtime message thread"
```

---

## Task 6: Message entry from booking + register route

**Files:**
- Modify: `src/app/booking/[id].tsx`
- Modify: `src/app/_layout.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add the message label to both locale files**

`src/locales/en.json` — in `"bookingDetail"` add: `"message": "Message"`.
`src/locales/zh-Hant.json` — in `"bookingDetail"` add: `"message": "傳訊息"`.

- [ ] **Step 2: Add a Message button to the booking detail**

In `src/app/booking/[id].tsx`, add the import:

```tsx
import { useEnsureConversation } from '@/features/chat/useEnsureConversation';
```

Inside the component (after `const transition = useTransitionBooking(id);`), add:

```tsx
  const ensure = useEnsureConversation();

  async function openChat() {
    if (!booking) return;
    const otherId = amSeeker ? booking.companion_id : booking.seeker_id;
    const otherName = amSeeker ? booking.companion_name : booking.seeker_name;
    const otherPhoto = amSeeker ? booking.companion_photo : booking.seeker_photo;
    const convoId = await ensure.mutateAsync({ otherId, otherName, otherPhoto, bookingId: booking.id });
    router.push(`/chat/${convoId}`);
  }
```

Then, in the actions `View` (after the `actions.map(...)` block and before the review button), add:

```tsx
          <Button label={t('bookingDetail.message')} variant="secondary" onPress={openChat} />
```

> `amSeeker`, `booking`, `router`, and `t` are already defined in this component (from M3).

- [ ] **Step 3: Register the chat route in `src/app/_layout.tsx`**

In the `Guarded` `<Stack>`, add after the `verification` screen:

```tsx
      <Stack.Screen name="chat/[id]" />
```

- [ ] **Step 4: Verify types + bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` passes; bundle prints `Exported:`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(chat): message entry from booking + register route"
```

---

## Task 7: Full verification + docs

**Files:** Modify `README.md`

- [ ] **Step 1: Add a Chat note to `README.md`** (after Companion mode)

```markdown
## Chat (M4b)

Realtime 1:1 chat between booking parties. `conversations` store a sorted
participant pair with denormalized counterpart names (so the inbox renders under
owner-only profile RLS); `messages` stream via Supabase Realtime. A "Message"
button on a booking find-or-creates the conversation and opens the thread.
Requires migration `0006_chat.sql` with the `messages` table added to the
`supabase_realtime` publication.
```

- [ ] **Step 2: Run the full test suite (un-piped)**

```bash
npm test
```
Expected: all M0–M4b suites pass (adds chatHelpers, useSendMessage).

- [ ] **Step 3: Type-check + full bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` clean; bundle `Exported:`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: M4b chat notes"
```

---

## Done — M4b acceptance

- [ ] A booking's "Message" button find-or-creates a conversation and opens the thread.
- [ ] The Chat tab lists conversations with the counterpart's name/photo (via `counterpartOf`).
- [ ] The thread shows messages (mine right/violet, theirs left/surface) and sends new ones; realtime INSERTs append live via `mergeMessage`.
- [ ] RLS scopes conversations + messages to participants; message body length-capped.
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live chat requires migrations `0001`–`0006` applied + Realtime. Logic, SQL, screens, hooks are built and unit/bundle-verified.

**Next milestone:** M5 — Trust & safety + polish (report/block, safety center, in-app notification center reading `notifications`, age gate already done, account deletion, empty/error pass).
```
