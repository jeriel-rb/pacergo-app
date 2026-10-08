# PacerGo M4a — Companion Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user opt in as a companion — create/edit a listing with activity+tier+price offerings, set weekly availability, submit Tier A verification, and manage incoming requests from a companion dashboard.

**Architecture:** Migration `0005` adds `availability`, `availability_blocks`, `verifications`, and `verification-docs` storage policies (`companion_listings`/`listing_offerings` already exist from M2). A pure `validateOffering` (TDD) enforces tier/price rules (only Tier C may be free; A/B must be paid). Hooks manage the current user's listing, offerings, availability, and verification. A become-a-companion wizard creates the listing + offerings and flips `profiles.is_companion`. A companion dashboard reuses `useBookings` filtered to the companion role. Verification uploads a doc to the private `verification-docs` bucket and inserts a `verifications` row (admin review is out-of-app).

**Tech Stack:** expo-router, Supabase (Postgres + RLS + Storage), expo-image-picker, TanStack Query, Zod, NativeWind, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M4** companion side (screens 17–21). Chat (screens 15–16) is M4b.

**Builds on:** M0–M3 (UI kit, SessionProvider, profile/discovery/booking hooks, `useActivities`, `useBookings`).

**Conventions:** commands from repo root; `@/` → `src/`; run jest **un-piped** when gating a commit (a `jest | tail` pipeline masks jest's exit code); `npm run typecheck`; bundle via `npx expo export --platform ios --output-dir /tmp/pacergo-export` then delete. Jest mocks of `@/lib/supabase/client` use `__esModule: true` + inline `jest.fn()`s.

**Verification boundary:** live data requires migrations `0001`–`0005` applied. This plan verifies via unit/component tests, `tsc`, and a production bundle.

---

## File structure (M4a)

```
supabase/migrations/0005_companion.sql
src/features/companion/
  validateOffering.ts          # PURE (TDD)
  types.ts
  useMyListing.ts              # own listing + offerings
  useSaveListing.ts            # upsert listing + set is_companion
  useSaveOfferings.ts          # replace offerings
  useAvailability.ts           # list + replace weekly slots
  useVerification.ts           # submit + read own verification
  companionStore.ts            # wizard draft (Zustand)
src/app/companion-setup.tsx    # become-a-companion wizard
src/app/companion-dashboard.tsx
src/app/listing-editor.tsx
src/app/availability-editor.tsx
src/app/verification.tsx
src/app/_layout.tsx            # MODIFY: register routes
src/app/(tabs)/profile.tsx     # MODIFY: entry to companion setup/dashboard
src/locales/*.json             # MODIFY
```

---

## Task 1: Branch + companion migration

**Files:** Create `supabase/migrations/0005_companion.sql`

- [ ] **Step 1: Branch**

```bash
git checkout main
git checkout -b feat/m4a-companion-mode
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/0005_companion.sql`:

```sql
-- Weekly recurring availability slots (minutes from midnight, local intent).
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists availability_profile_idx on availability (profile_id);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  blocked_date date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, blocked_date)
);

-- Tier A verification documents (metadata; files live in the private bucket).
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  doc_type text not null check (doc_type in ('certification', 'id')),
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verifications_profile_idx on verifications (profile_id);

-- RLS
alter table availability enable row level security;
alter table availability_blocks enable row level security;
alter table verifications enable row level security;

-- Availability is public (seekers see when a companion is free); owner writes.
drop policy if exists "availability readable" on availability;
create policy "availability readable" on availability for select to authenticated using (true);
drop policy if exists "availability owner insert" on availability;
create policy "availability owner insert" on availability for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists "availability owner delete" on availability;
create policy "availability owner delete" on availability for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists "blocks owner manage" on availability_blocks;
create policy "blocks owner manage" on availability_blocks for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Verifications: owner reads/inserts own; status changes are admin-only
-- (service role), so there is no UPDATE policy for authenticated.
drop policy if exists "verifications owner read" on verifications;
create policy "verifications owner read" on verifications for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists "verifications owner insert" on verifications;
create policy "verifications owner insert" on verifications for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');

-- Storage: owner-only access to their own folder in verification-docs.
drop policy if exists "verif docs owner insert" on storage.objects;
create policy "verif docs owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "verif docs owner read" on storage.objects;
create policy "verif docs owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): companion availability + verifications + storage policies (M4a)"
```

---

## Task 2: validateOffering (pure, TDD)

**Files:**
- Create: `src/features/companion/validateOffering.ts`
- Test: `src/features/companion/__tests__/validateOffering.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { validateOffering } from '../validateOffering';

describe('validateOffering', () => {
  it('accepts a paid Tier A offering', () => {
    expect(validateOffering({ tier: 'A', priceNtd: 1200, isFree: false }).ok).toBe(true);
  });

  it('rejects a free Tier A offering (only buddies may be free)', () => {
    const r = validateOffering({ tier: 'A', priceNtd: 0, isFree: true });
    expect(r.ok).toBe(false);
  });

  it('accepts a free Tier C offering', () => {
    expect(validateOffering({ tier: 'C', priceNtd: 0, isFree: true }).ok).toBe(true);
  });

  it('rejects a paid offering with a zero price', () => {
    expect(validateOffering({ tier: 'B', priceNtd: 0, isFree: false }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- validateOffering
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { Tier } from '@/features/discovery/types';

export type OfferingInput = { tier: Tier; priceNtd: number; isFree: boolean };
export type OfferingValidation = { ok: boolean; error?: string };

export function validateOffering(input: OfferingInput): OfferingValidation {
  if (input.isFree) {
    if (input.tier !== 'C') return { ok: false, error: 'only_tier_c_free' };
    return { ok: true };
  }
  if (input.priceNtd <= 0) return { ok: false, error: 'price_required' };
  return { ok: true };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- validateOffering
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(companion): offering validation (pure)"
```

---

## Task 3: Companion types + data hooks

**Files:**
- Create: `src/features/companion/types.ts`
- Create: `src/features/companion/useMyListing.ts`
- Create: `src/features/companion/useSaveListing.ts`
- Create: `src/features/companion/useSaveOfferings.ts`
- Create: `src/features/companion/useAvailability.ts`
- Create: `src/features/companion/useVerification.ts`
- Create: `src/features/companion/companionStore.ts`
- Test: `src/features/companion/__tests__/useSaveListing.test.tsx`

- [ ] **Step 1: Create `types.ts`**

```ts
import type { Tier } from '@/features/discovery/types';

export type Listing = {
  id: string;
  profile_id: string;
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
  rating_avg: number;
  rating_count: number;
};

export type OfferingDraft = {
  activity_id: string;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
};

export type AvailabilitySlot = {
  id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export type Verification = {
  id: string;
  doc_type: 'certification' | 'id';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
```

- [ ] **Step 2: Write the failing test for `useSaveListing`**

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockListingUpsert = jest.fn().mockResolvedValue({ data: { id: 'l1' }, error: null });
const mockProfileUpdate = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'companion_listings') {
        return {
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({ single: mockListingUpsert })),
          })),
        };
      }
      return { update: jest.fn(() => ({ eq: mockProfileUpdate })) };
    }),
  },
}));
jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'me' } }, loading: false }),
}));

import { useSaveListing } from '../useSaveListing';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSaveListing', () => {
  it('upserts the listing and flags the profile as a companion', async () => {
    const { result } = renderHook(() => useSaveListing(), { wrapper });
    result.current.mutate({ headline: 'Coach', bio_long: null, served_area: 'Da’an', status: 'active' });
    await waitFor(() => expect(mockProfileUpdate).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- useSaveListing
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the hooks**

`src/features/companion/useMyListing.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Listing } from './types';
import type { Offering } from '@/features/discovery/useCompanion';

export function useMyListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['myListing', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<{ listing: Listing | null; offerings: Offering[] }> => {
      const { data: listing, error } = await supabase
        .from('companion_listings')
        .select('*')
        .eq('profile_id', uid)
        .maybeSingle();
      if (error) throw error;
      let offerings: Offering[] = [];
      if (listing?.id) {
        const { data: offs, error: e2 } = await supabase
          .from('listing_offerings')
          .select('id, activity_id, tier, price_ntd, is_free, session_minutes, description')
          .eq('listing_id', listing.id);
        if (e2) throw e2;
        offerings = (offs ?? []) as Offering[];
      }
      return { listing: (listing ?? null) as Listing | null, offerings };
    },
  });
}
```

`src/features/companion/useSaveListing.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type ListingPatch = {
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
};

export function useSaveListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ListingPatch): Promise<string> => {
      const { data, error } = await supabase
        .from('companion_listings')
        .upsert({ profile_id: uid, ...patch }, { onConflict: 'profile_id' })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from('profiles')
        .update({ is_companion: true })
        .eq('id', uid);
      if (e2) throw e2;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myListing', uid] });
      qc.invalidateQueries({ queryKey: ['profile', uid] });
    },
  });
}
```

`src/features/companion/useSaveOfferings.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { OfferingDraft } from './types';

export function useSaveOfferings() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, offerings }: { listingId: string; offerings: OfferingDraft[] }) => {
      const { error: del } = await supabase
        .from('listing_offerings')
        .delete()
        .eq('listing_id', listingId);
      if (del) throw del;
      if (offerings.length > 0) {
        const { error } = await supabase
          .from('listing_offerings')
          .insert(offerings.map((o) => ({ ...o, listing_id: listingId })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myListing', uid] }),
  });
}
```

`src/features/companion/useAvailability.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { AvailabilitySlot } from './types';

export function useAvailability() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['availability', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      const { data, error } = await supabase
        .from('availability')
        .select('id, weekday, start_minute, end_minute')
        .eq('profile_id', uid)
        .order('weekday');
      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
  });
}

export function useSaveAvailability() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots: { weekday: number; start_minute: number; end_minute: number }[]) => {
      const { error: del } = await supabase.from('availability').delete().eq('profile_id', uid);
      if (del) throw del;
      if (slots.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(slots.map((s) => ({ ...s, profile_id: uid })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', uid] }),
  });
}
```

`src/features/companion/useVerification.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Verification } from './types';

export function useMyVerification() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['verification', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Verification | null> => {
      const { data, error } = await supabase
        .from('verifications')
        .select('id, doc_type, status, created_at')
        .eq('profile_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Verification | null;
    },
  });
}

export function useSubmitVerification() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docType,
      fileUri,
    }: {
      docType: 'certification' | 'id';
      fileUri: string;
    }) => {
      const path = `${uid}/${Date.now()}.jpg`;
      const res = await fetch(fileUri);
      const blob = await res.arrayBuffer();
      const { error: up } = await supabase.storage
        .from('verification-docs')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (up) throw up;
      const { error } = await supabase
        .from('verifications')
        .insert({ profile_id: uid, doc_type: docType, document_path: path, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification', uid] }),
  });
}
```

`src/features/companion/companionStore.ts`:

```ts
import { create } from 'zustand';
import type { OfferingDraft } from './types';

type CompanionState = {
  headline: string;
  servedArea: string;
  offerings: OfferingDraft[];
  setField: (k: 'headline' | 'servedArea', v: string) => void;
  addOffering: (o: OfferingDraft) => void;
  removeOffering: (index: number) => void;
  reset: () => void;
};

const initial = { headline: '', servedArea: '', offerings: [] as OfferingDraft[] };

export const useCompanionStore = create<CompanionState>((set) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as Partial<CompanionState>),
  addOffering: (o) => set((s) => ({ offerings: [...s.offerings, o] })),
  removeOffering: (index) => set((s) => ({ offerings: s.offerings.filter((_, i) => i !== index) })),
  reset: () => set({ ...initial }),
}));
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- useSaveListing
```
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(companion): listing/offerings/availability/verification hooks + store"
```

---

## Task 4: Become-a-companion wizard

**Files:**
- Create: `src/app/companion-setup.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add companion strings to both locale files**

`src/locales/en.json` add top-level:

```json
"companionSetup": {
  "title": "Become a companion",
  "headline": "Headline (e.g. Certified strength coach)",
  "area": "Your area (e.g. Da’an, Taipei)",
  "addOffering": "Add a session type",
  "tier": "Tier",
  "minutes": "Minutes",
  "price": "Price (NTD)",
  "free": "Free",
  "add": "Add",
  "finish": "Publish listing",
  "needOffering": "Add at least one session type.",
  "invalidOffering": "Only Tier C can be free; A and B need a price.",
  "saved": "Your listing is live!",
  "error": "Couldn't save. Try again."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"companionSetup": {
  "title": "成為夥伴",
  "headline": "標題（例如：認證重訓教練）",
  "area": "你的地區（例如：台北大安）",
  "addOffering": "新增課程類型",
  "tier": "等級",
  "minutes": "分鐘",
  "price": "價格（NTD）",
  "free": "免費",
  "add": "新增",
  "finish": "發佈檔案",
  "needOffering": "請至少新增一種課程類型。",
  "invalidOffering": "只有 C 級可以免費；A、B 級需要設定價格。",
  "saved": "你的檔案已上線！",
  "error": "無法儲存，請再試一次。"
}
```

- [ ] **Step 2: Create the wizard**

`src/app/companion-setup.tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { useActivities } from '@/features/profile/useActivities';
import { useSaveListing } from '@/features/companion/useSaveListing';
import { useSaveOfferings } from '@/features/companion/useSaveOfferings';
import { useCompanionStore } from '@/features/companion/companionStore';
import { validateOffering } from '@/features/companion/validateOffering';
import type { Tier } from '@/features/discovery/types';

const TIERS: Tier[] = ['A', 'B', 'C'];

export default function CompanionSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const activities = useActivities();
  const store = useCompanionStore();
  const saveListing = useSaveListing();
  const saveOfferings = useSaveOfferings();

  const [activityId, setActivityId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('B');
  const [minutes, setMinutes] = useState('60');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);

  function addOffering() {
    const aId = activityId ?? activities.data?.[0]?.id;
    if (!aId) return;
    const draft = {
      activity_id: aId,
      tier,
      price_ntd: isFree ? 0 : Number(price) || 0,
      is_free: isFree,
      session_minutes: Number(minutes) || 60,
    };
    const v = validateOffering({ tier: draft.tier, priceNtd: draft.price_ntd, isFree: draft.is_free });
    if (!v.ok) {
      Alert.alert('PacerGo', t('companionSetup.invalidOffering'));
      return;
    }
    store.addOffering(draft);
    setPrice('');
  }

  async function finish() {
    if (store.offerings.length === 0) {
      Alert.alert('PacerGo', t('companionSetup.needOffering'));
      return;
    }
    try {
      const listingId = await saveListing.mutateAsync({
        headline: store.headline || null,
        bio_long: null,
        served_area: store.servedArea || null,
        status: 'active',
      });
      await saveOfferings.mutateAsync({ listingId, offerings: store.offerings });
      store.reset();
      Alert.alert('PacerGo', t('companionSetup.saved'));
      router.replace('/companion-dashboard');
    } catch {
      Alert.alert('PacerGo', t('companionSetup.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('companionSetup.title')}</AppText>

        <TextInput
          placeholder={t('companionSetup.headline')}
          placeholderTextColor="#6B6B74"
          value={store.headline}
          onChangeText={(v) => store.setField('headline', v)}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('companionSetup.area')}
          placeholderTextColor="#6B6B74"
          value={store.servedArea}
          onChangeText={(v) => store.setField('servedArea', v)}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <AppText variant="h3">{t('companionSetup.addOffering')}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {(activities.data ?? []).map((a) => {
            const active = (activityId ?? activities.data?.[0]?.id) === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivityId(a.id)}
                className={`rounded-md px-3 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`}
              >
                <AppText className={active ? 'text-white' : 'text-dark-text'}>{a.name_en}</AppText>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row gap-2">
          {TIERS.map((tt) => (
            <Pressable
              key={tt}
              onPress={() => setTier(tt)}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                tier === tt ? 'bg-brand-deep' : 'bg-dark-surface'
              }`}
            >
              <AppText className={tier === tt ? 'text-white' : 'text-dark-text'}>{tt}</AppText>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center justify-between rounded-md bg-dark-surface px-4 py-3">
          <AppText variant="body">{t('companionSetup.free')}</AppText>
          <Switch value={isFree} onValueChange={setIsFree} />
        </View>
        <TextInput
          placeholder={t('companionSetup.minutes')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={minutes}
          onChangeText={setMinutes}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        {!isFree ? (
          <TextInput
            placeholder={t('companionSetup.price')}
            placeholderTextColor="#6B6B74"
            keyboardType="number-pad"
            value={price}
            onChangeText={setPrice}
            className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
          />
        ) : null}
        <Button label={t('companionSetup.add')} variant="secondary" onPress={addOffering} />

        {store.offerings.map((o, i) => (
          <Pressable
            key={i}
            onPress={() => store.removeOffering(i)}
            className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4"
          >
            <View className="flex-row items-center gap-2">
              <TierBadge tier={o.tier} />
              <AppText variant="body">
                {o.session_minutes} min · {o.is_free ? t('companionSetup.free') : `NT$${o.price_ntd}`}
              </AppText>
            </View>
            <AppText variant="caption">✕</AppText>
          </Pressable>
        ))}

        <Button label={t('companionSetup.finish')} onPress={finish} disabled={saveListing.isPending} />
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
git commit -m "feat(companion): become-a-companion wizard"
```

---

## Task 5: Companion dashboard

**Files:**
- Create: `src/app/companion-dashboard.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add dashboard strings to both locale files**

`src/locales/en.json` add top-level:

```json
"dashboard": {
  "title": "Companion dashboard",
  "requests": "Incoming requests",
  "upcoming": "Upcoming sessions",
  "earnings": "Earnings",
  "earningsPlaceholder": "Payments arrive in a later update.",
  "editListing": "Edit listing",
  "editAvailability": "Edit availability",
  "verify": "Get verified (Tier A)",
  "none": "Nothing yet."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"dashboard": {
  "title": "夥伴中心",
  "requests": "收到的邀請",
  "upcoming": "即將到來的課程",
  "earnings": "收入",
  "earningsPlaceholder": "付款功能將於後續更新推出。",
  "editListing": "編輯檔案",
  "editAvailability": "編輯可預約時間",
  "verify": "申請認證（A 級）",
  "none": "目前沒有內容。"
}
```

- [ ] **Step 2: Create the dashboard**

`src/app/companion-dashboard.tsx`:

```tsx
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBookings } from '@/features/booking/useBookings';
import { useSession } from '@/features/auth/useSession';

export default function CompanionDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data } = useBookings();

  const asCompanion = (data ?? []).filter((b) => b.companion_id === uid);
  const requests = asCompanion.filter((b) => b.status === 'requested');
  const upcoming = asCompanion.filter((b) => b.status === 'accepted');

  const row = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} className="rounded-lg bg-dark-surface p-4">
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('dashboard.title')}</AppText>

        <AppText variant="h3">{t('dashboard.requests')}</AppText>
        {requests.length === 0 ? (
          <AppText variant="caption">{t('dashboard.none')}</AppText>
        ) : (
          requests.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}`)}
              className="flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={b.seeker_name ?? ''} photoUrl={b.seeker_photo} size={44} />
              <View className="flex-1">
                <AppText variant="body">{b.seeker_name ?? ''}</AppText>
              </View>
              <StatusPill status={b.status} />
            </Pressable>
          ))
        )}

        <AppText variant="h3">{t('dashboard.upcoming')}</AppText>
        {upcoming.length === 0 ? (
          <AppText variant="caption">{t('dashboard.none')}</AppText>
        ) : (
          upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}`)}
              className="flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={b.seeker_name ?? ''} photoUrl={b.seeker_photo} size={44} />
              <AppText variant="body" className="flex-1">{b.seeker_name ?? ''}</AppText>
              <StatusPill status={b.status} />
            </Pressable>
          ))
        )}

        <View className="rounded-lg bg-dark-surface p-4">
          <AppText variant="caption">{t('dashboard.earnings')}</AppText>
          <AppText variant="body">{t('dashboard.earningsPlaceholder')}</AppText>
        </View>

        {row(t('dashboard.editListing'), () => router.push('/listing-editor'))}
        {row(t('dashboard.editAvailability'), () => router.push('/availability-editor'))}
        {row(t('dashboard.verify'), () => router.push('/verification'))}
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
git commit -m "feat(companion): companion dashboard"
```

---

## Task 6: Listing + availability editors

**Files:**
- Create: `src/app/listing-editor.tsx`
- Create: `src/app/availability-editor.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add editor strings to both locale files**

`src/locales/en.json` add top-level:

```json
"editor": {
  "listingTitle": "Edit listing",
  "headline": "Headline",
  "bio": "About you",
  "area": "Area",
  "status": "Status",
  "active": "Active",
  "paused": "Paused",
  "save": "Save",
  "saved": "Saved",
  "availabilityTitle": "Weekly availability",
  "addSlot": "Add slot",
  "day": "Day (0=Sun … 6=Sat)",
  "startHour": "Start hour (0–23)",
  "endHour": "End hour (1–24)",
  "error": "Couldn't save. Try again."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"editor": {
  "listingTitle": "編輯檔案",
  "headline": "標題",
  "bio": "關於你",
  "area": "地區",
  "status": "狀態",
  "active": "上線",
  "paused": "暫停",
  "save": "儲存",
  "saved": "已儲存",
  "availabilityTitle": "每週可預約時間",
  "addSlot": "新增時段",
  "day": "星期（0=日 … 6=六）",
  "startHour": "開始時（0–23）",
  "endHour": "結束時（1–24）",
  "error": "無法儲存，請再試一次。"
}
```

- [ ] **Step 2: Create the listing editor**

`src/app/listing-editor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, TextInput, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useMyListing } from '@/features/companion/useMyListing';
import { useSaveListing } from '@/features/companion/useSaveListing';

export default function ListingEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useMyListing();
  const save = useSaveListing();

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  useEffect(() => {
    if (data?.listing) {
      setHeadline(data.listing.headline ?? '');
      setBio(data.listing.bio_long ?? '');
      setArea(data.listing.served_area ?? '');
      setStatus(data.listing.status === 'paused' ? 'paused' : 'active');
    }
  }, [data?.listing]);

  async function onSave() {
    try {
      await save.mutateAsync({
        headline: headline || null,
        bio_long: bio || null,
        served_area: area || null,
        status,
      });
      Alert.alert('PacerGo', t('editor.saved'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('editor.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('editor.listingTitle')}</AppText>
        <TextInput
          placeholder={t('editor.headline')}
          placeholderTextColor="#6B6B74"
          value={headline}
          onChangeText={setHeadline}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.bio')}
          placeholderTextColor="#6B6B74"
          value={bio}
          onChangeText={setBio}
          multiline
          className="h-28 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.area')}
          placeholderTextColor="#6B6B74"
          value={area}
          onChangeText={setArea}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <AppText variant="caption">{t('editor.status')}</AppText>
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: t('editor.active') },
            { value: 'paused', label: t('editor.paused') },
          ]}
        />
        <Button label={t('editor.save')} onPress={onSave} disabled={save.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Create the availability editor**

`src/app/availability-editor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAvailability, useSaveAvailability } from '@/features/companion/useAvailability';

type Slot = { weekday: number; start_minute: number; end_minute: number };

export default function AvailabilityEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useAvailability();
  const save = useSaveAvailability();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState('1');
  const [startH, setStartH] = useState('18');
  const [endH, setEndH] = useState('20');

  useEffect(() => {
    if (data) {
      setSlots(data.map((s) => ({ weekday: s.weekday, start_minute: s.start_minute, end_minute: s.end_minute })));
    }
  }, [data]);

  function add() {
    const wd = Math.max(0, Math.min(6, Number(day) || 0));
    const sm = (Math.max(0, Math.min(23, Number(startH) || 0))) * 60;
    const em = (Math.max(1, Math.min(24, Number(endH) || 1))) * 60;
    if (em <= sm) return;
    setSlots((prev) => [...prev, { weekday: wd, start_minute: sm, end_minute: em }]);
  }

  async function onSave() {
    try {
      await save.mutateAsync(slots);
      Alert.alert('PacerGo', t('editor.saved'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('editor.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 12 }}>
        <AppText variant="h1">{t('editor.availabilityTitle')}</AppText>
        <TextInput placeholder={t('editor.day')} placeholderTextColor="#6B6B74" keyboardType="number-pad" value={day} onChangeText={setDay} className="rounded-md bg-dark-surface px-4 py-3 text-dark-text" />
        <TextInput placeholder={t('editor.startHour')} placeholderTextColor="#6B6B74" keyboardType="number-pad" value={startH} onChangeText={setStartH} className="rounded-md bg-dark-surface px-4 py-3 text-dark-text" />
        <TextInput placeholder={t('editor.endHour')} placeholderTextColor="#6B6B74" keyboardType="number-pad" value={endH} onChangeText={setEndH} className="rounded-md bg-dark-surface px-4 py-3 text-dark-text" />
        <Button label={t('editor.addSlot')} variant="secondary" onPress={add} />

        {slots.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
            className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4"
          >
            <AppText variant="body">
              {s.weekday} · {Math.floor(s.start_minute / 60)}:00–{Math.floor(s.end_minute / 60)}:00
            </AppText>
            <AppText variant="caption">✕</AppText>
          </Pressable>
        ))}

        <Button label={t('editor.save')} onPress={onSave} disabled={save.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(companion): listing + availability editors"
```

---

## Task 7: Tier A verification screen

**Files:**
- Create: `src/app/verification.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Install expo-image-picker**

```bash
npx expo install expo-image-picker
```

- [ ] **Step 2: Add verification strings to both locale files**

`src/locales/en.json` add top-level:

```json
"verification": {
  "title": "Get verified",
  "intro": "Tier A coaches upload a certification or ID. We review it and add a verified badge.",
  "pickCert": "Upload certification",
  "pickId": "Upload ID",
  "pending": "Your verification is under review.",
  "approved": "You're verified!",
  "rejected": "Your verification was rejected. You can resubmit.",
  "submitted": "Submitted for review.",
  "error": "Upload failed. Try again."
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"verification": {
  "title": "申請認證",
  "intro": "A 級教練可上傳證照或身分證件，我們審核後會加上認證標章。",
  "pickCert": "上傳證照",
  "pickId": "上傳身分證件",
  "pending": "你的認證正在審核中。",
  "approved": "你已通過認證！",
  "rejected": "你的認證未通過，可以重新提交。",
  "submitted": "已送出審核。",
  "error": "上傳失敗，請再試一次。"
}
```

- [ ] **Step 3: Create the verification screen**

`src/app/verification.tsx`:

```tsx
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useMyVerification, useSubmitVerification } from '@/features/companion/useVerification';

export default function VerificationScreen() {
  const { t } = useTranslation();
  const { data: verification } = useMyVerification();
  const submit = useSubmitVerification();

  async function pickAndUpload(docType: 'certification' | 'id') {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    try {
      await submit.mutateAsync({ docType, fileUri: result.assets[0].uri });
      Alert.alert('PacerGo', t('verification.submitted'));
    } catch {
      Alert.alert('PacerGo', t('verification.error'));
    }
  }

  const statusText =
    verification?.status === 'approved'
      ? t('verification.approved')
      : verification?.status === 'rejected'
        ? t('verification.rejected')
        : verification?.status === 'pending'
          ? t('verification.pending')
          : null;

  return (
    <ScreenContainer>
      <View className="gap-6 pt-6">
        <AppText variant="h1">{t('verification.title')}</AppText>
        <AppText variant="body" className="text-dark-text-secondary">
          {t('verification.intro')}
        </AppText>
        {statusText ? (
          <View className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{statusText}</AppText>
          </View>
        ) : null}
        <Button
          label={t('verification.pickCert')}
          onPress={() => pickAndUpload('certification')}
          disabled={submit.isPending}
        />
        <Button
          label={t('verification.pickId')}
          variant="secondary"
          onPress={() => pickAndUpload('id')}
          disabled={submit.isPending}
        />
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(companion): Tier A verification screen"
```

---

## Task 8: Wire entry points + register routes

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Add a companion entry to the profile screen**

In `src/app/(tabs)/profile.tsx`, replace the existing companion-toggle row so it routes into setup/dashboard. Replace this block:

```tsx
        <View className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.availableAsCompanion')}</AppText>
          <Switch
            value={profile?.is_companion ?? false}
            onValueChange={(v) => update.mutate({ is_companion: v })}
          />
        </View>
```

with:

```tsx
        <Pressable
          onPress={() =>
            router.push(profile?.is_companion ? '/companion-dashboard' : '/companion-setup')
          }
          className="rounded-lg bg-dark-surface p-4"
        >
          <AppText variant="body">
            {profile?.is_companion ? t('dashboard.title') : t('profile.becomeCompanion')}
          </AppText>
        </Pressable>
```

Then remove the now-unused `Switch` and `useUpdateProfile` import/usage from that file (keep `useProfile`). The file's imports become:

```tsx
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useProfile } from '@/features/profile/useProfile';
```

and add `const router = useRouter();` in the component, removing `const update = useUpdateProfile();`.

- [ ] **Step 2: Add the `becomeCompanion` profile string to both locale files**

`src/locales/en.json` — in the `"profile"` object add: `"becomeCompanion": "Become a companion"`.
`src/locales/zh-Hant.json` — in the `"profile"` object add: `"becomeCompanion": "成為夥伴"`.

- [ ] **Step 3: Register routes in `src/app/_layout.tsx`**

In the `Guarded` `<Stack>`, add after the booking routes:

```tsx
      <Stack.Screen name="companion-setup" />
      <Stack.Screen name="companion-dashboard" />
      <Stack.Screen name="listing-editor" />
      <Stack.Screen name="availability-editor" />
      <Stack.Screen name="verification" />
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
git commit -m "feat(companion): wire profile entry + register routes"
```

---

## Task 9: Full verification + docs

**Files:** Modify `README.md`

- [ ] **Step 1: Add a Companion-mode note to `README.md`** (after Booking)

```markdown
## Companion mode (M4a)

Any user can become a companion: a wizard creates a `companion_listings` row +
`listing_offerings` (activity · tier · price; only Tier C may be free, enforced by
`validateOffering`) and flips `profiles.is_companion`. A dashboard shows incoming
requests + upcoming sessions (from `useBookings`), with listing/availability
editors and a Tier A verification flow that uploads a doc to the private
`verification-docs` bucket and inserts a `verifications` row (admin review is
out-of-app). Requires migration `0005_companion.sql`. Realtime chat is M4b.
```

- [ ] **Step 2: Run the full test suite (un-piped so the exit code is real)**

```bash
npm test
```
Expected: all M0–M4a suites pass (adds validateOffering, useSaveListing).

- [ ] **Step 3: Type-check + full bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` clean; bundle `Exported:`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: M4a companion mode notes"
```

---

## Done — M4a acceptance

- [ ] A user can open "Become a companion," add activity·tier·price offerings (Tier-C-only free enforced), and publish — flipping `is_companion`.
- [ ] The dashboard lists incoming requests + upcoming sessions and links to editors + verification.
- [ ] Listing + availability editors load existing data and save (replace) it.
- [ ] Verification uploads a doc to the private bucket and records a pending `verifications` row; status (pending/approved/rejected) is reflected.
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live data requires migrations `0001`–`0005` applied. Logic, SQL, screens, hooks are built and unit/bundle-verified.

**Next:** M4b — Chat (conversations, messages, Supabase Realtime).
```
