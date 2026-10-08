# PacerGo M5 — Trust & Safety + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out v1 — report & block users (with block enforced in discovery), a safety center with meeting tips + share-session-details, an in-app notification center reading the `notifications` table, account deletion, and an empty/error-state pass.

**Architecture:** Migration `0007` adds `reports` + `blocks`, replaces `nearby_companions` to exclude blocked pairs (either direction), and adds a `delete_account()` SECURITY DEFINER RPC. Pure helpers (TDD): `reportSchema` (reason enum + zod) and `notificationLabel` (type → i18n key). Hooks cover report/block/unblock, notifications + mark-read, and account deletion. Screens: a report flow + block action on the companion detail, a safety center, a notification center, and account deletion in settings. A reusable `EmptyState` component standardizes empty/error surfaces.

**Tech Stack:** expo-router, Supabase (Postgres + RLS + RPC), React Native `Share`, TanStack Query, Zod, NativeWind, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M5** (screens 24–26 + system states). Completes v1 (M0–M5).

**Builds on:** M0–M4 (UI kit, SessionProvider, profile/discovery/booking hooks, `supabase`).

**Conventions:** commands from repo root; `@/` → `src/`; run jest **un-piped** when gating a commit; `npm run typecheck`; bundle via `npx expo export --platform ios --output-dir /tmp/pacergo-export` then delete. Jest mocks of `@/lib/supabase/client` use `__esModule: true` + inline `jest.fn()`s.

**Verification boundary:** live data requires migrations `0001`–`0007` applied. This plan verifies via unit/component tests, `tsc`, and a production bundle.

---

## File structure (M5)

```
supabase/migrations/0007_trust_safety.sql
src/features/safety/
  reportSchema.ts           # PURE (TDD)
  useReport.ts
  useBlocks.ts              # block/unblock/list
src/features/notifications/
  notificationLabel.ts      # PURE (TDD)
  useNotifications.ts       # list + mark read
src/features/account/
  useDeleteAccount.ts
src/components/ui/EmptyState.tsx
src/app/report/[id].tsx
src/app/safety.tsx
src/app/notifications.tsx
src/app/companion/[id].tsx   # MODIFY: report/block actions
src/app/booking/[id].tsx     # MODIFY: share details
src/app/settings.tsx         # MODIFY: notifications/safety/delete entries
src/app/_layout.tsx          # MODIFY: register routes
src/locales/*.json           # MODIFY
```

---

## Task 1: Branch + trust & safety migration

**Files:** Create `supabase/migrations/0007_trust_safety.sql`

- [ ] **Step 1: Branch**

```bash
git checkout main
git checkout -b feat/m5-trust-safety
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/0007_trust_safety.sql`:

```sql
create table if not exists blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  reported_id uuid not null references profiles (id) on delete cascade,
  booking_id uuid references bookings (id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'harassment', 'spam', 'safety', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table blocks enable row level security;
alter table reports enable row level security;

drop policy if exists "blocks owner manage" on blocks;
create policy "blocks owner manage" on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Reports: a user may file (reporter = caller); only admins (service role) read.
drop policy if exists "reports reporter insert" on reports;
create policy "reports reporter insert" on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- Replace nearby_companions to exclude blocked pairs (either direction).
create or replace function nearby_companions(
  center_lat double precision,
  center_lng double precision,
  radius_m double precision default 20000,
  filter_activity text default null,
  filter_tier tier_level default null,
  max_price int default null
)
returns table (
  companion_id uuid,
  display_name text,
  photo_url text,
  experience_level experience_level,
  home_area text,
  tier tier_level,
  activity_slug text,
  price_ntd int,
  is_free boolean,
  distance_m double precision
)
language sql security definer set search_path = public as $$
  select
    p.id, p.display_name, p.photo_url, p.experience_level, p.home_area,
    o.tier, a.slug, o.price_ntd, o.is_free,
    round(ST_Distance(p.location, ST_MakePoint(center_lng, center_lat)::geography)) as distance_m
  from companion_listings l
  join profiles p on p.id = l.profile_id
  join listing_offerings o on o.listing_id = l.id
  join activities a on a.id = o.activity_id
  where l.status = 'active'
    and p.location is not null
    and ST_DWithin(p.location, ST_MakePoint(center_lng, center_lat)::geography, radius_m)
    and (filter_activity is null or a.slug = filter_activity)
    and (filter_tier is null or o.tier = filter_tier)
    and (max_price is null or o.price_ntd <= max_price)
    and not exists (
      select 1 from blocks bl
      where (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
         or (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
    )
  order by distance_m asc
  limit 100;
$$;

grant execute on function nearby_companions to authenticated;

-- Account deletion: removes the auth user; FKs cascade to profile + all data.
create or replace function delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function delete_account to authenticated;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): reports + blocks, block-aware discovery, delete_account RPC (M5)"
```

---

## Task 2: Pure helpers (TDD)

**Files:**
- Create: `src/features/safety/reportSchema.ts`
- Create: `src/features/notifications/notificationLabel.ts`
- Test: `src/features/safety/__tests__/reportSchema.test.ts`
- Test: `src/features/notifications/__tests__/notificationLabel.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/features/safety/__tests__/reportSchema.test.ts`:

```ts
import { reportSchema, reportReasons } from '../reportSchema';

describe('reportSchema', () => {
  it('lists the supported reasons', () => {
    expect(reportReasons).toContain('harassment');
  });

  it('accepts a valid report', () => {
    expect(reportSchema.safeParse({ reason: 'spam', details: 'bot' }).success).toBe(true);
  });

  it('rejects an unknown reason', () => {
    expect(reportSchema.safeParse({ reason: 'nope', details: '' }).success).toBe(false);
  });
});
```

`src/features/notifications/__tests__/notificationLabel.test.ts`:

```ts
import { notificationLabelKey } from '../notificationLabel';

describe('notificationLabelKey', () => {
  it('maps a known type to its i18n key', () => {
    expect(notificationLabelKey('booking_requested')).toBe('notif.booking_requested');
  });

  it('falls back to a generic key for unknown types', () => {
    expect(notificationLabelKey('something_else')).toBe('notif.generic');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npm test -- "reportSchema|notificationLabel"
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/features/safety/reportSchema.ts`:

```ts
import { z } from 'zod';

export const reportReasons = ['inappropriate', 'harassment', 'spam', 'safety', 'other'] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().max(2000).optional().or(z.literal('')),
});
```

`src/features/notifications/notificationLabel.ts`:

```ts
const KNOWN = new Set([
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_completed',
]);

export function notificationLabelKey(type: string): string {
  return KNOWN.has(type) ? `notif.${type}` : 'notif.generic';
}
```

- [ ] **Step 4: Run them to verify they pass**

```bash
npm test -- "reportSchema|notificationLabel"
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(safety): report schema + notification label (pure)"
```

---

## Task 3: Hooks (report, block, notifications, delete account)

**Files:**
- Create: `src/features/safety/useReport.ts`
- Create: `src/features/safety/useBlocks.ts`
- Create: `src/features/notifications/useNotifications.ts`
- Create: `src/features/account/useDeleteAccount.ts`
- Test: `src/features/safety/__tests__/useBlocks.test.tsx`

- [ ] **Step 1: Write the failing test for `useBlocks`**

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

import { useBlock } from '../useBlocks';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBlock', () => {
  it('inserts a block row from the current user', async () => {
    const { result } = renderHook(() => useBlock(), { wrapper });
    result.current.mutate('other');
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ blocker_id: 'me', blocked_id: 'other' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- useBlocks
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hooks**

`src/features/safety/useReport.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { ReportReason } from './reportSchema';

export function useReport() {
  const { session } = useSession();
  return useMutation({
    mutationFn: async ({
      reportedId,
      reason,
      details,
      bookingId,
    }: {
      reportedId: string;
      reason: ReportReason;
      details?: string;
      bookingId?: string | null;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session?.user.id,
        reported_id: reportedId,
        reason,
        details: details || null,
        booking_id: bookingId ?? null,
      });
      if (error) throw error;
    },
  });
}
```

`src/features/safety/useBlocks.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useBlockedIds() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['blocks', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', uid);
      if (error) throw error;
      return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
    },
  });
}

export function useBlock() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: uid, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks', uid] });
      qc.invalidateQueries({ queryKey: ['nearby'] });
    },
  });
}

export function useUnblock() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', uid)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks', uid] }),
  });
}
```

`src/features/notifications/useNotifications.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type AppNotification = {
  id: string;
  type: string;
  payload: { booking_id?: string; status?: string };
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['notifications', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, payload, read_at, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', uid)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', uid] }),
  });
}
```

`src/features/account/useDeleteAccount.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;
      await supabase.auth.signOut();
    },
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- useBlocks
```
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(safety): report/block/notifications/delete-account hooks"
```

---

## Task 4: Report screen + block action on companion detail

**Files:**
- Create: `src/app/report/[id].tsx`
- Modify: `src/app/companion/[id].tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add safety strings to both locale files**

`src/locales/en.json` add top-level:

```json
"safety": {
  "report": "Report",
  "block": "Block",
  "blocked": "Blocked",
  "reportTitle": "Report this person",
  "reason_inappropriate": "Inappropriate content",
  "reason_harassment": "Harassment",
  "reason_spam": "Spam",
  "reason_safety": "Safety concern",
  "reason_other": "Other",
  "details": "Details (optional)",
  "submit": "Submit report",
  "reported": "Thanks — our team will review this.",
  "blockConfirm": "Block this person? They won't appear in discovery and can't message you.",
  "error": "Something went wrong. Try again.",
  "centerTitle": "Safety center",
  "tipsTitle": "Meeting safely",
  "tip1": "Meet in a public gym or busy place for the first session.",
  "tip2": "Tell a friend where you're going and who you're meeting.",
  "tip3": "Trust your instincts — leave if anything feels off.",
  "sharePlans": "Share my session details"
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"safety": {
  "report": "檢舉",
  "block": "封鎖",
  "blocked": "已封鎖",
  "reportTitle": "檢舉這個人",
  "reason_inappropriate": "不當內容",
  "reason_harassment": "騷擾",
  "reason_spam": "垃圾訊息",
  "reason_safety": "安全疑慮",
  "reason_other": "其他",
  "details": "詳細說明（選填）",
  "submit": "送出檢舉",
  "reported": "謝謝你，我們的團隊會進行審查。",
  "blockConfirm": "要封鎖這個人嗎？他們不會出現在探索中，也無法傳訊息給你。",
  "error": "發生錯誤，請再試一次。",
  "centerTitle": "安全中心",
  "tipsTitle": "安全會面",
  "tip1": "第一次見面選在公共健身房或人多的地方。",
  "tip2": "告訴朋友你要去哪裡、和誰見面。",
  "tip3": "相信你的直覺——如果感覺不對就離開。",
  "sharePlans": "分享我的課程資訊"
}
```

- [ ] **Step 2: Create the report screen**

`src/app/report/[id].tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { reportReasons, type ReportReason } from '@/features/safety/reportSchema';
import { useReport } from '@/features/safety/useReport';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');

  async function submit() {
    try {
      await report.mutateAsync({ reportedId: id, reason, details });
      Alert.alert('PacerGo', t('safety.reported'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('safety.error'));
    }
  }

  return (
    <ScreenContainer>
      <View className="gap-4 pt-6">
        <AppText variant="h1">{t('safety.reportTitle')}</AppText>
        {reportReasons.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            className={`rounded-lg p-4 ${reason === r ? 'bg-brand-deep' : 'bg-dark-surface'}`}
          >
            <AppText className={reason === r ? 'text-white' : 'text-dark-text'}>
              {t(`safety.reason_${r}`)}
            </AppText>
          </Pressable>
        ))}
        <TextInput
          placeholder={t('safety.details')}
          placeholderTextColor="#6B6B74"
          value={details}
          onChangeText={setDetails}
          multiline
          className="h-24 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <Button label={t('safety.submit')} onPress={submit} disabled={report.isPending} />
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Add report/block actions to the companion detail**

In `src/app/companion/[id].tsx`, add imports:

```tsx
import { Alert } from 'react-native';
import { useBlock } from '@/features/safety/useBlocks';
```

Add `const block = useBlock();` after the existing hooks. Then, inside the final actions `View` (after the disabled/Request button), add:

```tsx
          <Button
            label={t('safety.report')}
            variant="ghost"
            onPress={() => router.push(`/report/${id}`)}
          />
          <Button
            label={t('safety.block')}
            variant="ghost"
            onPress={() =>
              Alert.alert('PacerGo', t('safety.blockConfirm'), [
                { text: t('bookingDetail.cancel'), style: 'cancel' },
                {
                  text: t('safety.block'),
                  style: 'destructive',
                  onPress: () => {
                    block.mutate(id);
                    router.back();
                  },
                },
              ])
            }
          />
```

- [ ] **Step 4: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(safety): report screen + block action"
```

---

## Task 5: Safety center + share session details

**Files:**
- Create: `src/app/safety.tsx`
- Modify: `src/app/booking/[id].tsx`

- [ ] **Step 1: Create the safety center**

`src/app/safety.tsx`:

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';

export default function SafetyCenter() {
  const { t } = useTranslation();
  const tips = [t('safety.tip1'), t('safety.tip2'), t('safety.tip3')];
  return (
    <ScreenContainer>
      <View className="gap-4 pt-6">
        <AppText variant="h1">{t('safety.centerTitle')}</AppText>
        <AppText variant="h3">{t('safety.tipsTitle')}</AppText>
        {tips.map((tip, i) => (
          <View key={i} className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{tip}</AppText>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Add "Share details" to the booking detail**

In `src/app/booking/[id].tsx`, add to the imports:

```tsx
import { Share } from 'react-native';
```

Add this function in the component (after `openChat`):

```tsx
  async function shareDetails() {
    if (!booking) return;
    await Share.share({
      message: `PacerGo session with ${name ?? ''} — ${booking.scheduled_start ?? ''} at ${
        booking.location_name ?? ''
      }`,
    });
  }
```

Then add the button in the actions `View` (after the Message button):

```tsx
          <Button label={t('safety.sharePlans')} variant="ghost" onPress={shareDetails} />
```

- [ ] **Step 3: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(safety): safety center + share session details"
```

---

## Task 6: Notification center

**Files:**
- Create: `src/app/notifications.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add notification strings to both locale files**

`src/locales/en.json` add top-level:

```json
"notif": {
  "title": "Notifications",
  "empty": "No notifications yet.",
  "generic": "Update",
  "booking_requested": "New session request",
  "booking_accepted": "Your session was accepted",
  "booking_declined": "Your request was declined",
  "booking_cancelled": "A session was cancelled",
  "booking_completed": "A session was completed"
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"notif": {
  "title": "通知",
  "empty": "目前沒有通知。",
  "generic": "更新",
  "booking_requested": "新的課程邀請",
  "booking_accepted": "你的課程已被接受",
  "booking_declined": "你的邀請被婉拒",
  "booking_cancelled": "有一堂課程被取消",
  "booking_completed": "有一堂課程已完成"
}
```

- [ ] **Step 2: Create the notification center**

`src/app/notifications.tsx`:

```tsx
import { useEffect } from 'react';
import { FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotifications, useMarkNotificationsRead } from '@/features/notifications/useNotifications';
import { notificationLabelKey } from '@/features/notifications/notificationLabel';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if ((data ?? []).some((n) => !n.read_at)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('notif.title')}
      </AppText>
      <FlatList
        data={data ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => item.payload.booking_id && router.push(`/booking/${item.payload.booking_id}`)}
            className={`mb-2 rounded-lg p-4 ${item.read_at ? 'bg-dark-surface' : 'bg-dark-elevated'}`}
          >
            <AppText variant="body">{t(notificationLabelKey(item.type))}</AppText>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState message={t('notif.empty')} />}
      />
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
git commit -m "feat(notifications): in-app notification center"
```

---

## Task 7: EmptyState component + settings (notifications/safety/delete)

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Test: `src/components/ui/__tests__/EmptyState.test.tsx`
- Modify: `src/app/settings.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Write the failing test for `EmptyState`**

```tsx
import { render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the message', () => {
    const { getByText } = render(<EmptyState message="Nothing here" />);
    expect(getByText('Nothing here')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- EmptyState
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `EmptyState`**

```tsx
import { View } from 'react-native';
import { AppText } from './AppText';

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <AppText variant="caption" className="text-center">
        {message}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- EmptyState
```
Expected: PASS (1 test).

- [ ] **Step 5: Add settings strings to both locale files**

`src/locales/en.json` — in `"settings"` add:

```json
"notifications": "Notifications",
"safety": "Safety center",
"deleteAccount": "Delete account",
"deleteConfirm": "Permanently delete your account and all data? This can't be undone.",
"deleteError": "Couldn't delete the account. Try again."
```

`src/locales/zh-Hant.json` — in `"settings"` add:

```json
"notifications": "通知",
"safety": "安全中心",
"deleteAccount": "刪除帳號",
"deleteConfirm": "永久刪除你的帳號和所有資料？此操作無法復原。",
"deleteError": "無法刪除帳號，請再試一次。"
```

- [ ] **Step 6: Add entries to the settings screen**

In `src/app/settings.tsx`, add imports:

```tsx
import { Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeleteAccount } from '@/features/account/useDeleteAccount';
```

(Merge `Pressable`/`Alert` into the existing `react-native` import.) Add inside the component:

```tsx
  const router = useRouter();
  const del = useDeleteAccount();

  function confirmDelete() {
    Alert.alert('PacerGo', t('settings.deleteConfirm'), [
      { text: t('bookingDetail.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync();
          } catch {
            Alert.alert('PacerGo', t('settings.deleteError'));
          }
        },
      },
    ]);
  }
```

Then, just above the sign-out button's wrapping `View`, add:

```tsx
        <Pressable onPress={() => router.push('/notifications')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('settings.notifications')}</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/safety')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('settings.safety')}</AppText>
        </Pressable>
        <Pressable onPress={confirmDelete} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body" className="text-danger">
            {t('settings.deleteAccount')}
          </AppText>
        </Pressable>
```

- [ ] **Step 7: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(account): EmptyState + settings (notifications/safety/delete)"
```

---

## Task 8: Register routes + full verification + docs

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `README.md`

- [ ] **Step 1: Register routes in `src/app/_layout.tsx`**

In the `Guarded` `<Stack>`, add after the `chat/[id]` screen:

```tsx
      <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="safety" />
      <Stack.Screen name="notifications" />
```

- [ ] **Step 2: Add a Trust & safety note to `README.md`** (after Chat)

```markdown
## Trust & safety (M5)

Report and block users (block is enforced in the `nearby_companions` RPC, both
directions), a safety center with meeting tips + native share-session-details, an
in-app notification center reading the `notifications` table (written by booking
triggers since M3), and account deletion via a `delete_account()` SECURITY DEFINER
RPC (cascades through FKs). Requires migration `0007_trust_safety.sql`. This
completes v1 (M0–M5).
```

- [ ] **Step 3: Run the full test suite (un-piped)**

```bash
npm test
```
Expected: all M0–M5 suites pass (adds reportSchema, notificationLabel, useBlocks, EmptyState).

- [ ] **Step 4: Type-check + full bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` clean; bundle `Exported:`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: M5 trust & safety notes"
```

---

## Done — M5 acceptance (v1 complete)

- [ ] Report flow files a `reports` row with a valid reason; block files a `blocks` row.
- [ ] Blocked users disappear from discovery (RPC excludes both directions).
- [ ] Safety center shows meeting tips; a booking can share its details via the native share sheet.
- [ ] Notification center lists `notifications`, marks them read on view, and deep-links to the booking.
- [ ] Settings can delete the account (RPC + sign-out) after confirmation.
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live behaviour requires migrations `0001`–`0007` applied. Logic, SQL, screens, hooks are built and unit/bundle-verified.

**v1 (M0–M5) is feature-complete.** Post-v1 is **M6** — in-app payments + PacerGo commission, enabling the Running/Hiking activities, and LINE + phone-OTP auth.
```
