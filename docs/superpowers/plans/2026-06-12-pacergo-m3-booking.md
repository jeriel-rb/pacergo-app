# PacerGo M3 — Booking Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the end-to-end booking loop — request a session, companion accept/decline, a guarded status state machine, cancel/complete, reviews, and booking-event notification rows — lighting up the disabled "Request a session" CTA from M2.

**Architecture:** Migration `0004` adds `bookings`, `reviews`, `notifications`, a `booking_status` enum, a trigger that writes notification rows on booking events, and a trigger that recomputes a listing's rating on review insert. A pure, TDD'd state machine (`availableActions`, `actionToStatus`) decides which buttons appear and guards transitions; a pure `categorizeBooking` sorts bookings into Upcoming/Requests/Past. Counterpart display fields are denormalized onto each booking at creation (avoids cross-user profile reads under owner-only RLS). Screens: a request flow, a tabbed bookings list, a booking detail with actions, and a review screen.

**Tech Stack:** expo-router, Supabase (Postgres + RLS + triggers), TanStack Query, Zod, NativeWind, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M3** (screens 10–14).

**Builds on:** M0–M2 (UI kit, SessionProvider, profile/discovery hooks, formatters, `useCompanion`).

**Conventions:** commands from repo root; `@/` → `src/`; `npm test -- <pattern>`; `npm run typecheck`; bundle via `npx expo export --platform ios --output-dir /tmp/pacergo-export` then delete. Jest mocks of `@/lib/supabase/client` use `__esModule: true` + inline `jest.fn()`s.

**Verification boundary:** live bookings require migrations `0001`–`0004` applied. This plan verifies via unit/component tests, `tsc`, and a production bundle. Expo **push delivery** (device registration + Edge Function fan-out) is out of scope for M3 — M3 writes notification *rows*; the in-app notification center is M5.

---

## File structure (M3)

```
supabase/migrations/0004_booking.sql
src/features/booking/
  types.ts                 # Booking, Review, status types
  stateMachine.ts          # availableActions, actionToStatus (PURE, TDD)
  categorizeBooking.ts     # PURE: booking + myId -> 'upcoming'|'requests'|'past' (TDD)
  useCreateBooking.ts
  useBookings.ts           # list for current user
  useBooking.ts            # one booking
  useTransitionBooking.ts  # accept/decline/cancel/complete
  useSubmitReview.ts
src/components/booking/
  StatusPill.tsx
src/app/booking/
  request/[companionId].tsx
  [id].tsx                 # booking detail
  [id]/review.tsx          # review screen
src/app/(tabs)/bookings.tsx  # MODIFY: tabbed list
src/app/companion/[id].tsx   # MODIFY: enable Request CTA
src/app/_layout.tsx          # MODIFY: register booking routes
src/locales/*.json           # MODIFY
```

---

## Task 1: Branch + booking migration

**Files:** Create `supabase/migrations/0004_booking.sql`

- [ ] **Step 1: Branch**

```bash
git checkout main
git checkout -b feat/m3-booking
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/0004_booking.sql`:

```sql
do $$ begin
  create type booking_status as enum
    ('requested', 'accepted', 'declined', 'cancelled', 'completed', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references profiles (id) on delete cascade,
  companion_id uuid not null references profiles (id) on delete cascade,
  offering_id uuid references listing_offerings (id) on delete set null,
  activity_slug text,
  tier tier_level,
  status booking_status not null default 'requested',
  scheduled_start timestamptz,
  duration_min int not null default 60,
  location_name text,
  agreed_price int not null default 0,
  is_free boolean not null default false,
  seeker_note text,
  -- denormalized display (avoids cross-user profile reads under owner-only RLS)
  seeker_name text,
  seeker_photo text,
  companion_name text,
  companion_photo text,
  cancelled_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seeker_id <> companion_id)
);
create index if not exists bookings_seeker_idx on bookings (seeker_id);
create index if not exists bookings_companion_idx on bookings (companion_id);

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  reviewer_id uuid not null references profiles (id) on delete cascade,
  reviewee_id uuid not null references profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- RLS
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;

drop policy if exists "bookings parties read" on bookings;
create policy "bookings parties read"
  on bookings for select to authenticated
  using (seeker_id = auth.uid() or companion_id = auth.uid());

drop policy if exists "bookings seeker insert" on bookings;
create policy "bookings seeker insert"
  on bookings for insert to authenticated
  with check (seeker_id = auth.uid());

drop policy if exists "bookings parties update" on bookings;
create policy "bookings parties update"
  on bookings for update to authenticated
  using (seeker_id = auth.uid() or companion_id = auth.uid())
  with check (seeker_id = auth.uid() or companion_id = auth.uid());

drop policy if exists "reviews readable" on reviews;
create policy "reviews readable"
  on reviews for select to authenticated using (true);

drop policy if exists "reviews author insert" on reviews;
create policy "reviews author insert"
  on reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (b.seeker_id = auth.uid() or b.companion_id = auth.uid())
    )
  );

drop policy if exists "notifications owner read" on notifications;
create policy "notifications owner read"
  on notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications owner update" on notifications;
create policy "notifications owner update"
  on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notify the relevant party on booking insert/status change.
create or replace function notify_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  ntype text;
begin
  if (tg_op = 'INSERT') then
    recipient := new.companion_id; ntype := 'booking_requested';
  elsif (new.status is distinct from old.status) then
    ntype := 'booking_' || new.status;
    -- accept/decline notify the seeker; cancel/complete notify the other party
    if new.status in ('accepted', 'declined') then
      recipient := new.seeker_id;
    elsif new.cancelled_by is not null then
      recipient := case when new.cancelled_by = new.seeker_id then new.companion_id else new.seeker_id end;
    else
      recipient := new.seeker_id;
    end if;
  else
    return new;
  end if;

  insert into notifications (user_id, type, payload)
  values (recipient, ntype, jsonb_build_object('booking_id', new.id, 'status', new.status));
  return new;
end $$;

drop trigger if exists bookings_notify on bookings;
create trigger bookings_notify
  after insert or update on bookings
  for each row execute function notify_booking_event();

-- Recompute listing rating when a review lands on the companion.
create or replace function recompute_listing_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update companion_listings l
  set rating_count = sub.cnt,
      rating_avg = round(sub.avg, 1)
  from (
    select reviewee_id, count(*) cnt, avg(rating)::numeric avg
    from reviews where reviewee_id = new.reviewee_id group by reviewee_id
  ) sub
  where l.profile_id = sub.reviewee_id;
  return new;
end $$;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert on reviews
  for each row execute function recompute_listing_rating();
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): booking loop schema (bookings, reviews, notifications, triggers)"
```

---

## Task 2: Booking state machine + categorizer (pure, TDD)

**Files:**
- Create: `src/features/booking/stateMachine.ts`
- Create: `src/features/booking/categorizeBooking.ts`
- Test: `src/features/booking/__tests__/stateMachine.test.ts`
- Test: `src/features/booking/__tests__/categorizeBooking.test.ts`

- [ ] **Step 1: Write the failing test for the state machine**

```ts
import { availableActions, actionToStatus } from '../stateMachine';

describe('availableActions', () => {
  it('lets a companion accept or decline a request', () => {
    expect(availableActions('requested', 'companion')).toEqual(['accept', 'decline']);
  });

  it('lets a seeker cancel their own pending request', () => {
    expect(availableActions('requested', 'seeker')).toEqual(['cancel']);
  });

  it('lets either party cancel or complete an accepted booking', () => {
    expect(availableActions('accepted', 'seeker')).toEqual(['cancel', 'complete']);
    expect(availableActions('accepted', 'companion')).toEqual(['cancel', 'complete']);
  });

  it('offers no actions on terminal states', () => {
    expect(availableActions('completed', 'seeker')).toEqual([]);
    expect(availableActions('declined', 'companion')).toEqual([]);
  });
});

describe('actionToStatus', () => {
  it('maps actions to their resulting status', () => {
    expect(actionToStatus('accept')).toBe('accepted');
    expect(actionToStatus('decline')).toBe('declined');
    expect(actionToStatus('cancel')).toBe('cancelled');
    expect(actionToStatus('complete')).toBe('completed');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- "booking/__tests__/stateMachine"
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the state machine**

```ts
export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'expired';

export type BookingRole = 'seeker' | 'companion';
export type BookingAction = 'accept' | 'decline' | 'cancel' | 'complete';

export function availableActions(status: BookingStatus, role: BookingRole): BookingAction[] {
  if (status === 'requested') {
    return role === 'companion' ? ['accept', 'decline'] : ['cancel'];
  }
  if (status === 'accepted') {
    return ['cancel', 'complete'];
  }
  return [];
}

const ACTION_STATUS: Record<BookingAction, BookingStatus> = {
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
  complete: 'completed',
};

export function actionToStatus(action: BookingAction): BookingStatus {
  return ACTION_STATUS[action];
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- "booking/__tests__/stateMachine"
```
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing test for `categorizeBooking`**

```ts
import { categorizeBooking } from '../categorizeBooking';

const base = {
  id: 'b1',
  seeker_id: 'me',
  companion_id: 'other',
  status: 'requested' as const,
};

describe('categorizeBooking', () => {
  it('puts pending requests in the requests bucket', () => {
    expect(categorizeBooking({ ...base, status: 'requested' })).toBe('requests');
  });

  it('puts accepted bookings in upcoming', () => {
    expect(categorizeBooking({ ...base, status: 'accepted' })).toBe('upcoming');
  });

  it('puts finished/closed bookings in past', () => {
    expect(categorizeBooking({ ...base, status: 'completed' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'declined' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'cancelled' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'expired' })).toBe('past');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
npm test -- "booking/__tests__/categorizeBooking"
```
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `categorizeBooking`**

```ts
import type { BookingStatus } from './stateMachine';

export type BookingBucket = 'upcoming' | 'requests' | 'past';

export function categorizeBooking(booking: { status: BookingStatus }): BookingBucket {
  switch (booking.status) {
    case 'requested':
      return 'requests';
    case 'accepted':
      return 'upcoming';
    default:
      return 'past';
  }
}
```

- [ ] **Step 8: Run it to verify it passes**

```bash
npm test -- "booking/__tests__/categorizeBooking"
```
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(booking): state machine + categorizer (pure)"
```

---

## Task 3: Booking types + data hooks

**Files:**
- Create: `src/features/booking/types.ts`
- Create: `src/features/booking/useCreateBooking.ts`
- Create: `src/features/booking/useBookings.ts`
- Create: `src/features/booking/useBooking.ts`
- Create: `src/features/booking/useTransitionBooking.ts`
- Create: `src/features/booking/useSubmitReview.ts`
- Test: `src/features/booking/__tests__/useCreateBooking.test.tsx`

- [ ] **Step 1: Create `types.ts`**

```ts
import type { BookingStatus } from './stateMachine';
import type { Tier } from '@/features/discovery/types';

export type Booking = {
  id: string;
  seeker_id: string;
  companion_id: string;
  offering_id: string | null;
  activity_slug: string | null;
  tier: Tier | null;
  status: BookingStatus;
  scheduled_start: string | null;
  duration_min: number;
  location_name: string | null;
  agreed_price: number;
  is_free: boolean;
  seeker_note: string | null;
  seeker_name: string | null;
  seeker_photo: string | null;
  companion_name: string | null;
  companion_photo: string | null;
  created_at: string;
};

export type NewBooking = {
  companion_id: string;
  offering_id: string | null;
  activity_slug: string | null;
  tier: Tier | null;
  scheduled_start: string | null;
  duration_min: number;
  location_name: string | null;
  agreed_price: number;
  is_free: boolean;
  seeker_note: string | null;
  companion_name: string | null;
  companion_photo: string | null;
};
```

- [ ] **Step 2: Write the failing test for `useCreateBooking`**

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
jest.mock('@/features/profile/useProfile', () => ({
  __esModule: true,
  useProfile: () => ({ data: { display_name: 'Me', photo_url: null } }),
}));

import { useCreateBooking } from '../useCreateBooking';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  it('inserts a booking with seeker id + denormalized seeker name', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper });
    result.current.mutate({
      companion_id: 'c1',
      offering_id: 'o1',
      activity_slug: 'gym',
      tier: 'A',
      scheduled_start: '2026-07-01T10:00:00Z',
      duration_min: 60,
      location_name: 'Gym',
      agreed_price: 1200,
      is_free: false,
      seeker_note: null,
      companion_name: 'Coach',
      companion_photo: null,
    });
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const arg = mockInsert.mock.calls[0][0];
    expect(arg.seeker_id).toBe('me');
    expect(arg.seeker_name).toBe('Me');
    expect(arg.status).toBe('requested');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- useCreateBooking
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the hooks**

`src/features/booking/useCreateBooking.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { useProfile } from '@/features/profile/useProfile';
import type { NewBooking } from './types';

export function useCreateBooking() {
  const { session } = useSession();
  const { data: me } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBooking) => {
      const { error } = await supabase.from('bookings').insert({
        ...input,
        seeker_id: session?.user.id,
        seeker_name: me?.display_name ?? null,
        seeker_photo: me?.photo_url ?? null,
        status: 'requested',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
```

`src/features/booking/useBookings.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Booking } from './types';

export function useBookings() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['bookings', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`seeker_id.eq.${uid},companion_id.eq.${uid}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });
}
```

`src/features/booking/useBooking.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Booking } from './types';

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Booking | null;
    },
  });
}
```

`src/features/booking/useTransitionBooking.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { actionToStatus, type BookingAction } from './stateMachine';

export function useTransitionBooking(bookingId: string) {
  const { session } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: BookingAction) => {
      const status = actionToStatus(action);
      const patch: Record<string, unknown> = { status };
      if (action === 'cancel') patch.cancelled_by = session?.user.id;
      if (action === 'complete') patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

`src/features/booking/useSubmitReview.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSubmitReview(bookingId: string) {
  const { session } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ revieweeId, rating, comment }: { revieweeId: string; rating: number; comment: string }) => {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        reviewer_id: session?.user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking', bookingId] }),
  });
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- useCreateBooking
```
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(booking): types + create/list/detail/transition/review hooks"
```

---

## Task 4: StatusPill component (TDD)

**Files:**
- Create: `src/components/booking/StatusPill.tsx`
- Test: `src/components/booking/__tests__/StatusPill.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native';
import { StatusPill } from '../StatusPill';

describe('StatusPill', () => {
  it('renders the localized status label', () => {
    const { getByText } = render(<StatusPill status="accepted" />);
    expect(getByText('Accepted')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- StatusPill
```
Expected: FAIL — module not found.

- [ ] **Step 3: Add status labels to both locale files**

`src/locales/en.json` add top-level:

```json
"bookingStatus": {
  "requested": "Requested",
  "accepted": "Accepted",
  "declined": "Declined",
  "cancelled": "Cancelled",
  "completed": "Completed",
  "expired": "Expired"
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"bookingStatus": {
  "requested": "已送出",
  "accepted": "已接受",
  "declined": "已婉拒",
  "cancelled": "已取消",
  "completed": "已完成",
  "expired": "已過期"
}
```

- [ ] **Step 4: Implement `StatusPill`**

```tsx
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '@/features/booking/stateMachine';

const color: Record<BookingStatus, string> = {
  requested: '#FFB020',
  accepted: '#3DDC97',
  declined: '#FF5C5C',
  cancelled: '#6B6B74',
  completed: '#7C5CFF',
  expired: '#6B6B74',
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: color[status] }} className="self-start rounded-full px-3 py-1">
      <Text className="font-sans-semibold text-[12px] text-white">
        {t(`bookingStatus.${status}`)}
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- StatusPill
```
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(booking): StatusPill"
```

---

## Task 5: Request flow screen

**Files:**
- Create: `src/app/booking/request/[companionId].tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add request strings to both locale files**

`src/locales/en.json` add top-level:

```json
"request": {
  "title": "Request a session",
  "pickOffering": "Choose a session",
  "when": "When (YYYY-MM-DD HH:MM)",
  "where": "Where (gym or area)",
  "note": "Note (optional)",
  "send": "Send request",
  "sent": "Request sent",
  "error": "Couldn't send the request. Try again."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"request": {
  "title": "預約課程",
  "pickOffering": "選擇課程",
  "when": "時間（YYYY-MM-DD HH:MM）",
  "where": "地點（健身房或地區）",
  "note": "備註（選填）",
  "send": "送出預約",
  "sent": "預約已送出",
  "error": "無法送出預約，請再試一次。"
}
```

- [ ] **Step 2: Create the request screen**

`src/app/booking/request/[companionId].tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { useCompanion } from '@/features/discovery/useCompanion';
import { useCreateBooking } from '@/features/booking/useCreateBooking';

export default function RequestScreen() {
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useCompanion(companionId);
  const create = useCreateBooking();

  const offerings = data?.offerings ?? [];
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');

  const offering = offerings.find((o) => o.id === offeringId) ?? offerings[0] ?? null;

  async function send() {
    if (!offering) return;
    try {
      await create.mutateAsync({
        companion_id: companionId,
        offering_id: offering.id,
        activity_slug: null,
        tier: offering.tier,
        scheduled_start: when ? new Date(when.replace(' ', 'T')).toISOString() : null,
        duration_min: offering.session_minutes,
        location_name: where || null,
        agreed_price: offering.is_free ? 0 : offering.price_ntd,
        is_free: offering.is_free,
        seeker_note: note || null,
        companion_name: data?.detail?.display_name ?? null,
        companion_photo: data?.detail?.photo_url ?? null,
      });
      Alert.alert('PacerGo', t('request.sent'));
      router.replace('/(tabs)/bookings');
    } catch {
      Alert.alert('PacerGo', t('request.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('request.title')}</AppText>

        <AppText variant="h3">{t('request.pickOffering')}</AppText>
        {offerings.map((o) => {
          const active = (offering?.id ?? null) === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => setOfferingId(o.id)}
              className={`flex-row items-center justify-between rounded-lg p-4 ${
                active ? 'bg-brand-deep' : 'bg-dark-surface'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <TierBadge tier={o.tier} />
                <AppText variant="body" className={active ? 'text-white' : 'text-dark-text'}>
                  {o.session_minutes} min
                </AppText>
              </View>
              <PriceTag amount={o.is_free ? 0 : o.price_ntd} />
            </Pressable>
          );
        })}

        <TextInput
          placeholder={t('request.when')}
          placeholderTextColor="#6B6B74"
          value={when}
          onChangeText={setWhen}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('request.where')}
          placeholderTextColor="#6B6B74"
          value={where}
          onChangeText={setWhere}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('request.note')}
          placeholderTextColor="#6B6B74"
          value={note}
          onChangeText={setNote}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <Button label={t('request.send')} onPress={send} disabled={!offering || create.isPending} />
      </ScrollView>
    </ScreenContainer>
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
git commit -m "feat(booking): request flow screen"
```

---

## Task 6: Bookings list (tabbed)

**Files:**
- Modify: `src/app/(tabs)/bookings.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add bookings strings to both locale files**

`src/locales/en.json` — replace the `"bookings"` object with:

```json
"bookings": {
  "title": "Your bookings",
  "upcoming": "Upcoming",
  "requests": "Requests",
  "past": "Past",
  "empty": "Nothing here yet."
}
```

`src/locales/zh-Hant.json` — replace the `"bookings"` object with:

```json
"bookings": {
  "title": "你的預約",
  "upcoming": "即將到來",
  "requests": "邀請",
  "past": "過去",
  "empty": "目前沒有內容。"
}
```

- [ ] **Step 2: Replace the bookings screen**

`src/app/(tabs)/bookings.tsx`:

```tsx
import { useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBookings } from '@/features/booking/useBookings';
import { useSession } from '@/features/auth/useSession';
import { categorizeBooking, type BookingBucket } from '@/features/booking/categorizeBooking';

const TABS: BookingBucket[] = ['upcoming', 'requests', 'past'];

export default function BookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data } = useBookings();
  const [tab, setTab] = useState<BookingBucket>('upcoming');

  const items = (data ?? []).filter((b) => categorizeBooking(b) === tab);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <AppText variant="h1" className="mb-3">{t('bookings.title')}</AppText>
        <View className="flex-row rounded-md bg-dark-surface p-1">
          {TABS.map((b) => (
            <Pressable
              key={b}
              onPress={() => setTab(b)}
              className={`flex-1 items-center rounded-sm py-2 ${tab === b ? 'bg-brand-deep' : ''}`}
            >
              <AppText className={tab === b ? 'text-white' : 'text-dark-text-secondary'}>
                {t(`bookings.${b}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
        data={items}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => {
          const amSeeker = item.seeker_id === uid;
          const name = amSeeker ? item.companion_name : item.seeker_name;
          const photo = amSeeker ? item.companion_photo : item.seeker_photo;
          return (
            <Pressable
              onPress={() => router.push(`/booking/${item.id}`)}
              className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={name ?? ''} photoUrl={photo} size={48} />
              <View className="flex-1 gap-1">
                <AppText variant="h3">{name ?? ''}</AppText>
                <StatusPill status={item.status} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">{t('bookings.empty')}</AppText>
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
git commit -m "feat(booking): tabbed bookings list"
```

---

## Task 7: Booking detail (actions)

**Files:**
- Create: `src/app/booking/[id].tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add booking-detail strings to both locale files**

`src/locales/en.json` add top-level:

```json
"bookingDetail": {
  "accept": "Accept",
  "decline": "Decline",
  "cancel": "Cancel",
  "complete": "Mark complete",
  "review": "Leave a review",
  "when": "When",
  "where": "Where",
  "price": "Price"
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"bookingDetail": {
  "accept": "接受",
  "decline": "婉拒",
  "cancel": "取消",
  "complete": "標記完成",
  "review": "留下評價",
  "when": "時間",
  "where": "地點",
  "price": "價格"
}
```

- [ ] **Step 2: Create the booking detail screen**

`src/app/booking/[id].tsx`:

```tsx
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/ui/PriceTag';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBooking } from '@/features/booking/useBooking';
import { useTransitionBooking } from '@/features/booking/useTransitionBooking';
import { availableActions, type BookingAction } from '@/features/booking/stateMachine';
import { useSession } from '@/features/auth/useSession';

const ACTION_VARIANT: Record<BookingAction, 'primary' | 'secondary' | 'destructive'> = {
  accept: 'primary',
  complete: 'primary',
  decline: 'destructive',
  cancel: 'destructive',
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { data: booking } = useBooking(id);
  const transition = useTransitionBooking(id);

  if (!booking) {
    return (
      <ScreenContainer>
        <AppText variant="body" className="pt-10">
          {t('common.loading')}
        </AppText>
      </ScreenContainer>
    );
  }

  const amSeeker = booking.seeker_id === session?.user.id;
  const role = amSeeker ? 'seeker' : 'companion';
  const name = amSeeker ? booking.companion_name : booking.seeker_name;
  const photo = amSeeker ? booking.companion_photo : booking.seeker_photo;
  const actions = availableActions(booking.status, role);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <View className="items-center gap-2">
          <Avatar name={name ?? ''} photoUrl={photo} size={80} />
          <AppText variant="h2">{name ?? ''}</AppText>
          <StatusPill status={booking.status} />
        </View>

        <View className="gap-2 rounded-lg bg-dark-surface p-4">
          <AppText variant="caption">{t('bookingDetail.when')}</AppText>
          <AppText variant="body">{booking.scheduled_start ?? '—'}</AppText>
          <AppText variant="caption" className="mt-2">{t('bookingDetail.where')}</AppText>
          <AppText variant="body">{booking.location_name ?? '—'}</AppText>
          <AppText variant="caption" className="mt-2">{t('bookingDetail.price')}</AppText>
          <PriceTag amount={booking.is_free ? 0 : booking.agreed_price} />
        </View>

        <View className="gap-3">
          {actions.map((a) => (
            <Button
              key={a}
              label={t(`bookingDetail.${a}`)}
              variant={ACTION_VARIANT[a]}
              onPress={() => transition.mutate(a)}
              disabled={transition.isPending}
            />
          ))}
          {booking.status === 'completed' ? (
            <Button
              label={t('bookingDetail.review')}
              variant="secondary"
              onPress={() => router.push(`/booking/review/${id}`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
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
git commit -m "feat(booking): booking detail with guarded actions"
```

---

## Task 8: Review screen

**Files:**
- Create: `src/app/booking/review/[id].tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add review strings to both locale files**

`src/locales/en.json` add top-level:

```json
"review": {
  "title": "Leave a review",
  "rating": "Rating",
  "comment": "Comment (optional)",
  "submit": "Submit review",
  "thanks": "Thanks for your review!",
  "error": "Couldn't submit. Try again."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"review": {
  "title": "留下評價",
  "rating": "評分",
  "comment": "評論（選填）",
  "submit": "送出評價",
  "thanks": "感謝你的評價！",
  "error": "無法送出，請再試一次。"
}
```

- [ ] **Step 2: Create the review screen**

`src/app/booking/review/[id].tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useBooking } from '@/features/booking/useBooking';
import { useSubmitReview } from '@/features/booking/useSubmitReview';
import { useSession } from '@/features/auth/useSession';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { data: booking } = useBooking(id);
  const submit = useSubmitReview(id);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  async function send() {
    if (!booking) return;
    const amSeeker = booking.seeker_id === session?.user.id;
    const revieweeId = amSeeker ? booking.companion_id : booking.seeker_id;
    try {
      await submit.mutateAsync({ revieweeId, rating, comment });
      Alert.alert('PacerGo', t('review.thanks'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('review.error'));
    }
  }

  return (
    <ScreenContainer>
      <View className="gap-6 pt-6">
        <AppText variant="h1">{t('review.title')}</AppText>

        <View className="gap-2">
          <AppText variant="caption">{t('review.rating')}</AppText>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  n <= rating ? 'bg-brand-deep' : 'bg-dark-surface'
                }`}
              >
                <AppText className={n <= rating ? 'text-white' : 'text-dark-text'}>{n}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <TextInput
          placeholder={t('review.comment')}
          placeholderTextColor="#6B6B74"
          value={comment}
          onChangeText={setComment}
          multiline
          className="h-28 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <Button label={t('review.submit')} onPress={send} disabled={submit.isPending} />
      </View>
    </ScreenContainer>
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
git commit -m "feat(booking): review screen"
```

---

## Task 9: Wire the Request CTA + register routes

**Files:**
- Modify: `src/app/companion/[id].tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Enable the Request CTA in the companion detail**

In `src/app/companion/[id].tsx`, add the router import and replace the disabled "coming soon" button. Add near the other imports:

```tsx
import { useRouter } from 'expo-router';
```

In the component body, add `const router = useRouter();` after the existing hooks. Then replace this block:

```tsx
          <Button label={t('companion.comingSoon')} onPress={() => {}} disabled />
```

with:

```tsx
          <Button
            label={t('companion.request')}
            onPress={() => router.push(`/booking/request/${id}`)}
          />
```

- [ ] **Step 2: Register booking routes in `src/app/_layout.tsx`**

In the `Guarded` `<Stack>`, add after the `companion/[id]` screen:

```tsx
      <Stack.Screen name="booking/request/[companionId]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="booking/review/[id]" options={{ presentation: 'modal' }} />
```

- [ ] **Step 3: Verify types + bundle (regenerates typed routes)**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` passes; bundle prints `Exported:`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(booking): enable Request CTA + register booking routes"
```

---

## Task 10: Full verification + docs

**Files:** Modify `README.md`

- [ ] **Step 1: Add a Booking note to `README.md`** (after Discovery)

```markdown
## Booking (M3)

The booking loop: a seeker requests a session from a companion's detail screen
(choose offering, time, place), the companion accepts/declines, either party can
cancel or mark complete, and both can leave a review afterward. A guarded state
machine (`src/features/booking/stateMachine.ts`) decides which actions appear.
A DB trigger writes `notifications` rows on booking events, and a trigger
recomputes a companion's rating on review. Requires migration `0004_booking.sql`.
Expo push delivery and the in-app notification center come later (M5).
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```
Expected: all M0–M3 suites pass (adds stateMachine, categorizeBooking, useCreateBooking, StatusPill).

- [ ] **Step 3: Type-check + full bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` clean; bundle `Exported:`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: M3 booking notes"
```

---

## Done — M3 acceptance

- [ ] A seeker can request a session from a companion (offering + time + place), creating a `requested` booking.
- [ ] The Bookings tab sorts into Upcoming / Requests / Past via `categorizeBooking`.
- [ ] Booking detail shows the right actions per role/status from `availableActions`; accept/decline/cancel/complete update status.
- [ ] After completion, either party can submit a 1–5 review; a trigger recomputes the companion's rating.
- [ ] Booking events insert `notifications` rows (read surface is M5).
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live bookings require migrations `0001`–`0004` applied. Logic, SQL, screens, and components are built and unit/bundle-verified.

**Next milestone:** M4 — Companion mode + Chat (become-a-companion wizard, listing/availability editors, Tier A verification, realtime chat).
```
