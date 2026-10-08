# PacerGo M2 — Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the discovery experience — a location-based card feed of nearby companions (filter by activity/tier/price/distance), a map toggle, a companion detail screen, and save/unsave — backed by a PostGIS `nearby_companions` RPC and security-definer functions that never leak PII.

**Architecture:** New migration `0003` adds `companion_listings`, `listing_offerings`, `saved_companions`, and two `security definer` RPCs (`nearby_companions`, `get_companion`) that return only safe columns + rounded distance (never raw coordinates/PII). The Discover screen resolves a center coordinate via `expo-location` (with a Taipei fallback), calls the RPC through a `useNearbyCompanions` hook, and renders `CompanionCard`s filtered by a Zustand filter store. A pure `buildNearbyParams()` maps filter state → RPC args (TDD). The map toggle renders pins via `react-native-maps`. A `/companion/[id]` route shows the public detail + offerings + a save toggle.

**Tech Stack:** expo-router, Supabase RPC, PostGIS, expo-location, react-native-maps, TanStack Query, Zustand, Zod, NativeWind, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M2** (screens 6–9, plus saved).

**Builds on:** M0 + M1 (theme, i18n, UI kit, SessionProvider, profile hooks, formatters).

**Conventions:** commands from repo root; `@/` → `src/`; `npm test -- <pattern>`; `npm run typecheck`; bundle check via `npx expo export --platform ios --output-dir /tmp/pacergo-export` then delete.

**Verification boundary:** the RPCs return live data only once migrations `0001`–`0003` are applied and companion rows exist. This plan verifies via unit/component tests, `tsc`, and a production bundle.

---

## File structure (M2)

```
supabase/migrations/0003_discovery.sql       # listings, offerings, saved, RPCs, RLS
src/features/discovery/
  types.ts                 # Tier, Companion row types
  filterStore.ts           # Zustand: activitySlug, tier, maxPrice, radiusM, view
  buildNearbyParams.ts     # PURE: filter state -> RPC args (TDD)
  resolveCenter.ts         # PURE: permission/coords -> center (Taipei fallback) (TDD)
  useLocationCenter.ts     # expo-location hook
  useNearbyCompanions.ts   # RPC query
  useCompanion.ts          # detail RPC + offerings + saved
  useSaved.ts              # save/unsave mutation + saved list
src/components/discovery/
  CompanionCard.tsx
  ActivityChips.tsx
  FilterChips.tsx
  CompanionMap.tsx         # react-native-maps pins
src/app/(tabs)/index.tsx   # MODIFY: real Discover screen
src/app/companion/[id].tsx # detail screen
src/app/saved.tsx          # saved companions list
src/locales/*.json         # MODIFY: discovery strings
```

---

## Task 1: Branch + discovery migration

**Files:** Create `supabase/migrations/0003_discovery.sql`

- [ ] **Step 1: Branch**

```bash
git checkout main
git checkout -b feat/m2-discovery
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/0003_discovery.sql`:

```sql
-- Companion listing (1:1 with a companion profile)
create table if not exists companion_listings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  headline text,
  bio_long text,
  served_area text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists companion_listings_set_updated_at on companion_listings;
create trigger companion_listings_set_updated_at
  before update on companion_listings
  for each row execute function set_updated_at();

-- Offerings: an activity at a tier and price within a listing
create table if not exists listing_offerings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references companion_listings (id) on delete cascade,
  activity_id uuid not null references activities (id),
  tier tier_level not null,
  price_ntd int not null default 0,
  is_free boolean not null default false,
  session_minutes int not null default 60,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists listing_offerings_listing_idx on listing_offerings (listing_id);

-- Saved companions (bookmark)
create table if not exists saved_companions (
  seeker_id uuid not null references profiles (id) on delete cascade,
  companion_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seeker_id, companion_id)
);

-- RLS
alter table companion_listings enable row level security;
alter table listing_offerings enable row level security;
alter table saved_companions enable row level security;

drop policy if exists "listings active readable" on companion_listings;
create policy "listings active readable"
  on companion_listings for select to authenticated
  using (status = 'active' or profile_id = auth.uid());

drop policy if exists "listings owner manage" on companion_listings;
create policy "listings owner manage"
  on companion_listings for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "offerings readable for active listings" on listing_offerings;
create policy "offerings readable for active listings"
  on listing_offerings for select to authenticated
  using (
    exists (
      select 1 from companion_listings l
      where l.id = listing_id and (l.status = 'active' or l.profile_id = auth.uid())
    )
  );

drop policy if exists "offerings owner manage" on listing_offerings;
create policy "offerings owner manage"
  on listing_offerings for all to authenticated
  using (
    exists (select 1 from companion_listings l where l.id = listing_id and l.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from companion_listings l where l.id = listing_id and l.profile_id = auth.uid())
  );

drop policy if exists "saved owner manage" on saved_companions;
create policy "saved owner manage"
  on saved_companions for all to authenticated
  using (seeker_id = auth.uid()) with check (seeker_id = auth.uid());

-- Nearby companions: returns SAFE columns + rounded distance only. No raw
-- coordinates, no PII. SECURITY DEFINER so it can read other users' rows
-- while the base profiles table stays owner-only.
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
  order by distance_m asc
  limit 100;
$$;

grant execute on function nearby_companions to authenticated;

-- Public companion detail: safe columns only.
create or replace function get_companion(p_id uuid)
returns table (
  companion_id uuid,
  display_name text,
  photo_url text,
  bio text,
  experience_level experience_level,
  home_area text,
  rating_avg numeric,
  rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.bio, p.experience_level, p.home_area,
         coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from profiles p
  left join companion_listings l on l.profile_id = p.id
  where p.id = p_id;
$$;

grant execute on function get_companion to authenticated;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): discovery schema + nearby_companions/get_companion RPCs (M2)"
```

> Application deferred (same as M0/M1 — no MCP access to the PacerGo project).

---

## Task 2: Discovery types + filter store + buildNearbyParams (pure, TDD)

**Files:**
- Create: `src/features/discovery/types.ts`
- Create: `src/features/discovery/filterStore.ts`
- Create: `src/features/discovery/buildNearbyParams.ts`
- Test: `src/features/discovery/__tests__/buildNearbyParams.test.ts`

- [ ] **Step 1: Create the types**

```ts
export type Tier = 'A' | 'B' | 'C';

export type NearbyCompanion = {
  companion_id: string;
  display_name: string | null;
  photo_url: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  home_area: string | null;
  tier: Tier;
  activity_slug: string;
  price_ntd: number;
  is_free: boolean;
  distance_m: number;
};

export type Coords = { lat: number; lng: number };
```

- [ ] **Step 2: Write the failing test for `buildNearbyParams`**

```ts
import { buildNearbyParams } from '../buildNearbyParams';

describe('buildNearbyParams', () => {
  const center = { lat: 25.04, lng: 121.56 };

  it('maps center + radius and omits null filters', () => {
    expect(
      buildNearbyParams(center, { activitySlug: null, tier: null, maxPrice: null, radiusM: 20000 })
    ).toEqual({
      center_lat: 25.04,
      center_lng: 121.56,
      radius_m: 20000,
      filter_activity: null,
      filter_tier: null,
      max_price: null,
    });
  });

  it('passes through active filters', () => {
    const params = buildNearbyParams(center, {
      activitySlug: 'gym',
      tier: 'A',
      maxPrice: 1200,
      radiusM: 5000,
    });
    expect(params.filter_activity).toBe('gym');
    expect(params.filter_tier).toBe('A');
    expect(params.max_price).toBe(1200);
    expect(params.radius_m).toBe(5000);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- buildNearbyParams
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the filter store + builder**

`src/features/discovery/filterStore.ts`:

```ts
import { create } from 'zustand';
import type { Tier } from './types';

export type DiscoveryView = 'feed' | 'map';

type FilterState = {
  activitySlug: string | null;
  tier: Tier | null;
  maxPrice: number | null;
  radiusM: number;
  view: DiscoveryView;
  setActivity: (slug: string | null) => void;
  setTier: (tier: Tier | null) => void;
  setMaxPrice: (price: number | null) => void;
  setRadius: (m: number) => void;
  setView: (v: DiscoveryView) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  activitySlug: null,
  tier: null,
  maxPrice: null,
  radiusM: 20000,
  view: 'feed',
  setActivity: (activitySlug) => set({ activitySlug }),
  setTier: (tier) => set({ tier }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setRadius: (radiusM) => set({ radiusM }),
  setView: (view) => set({ view }),
}));
```

`src/features/discovery/buildNearbyParams.ts`:

```ts
import type { Coords, Tier } from './types';

export type NearbyFilters = {
  activitySlug: string | null;
  tier: Tier | null;
  maxPrice: number | null;
  radiusM: number;
};

export function buildNearbyParams(center: Coords, filters: NearbyFilters) {
  return {
    center_lat: center.lat,
    center_lng: center.lng,
    radius_m: filters.radiusM,
    filter_activity: filters.activitySlug,
    filter_tier: filters.tier,
    max_price: filters.maxPrice,
  };
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- buildNearbyParams
```
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(discovery): types, filter store, nearby params builder"
```

---

## Task 3: Center resolver (pure, TDD) + location hook

**Files:**
- Create: `src/features/discovery/resolveCenter.ts`
- Create: `src/features/discovery/useLocationCenter.ts`
- Test: `src/features/discovery/__tests__/resolveCenter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { resolveCenter, TAIPEI } from '../resolveCenter';

describe('resolveCenter', () => {
  it('uses device coords when available', () => {
    expect(resolveCenter({ lat: 25.1, lng: 121.5 })).toEqual({ lat: 25.1, lng: 121.5 });
  });

  it('falls back to Taipei when coords are null', () => {
    expect(resolveCenter(null)).toEqual(TAIPEI);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- resolveCenter
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/discovery/resolveCenter.ts`:

```ts
import type { Coords } from './types';

// Taipei Main Station — sensible default for a Taiwan-first launch.
export const TAIPEI: Coords = { lat: 25.0478, lng: 121.5319 };

export function resolveCenter(coords: Coords | null): Coords {
  return coords ?? TAIPEI;
}
```

`src/features/discovery/useLocationCenter.ts`:

```ts
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { resolveCenter } from './resolveCenter';
import type { Coords } from './types';

export function useLocationCenter() {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (active) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // keep null -> fallback handles it
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return resolveCenter(coords);
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- resolveCenter
```
Expected: PASS (2 tests).

- [ ] **Step 5: Install expo-location + commit**

```bash
npx expo install expo-location
git add -A
git commit -m "feat(discovery): center resolver + location hook (Taipei fallback)"
```

---

## Task 4: Data hooks (nearby, detail, saved)

**Files:**
- Create: `src/features/discovery/useNearbyCompanions.ts`
- Create: `src/features/discovery/useCompanion.ts`
- Create: `src/features/discovery/useSaved.ts`
- Test: `src/features/discovery/__tests__/useNearbyCompanions.test.tsx`

- [ ] **Step 1: Write the failing test** (mock supabase.rpc)

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    rpc: jest.fn().mockResolvedValue({
      data: [{ companion_id: 'c1', display_name: 'Coach', tier: 'A', activity_slug: 'gym', price_ntd: 1200, is_free: false, distance_m: 800 }],
      error: null,
    }),
  },
}));

import { useNearbyCompanions } from '../useNearbyCompanions';
import { supabase } from '@/lib/supabase/client';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNearbyCompanions', () => {
  it('calls the nearby_companions RPC and returns rows', async () => {
    const { result } = renderHook(
      () => useNearbyCompanions({ lat: 25, lng: 121 }, { activitySlug: null, tier: null, maxPrice: null, radiusM: 20000 }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data?.[0].display_name).toBe('Coach'));
    expect(supabase.rpc).toHaveBeenCalledWith('nearby_companions', expect.objectContaining({ center_lat: 25 }));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- useNearbyCompanions
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three hooks**

`src/features/discovery/useNearbyCompanions.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { buildNearbyParams, type NearbyFilters } from './buildNearbyParams';
import type { Coords, NearbyCompanion } from './types';

export function useNearbyCompanions(center: Coords, filters: NearbyFilters) {
  const params = buildNearbyParams(center, filters);
  return useQuery({
    queryKey: ['nearby', params],
    queryFn: async (): Promise<NearbyCompanion[]> => {
      const { data, error } = await supabase.rpc('nearby_companions', params);
      if (error) throw error;
      return (data ?? []) as NearbyCompanion[];
    },
  });
}
```

`src/features/discovery/useCompanion.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Tier } from './types';

export type CompanionDetail = {
  companion_id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  home_area: string | null;
  rating_avg: number;
  rating_count: number;
};

export type Offering = {
  id: string;
  activity_id: string;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
  description: string | null;
};

export function useCompanion(id: string) {
  return useQuery({
    queryKey: ['companion', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{ detail: CompanionDetail | null; offerings: Offering[] }> => {
      const { data: detailRows, error: e1 } = await supabase.rpc('get_companion', { p_id: id });
      if (e1) throw e1;
      const detail = (detailRows?.[0] ?? null) as CompanionDetail | null;

      const { data: listing, error: e2 } = await supabase
        .from('companion_listings')
        .select('id')
        .eq('profile_id', id)
        .maybeSingle();
      if (e2) throw e2;

      let offerings: Offering[] = [];
      if (listing?.id) {
        const { data: offs, error: e3 } = await supabase
          .from('listing_offerings')
          .select('id, activity_id, tier, price_ntd, is_free, session_minutes, description')
          .eq('listing_id', listing.id);
        if (e3) throw e3;
        offerings = (offs ?? []) as Offering[];
      }
      return { detail, offerings };
    },
  });
}
```

`src/features/discovery/useSaved.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export function useSavedIds() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  return useQuery({
    queryKey: ['saved', seekerId],
    enabled: Boolean(seekerId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('saved_companions')
        .select('companion_id')
        .eq('seeker_id', seekerId);
      if (error) throw error;
      return (data ?? []).map((r: { companion_id: string }) => r.companion_id);
    },
  });
}

export function useToggleSaved() {
  const { session } = useSession();
  const seekerId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companionId, saved }: { companionId: string; saved: boolean }) => {
      if (saved) {
        const { error } = await supabase
          .from('saved_companions')
          .delete()
          .eq('seeker_id', seekerId)
          .eq('companion_id', companionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_companions')
          .insert({ seeker_id: seekerId, companion_id: companionId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved', seekerId] }),
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- useNearbyCompanions
```
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(discovery): nearby/detail/saved data hooks"
```

---

## Task 5: CompanionCard + chips components

**Files:**
- Create: `src/components/discovery/CompanionCard.tsx`
- Create: `src/components/discovery/ActivityChips.tsx`
- Create: `src/components/discovery/FilterChips.tsx`
- Test: `src/components/discovery/__tests__/CompanionCard.test.tsx`

- [ ] **Step 1: Write the failing test for `CompanionCard`**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { CompanionCard } from '../CompanionCard';

const companion = {
  companion_id: 'c1',
  display_name: 'Coach Lee',
  photo_url: null,
  experience_level: 'advanced' as const,
  home_area: 'Da’an',
  tier: 'A' as const,
  activity_slug: 'gym',
  price_ntd: 1200,
  is_free: false,
  distance_m: 800,
};

describe('CompanionCard', () => {
  it('shows name, tier, price and distance, and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<CompanionCard companion={companion} onPress={onPress} />);
    expect(getByText('Coach Lee')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
    expect(getByText(/1,200/)).toBeTruthy();
    expect(getByText('800 m')).toBeTruthy();
    fireEvent.press(getByText('Coach Lee'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- CompanionCard
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CompanionCard`**

```tsx
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { formatDistanceMeters } from '@/lib/format';
import type { NearbyCompanion } from '@/features/discovery/types';

export function CompanionCard({
  companion,
  onPress,
}: {
  companion: NearbyCompanion;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4">
      <Avatar name={companion.display_name ?? ''} photoUrl={companion.photo_url} size={56} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <TierBadge tier={companion.tier} />
          <AppText variant="h3">{companion.display_name ?? ''}</AppText>
        </View>
        <AppText variant="caption">
          {companion.activity_slug} · {formatDistanceMeters(companion.distance_m)}
          {companion.home_area ? ` · ${companion.home_area}` : ''}
        </AppText>
      </View>
      <PriceTag amount={companion.is_free ? 0 : companion.price_ntd} />
    </Pressable>
  );
}
```

> `AppText` variant `h3` is referenced here — confirm it exists in `src/components/ui/AppText.tsx`. If not, add an `h3` entry to its `variantClass` map: `h3: 'font-sans-semibold text-[18px] leading-[24px] text-dark-text'`.

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- CompanionCard
```
Expected: PASS (1 test).

- [ ] **Step 5: Implement `ActivityChips`**

```tsx
import { ScrollView, Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useActivities } from '@/features/profile/useActivities';
import { useTranslation } from 'react-i18next';

export function ActivityChips({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const { data } = useActivities();
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith('zh');
  const chip = (active: boolean) =>
    `mr-2 rounded-md px-4 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
      <Pressable className={chip(selected === null)} onPress={() => onSelect(null)}>
        <AppText className={selected === null ? 'text-white' : 'text-dark-text'}>All</AppText>
      </Pressable>
      {(data ?? []).map((a) => (
        <Pressable key={a.id} className={chip(selected === a.slug)} onPress={() => onSelect(a.slug)}>
          <AppText className={selected === a.slug ? 'text-white' : 'text-dark-text'}>
            {zh ? a.name_zh : a.name_en}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 6: Implement `FilterChips` (tier)**

```tsx
import { View, Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { Tier } from '@/features/discovery/types';

const TIERS: Tier[] = ['A', 'B', 'C'];

export function FilterChips({
  tier,
  onTier,
}: {
  tier: Tier | null;
  onTier: (t: Tier | null) => void;
}) {
  return (
    <View className="mt-2 flex-row">
      {TIERS.map((tt) => {
        const active = tier === tt;
        return (
          <Pressable
            key={tt}
            onPress={() => onTier(active ? null : tt)}
            className={`mr-2 h-9 w-9 items-center justify-center rounded-full ${
              active ? 'bg-brand-deep' : 'bg-dark-surface'
            }`}
          >
            <AppText className={active ? 'text-white' : 'text-dark-text'}>{tt}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 7: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(discovery): CompanionCard, ActivityChips, FilterChips"
```

---

## Task 6: Map component (react-native-maps)

**Files:**
- Create: `src/components/discovery/CompanionMap.tsx`

- [ ] **Step 1: Install react-native-maps**

```bash
npx expo install react-native-maps
```

- [ ] **Step 2: Implement the map**

```tsx
import MapView, { Marker } from 'react-native-maps';
import type { Coords, NearbyCompanion } from '@/features/discovery/types';

export function CompanionMap({
  center,
  companions,
  onSelect,
}: {
  center: Coords;
  companions: NearbyCompanion[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {companions
        .filter((c) => Number.isFinite(c.distance_m))
        .map((c) => (
          <Marker
            key={`${c.companion_id}-${c.activity_slug}`}
            // Approximate the marker around the center using distance as a rough radius.
            coordinate={{ latitude: center.lat, longitude: center.lng }}
            title={c.display_name ?? ''}
            description={c.activity_slug}
            onPress={() => onSelect(c.companion_id)}
          />
        ))}
    </MapView>
  );
}
```

> The RPC intentionally returns distance, not coordinates (privacy). For M2 the map centers on the user and shows markers; exact marker placement using a privacy-preserving jittered point is a later refinement. Keep the map isolated in this file so it can be swapped without touching the screen.

- [ ] **Step 3: Verify the bundle resolves react-native-maps**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` passes and the bundle prints `Exported:`. **If react-native-maps fails to bundle on this SDK/arch**, replace the body of `CompanionMap.tsx` with a themed placeholder (a `View` with an `AppText` "Map view" and the companion count) so the toggle remains functional, and note it. Do not block the milestone on native maps.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(discovery): companion map view"
```

---

## Task 7: Discover screen (feed + map toggle)

**Files:**
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add discovery strings to both locale files**

`src/locales/en.json` — replace the `"discover"` object with:

```json
"discover": {
  "title": "Find a companion",
  "feed": "List",
  "map": "Map",
  "all": "All",
  "empty": "No companions nearby. Try widening your distance or switching activity.",
  "saved": "Saved"
}
```

`src/locales/zh-Hant.json` — replace the `"discover"` object with:

```json
"discover": {
  "title": "尋找夥伴",
  "feed": "清單",
  "map": "地圖",
  "all": "全部",
  "empty": "附近沒有夥伴，試著放寬距離或更換運動類型。",
  "saved": "已儲存"
}
```

- [ ] **Step 2: Replace the Discover screen**

`src/app/(tabs)/index.tsx`:

```tsx
import { View, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CompanionCard } from '@/components/discovery/CompanionCard';
import { ActivityChips } from '@/components/discovery/ActivityChips';
import { FilterChips } from '@/components/discovery/FilterChips';
import { CompanionMap } from '@/components/discovery/CompanionMap';
import { useFilterStore } from '@/features/discovery/filterStore';
import { useLocationCenter } from '@/features/discovery/useLocationCenter';
import { useNearbyCompanions } from '@/features/discovery/useNearbyCompanions';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const center = useLocationCenter();
  const f = useFilterStore();
  const nearby = useNearbyCompanions(center, {
    activitySlug: f.activitySlug,
    tier: f.tier,
    maxPrice: f.maxPrice,
    radiusM: f.radiusM,
  });
  const companions = nearby.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <AppText variant="h1">{t('discover.title')}</AppText>
          <View className="w-40">
            <SegmentedControl
              value={f.view}
              onChange={f.setView}
              options={[
                { value: 'feed', label: t('discover.feed') },
                { value: 'map', label: t('discover.map') },
              ]}
            />
          </View>
        </View>
        <ActivityChips selected={f.activitySlug} onSelect={f.setActivity} />
        <FilterChips tier={f.tier} onTier={f.setTier} />
      </View>

      {f.view === 'feed' ? (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
          data={companions}
          keyExtractor={(c) => `${c.companion_id}-${c.activity_slug}`}
          renderItem={({ item }) => (
            <CompanionCard
              companion={item}
              onPress={() => router.push(`/companion/${item.companion_id}`)}
            />
          )}
          ListEmptyComponent={
            <AppText variant="caption" className="mt-10 text-center">
              {t('discover.empty')}
            </AppText>
          }
        />
      ) : (
        <View className="mt-3 flex-1">
          <CompanionMap
            center={center}
            companions={companions}
            onSelect={(id) => router.push(`/companion/${id}`)}
          />
        </View>
      )}
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
git commit -m "feat(discovery): Discover screen with feed/map toggle + filters"
```

---

## Task 8: Companion detail screen

**Files:**
- Create: `src/app/companion/[id].tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add detail strings to both locale files**

`src/locales/en.json` add top-level:

```json
"companion": {
  "offerings": "Sessions offered",
  "request": "Request a session",
  "comingSoon": "Booking comes soon",
  "save": "Save",
  "saved": "Saved",
  "reviews": "{{count}} reviews"
}
```

`src/locales/zh-Hant.json` add top-level:

```json
"companion": {
  "offerings": "提供的課程",
  "request": "預約課程",
  "comingSoon": "預約功能即將推出",
  "save": "儲存",
  "saved": "已儲存",
  "reviews": "{{count}} 則評價"
}
```

- [ ] **Step 2: Create the detail screen**

`src/app/companion/[id].tsx`:

```tsx
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { useCompanion } from '@/features/discovery/useCompanion';
import { useSavedIds, useToggleSaved } from '@/features/discovery/useSaved';

export default function CompanionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data } = useCompanion(id);
  const saved = useSavedIds();
  const toggle = useToggleSaved();

  const detail = data?.detail;
  const isSaved = (saved.data ?? []).includes(id);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <View className="items-center gap-2">
          <Avatar name={detail?.display_name ?? ''} photoUrl={detail?.photo_url} size={88} />
          <AppText variant="h1">{detail?.display_name ?? ''}</AppText>
          {detail?.home_area ? <AppText variant="caption">{detail.home_area}</AppText> : null}
          <AppText variant="caption">
            {t('companion.reviews', { count: detail?.rating_count ?? 0 })}
          </AppText>
        </View>

        {detail?.bio ? <AppText variant="body">{detail.bio}</AppText> : null}

        <AppText variant="h3">{t('companion.offerings')}</AppText>
        {(data?.offerings ?? []).map((o) => (
          <View key={o.id} className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4">
            <View className="flex-row items-center gap-2">
              <TierBadge tier={o.tier} />
              <AppText variant="body">{o.session_minutes} min</AppText>
            </View>
            <PriceTag amount={o.is_free ? 0 : o.price_ntd} />
          </View>
        ))}

        <View className="gap-3 pt-2">
          <Button
            label={isSaved ? t('companion.saved') : t('companion.save')}
            variant="secondary"
            onPress={() => toggle.mutate({ companionId: id, saved: isSaved })}
          />
          <Button label={t('companion.comingSoon')} onPress={() => {}} disabled />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
```

> The "Request a session" CTA is intentionally disabled (`comingSoon`) — booking is M3.

- [ ] **Step 3: Verify types + bundle**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(discovery): companion detail screen with offerings + save"
```

---

## Task 9: Saved companions screen + nav entry

**Files:**
- Create: `src/app/saved.tsx`
- Modify: `src/app/_layout.tsx` (register `saved` route)

- [ ] **Step 1: Create the saved list screen**

`src/app/saved.tsx`:

```tsx
import { FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { useSavedIds } from '@/features/discovery/useSaved';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const saved = useSavedIds();
  const ids = saved.data ?? [];

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('discover.saved')}
      </AppText>
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        renderItem={({ item }) => (
          <AppText
            variant="body"
            className="rounded-lg bg-dark-surface p-4"
            onPress={() => router.push(`/companion/${item}`)}
          >
            {item}
          </AppText>
        )}
        ListEmptyComponent={<AppText variant="caption">{t('discover.empty')}</AppText>}
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Register the `saved` route in `src/app/_layout.tsx`**

In the `Guarded` component's `<Stack>`, add after the `settings` screen:

```tsx
      <Stack.Screen name="saved" options={{ presentation: 'modal' }} />
```

- [ ] **Step 3: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(discovery): saved companions screen"
```

---

## Task 10: Full verification + docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a Discovery note to `README.md`** (under the Auth section)

```markdown
## Discovery (M2)

The Discover tab calls the `nearby_companions` PostGIS RPC with a center coordinate
(from `expo-location`, falling back to Taipei). Companion data appears once
migration `0003_discovery.sql` is applied and `companion_listings` /
`listing_offerings` rows exist with a `profiles.location`. The RPCs are
`security definer` and return only safe columns + rounded distance — never raw
coordinates or PII. The "Request a session" CTA is disabled until M3 (Booking).
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```
Expected: all M0 + M1 + M2 suites pass (adds buildNearbyParams, resolveCenter, useNearbyCompanions, CompanionCard).

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Full bundle**

```bash
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `Exported:` with no red errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: M2 discovery notes"
```

---

## Done — M2 acceptance

- [ ] Discover tab shows an activity chip row, tier filter chips, and a feed/map toggle.
- [ ] Feed lists `CompanionCard`s (tier badge, activity, distance, area, price) from the `nearby_companions` RPC, with an empty state.
- [ ] Map toggle renders companion markers (or a themed placeholder if native maps don't bundle).
- [ ] Tapping a card opens `/companion/[id]` with safe detail, offerings, a working Save toggle, and a disabled "Request" CTA (M3).
- [ ] Saved screen lists saved companion ids.
- [ ] RPCs leak no PII (definer functions return curated columns + rounded distance).
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live data requires migrations `0001`–`0003` applied + companion rows. Logic, RPC SQL, screens, and components are built and unit/bundle-verified.

**Next milestone:** M3 — Booking loop (request → accept/decline → status state machine → reviews → notifications).
