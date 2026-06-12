# Pacergo M1 — Auth & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authentication (Google/Apple via Supabase), a session-aware route guard, a seeker onboarding wizard (18+ gate, location, Gym activity), and Profile + Settings screens (language/theme switchers) on top of the M0 foundation.

**Architecture:** A `SessionProvider` subscribes to Supabase auth state and exposes `{ session, loading }`. A `useProfile` query loads the current user's profile row; a pure `resolveAuthRoute()` function decides where the user belongs (sign-in / onboarding / app) and the root layout enforces it via expo-router redirects. Onboarding is a linear multi-step wizard backed by a Zustand draft store, validated with Zod, persisted to `profiles` + `profile_activities` on finish. Profile/Settings read and mutate the profile via TanStack Query. OAuth handlers call `supabase.auth.signInWithIdToken` and are gated behind env config so the app builds and runs even before credentials exist.

**Tech Stack:** expo-router, Supabase auth (`signInWithIdToken`), expo-apple-authentication, expo-auth-session (Google), Zod, Zustand, TanStack Query, i18next, NativeWind.

**Deferred within M1 (folded into later milestones):** avatar photo *upload* (the Avatar component already renders a `photo_url` when present; capture via image-picker + the `avatars` bucket comes with the discovery/profile polish), and precise device geolocation + permission priming (onboarding captures a text `home_area`; exact-location capture lands with M2 Discovery, which needs PostGIS coordinates anyway).

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` — implements milestone **M1** (screens 1–5, 22–23).

**Builds on:** M0 foundation (`src/lib/theme`, `src/lib/i18n`, `src/lib/format`, `src/lib/supabase/client`, `src/lib/query/client`, `src/components/ui/*`, `src/app/(tabs)/*`).

**Conventions:** commands run from repo root. `@/` maps to `src/`. Run tests with `npm test -- <pattern>`. Type-check with `npm run typecheck`. Verify a full bundle with `npx expo export --platform ios --output-dir /tmp/pacergo-export` (then delete it).

**Reality note (verification boundary):** OAuth sign-in and DB writes require the Supabase project to have the schema applied (migrations `0001`, `0002`) and Google/Apple providers configured. Those are owner setup steps. This plan verifies via unit/component tests, `tsc`, and a production bundle — not a live login.

---

## File structure (created/modified in M1)

```
src/
  features/auth/
    SessionProvider.tsx        # subscribes to supabase auth, exposes session+loading
    useSession.ts              # hook to read SessionProvider context
    resolveAuthRoute.ts        # PURE routing decision (TDD)
    oauth.ts                   # signInWithGoogle / signInWithApple handlers (config-gated)
    authConfig.ts              # reads EXPO_PUBLIC_* OAuth config, isGoogleConfigured/isAppleConfigured
  features/profile/
    useProfile.ts              # current-user profile query + update mutation
    useActivities.ts           # active activities query
    profileSchema.ts           # Zod schemas + age-gate helper (TDD)
    onboardingStore.ts         # Zustand draft store for the wizard
  app/
    _layout.tsx                # MODIFY: wrap with SessionProvider + route guard
    (auth)/_layout.tsx         # Stack
    (auth)/sign-in.tsx         # welcome carousel + Google/Apple buttons
    (onboarding)/_layout.tsx   # Stack
    (onboarding)/index.tsx     # wizard host (steps)
    (tabs)/profile.tsx         # MODIFY: real profile screen
    settings.tsx               # settings (language/theme/sign out)
  components/ui/
    Avatar.tsx                 # avatar with initials fallback
    SegmentedControl.tsx       # used by settings theme/lang
    ScreenContainer.tsx        # safe-area themed wrapper (DRY for screens)
  locales/en.json              # MODIFY: add auth/onboarding/profile/settings strings
  locales/zh-Hant.json         # MODIFY: same keys
supabase/migrations/
  0002_onboarding.sql          # add profiles.onboarding_completed
```

---

## Task 1: Branch + Profile DB columns (migration file)

**Files:**
- Create: `supabase/migrations/0002_onboarding.sql`

- [ ] **Step 1: Create the branch**

```bash
git checkout main
git checkout -b feat/m1-auth-onboarding
```

- [ ] **Step 2: Write the migration adding the onboarding flag**

`profiles` (from M0) has no completion flag. The route guard needs one. Create `supabase/migrations/0002_onboarding.sql`:

```sql
-- Track whether a user finished the seeker onboarding wizard.
alter table profiles
  add column if not exists onboarding_completed boolean not null default false;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): add profiles.onboarding_completed (M1 migration)"
```

> Application of this migration is deferred (same as M0 — no MCP access to the Pacergo project). It is applied by the owner alongside `0001`.

---

## Task 2: OAuth config flags (pure, TDD)

**Files:**
- Create: `src/features/auth/authConfig.ts`
- Test: `src/features/auth/__tests__/authConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { isGoogleConfigured, isAppleConfigured } from '../authConfig';

describe('authConfig', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('reports Google unconfigured when the client id is missing', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    expect(isGoogleConfigured()).toBe(false);
  });

  it('reports Google configured when the client id is present', () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'abc.apps.googleusercontent.com';
    expect(isGoogleConfigured()).toBe(true);
  });

  it('reports Apple configured only on iOS', () => {
    expect(isAppleConfigured('ios')).toBe(true);
    expect(isAppleConfigured('android')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- authConfig
```
Expected: FAIL — `Cannot find module '../authConfig'`.

- [ ] **Step 3: Implement**

```ts
import { Platform } from 'react-native';

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

// Apple Sign In is only available on iOS devices.
export function isAppleConfigured(platform: string = Platform.OS): boolean {
  return platform === 'ios';
}

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- authConfig
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): OAuth config flags"
```

---

## Task 3: Route guard decision (pure, TDD)

**Files:**
- Create: `src/features/auth/resolveAuthRoute.ts`
- Test: `src/features/auth/__tests__/resolveAuthRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { resolveAuthRoute } from '../resolveAuthRoute';

describe('resolveAuthRoute', () => {
  it('returns null while auth state is loading', () => {
    expect(
      resolveAuthRoute({ loading: true, hasSession: false, onboarded: false, group: 'auth' })
    ).toBeNull();
  });

  it('sends signed-out users to sign-in', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: false, onboarded: false, group: 'tabs' })
    ).toBe('/(auth)/sign-in');
  });

  it('keeps signed-out users already on auth in place', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: false, onboarded: false, group: 'auth' })
    ).toBeNull();
  });

  it('sends signed-in, not-onboarded users to onboarding', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: false, group: 'tabs' })
    ).toBe('/(onboarding)');
  });

  it('sends signed-in onboarded users out of the auth group into the app', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: true, group: 'auth' })
    ).toBe('/(tabs)');
  });

  it('leaves signed-in onboarded users inside the app alone', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: true, group: 'tabs' })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- resolveAuthRoute
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export type RouteGroup = 'auth' | 'onboarding' | 'tabs' | 'other';

export type AuthRouteInput = {
  loading: boolean;
  hasSession: boolean;
  onboarded: boolean;
  group: RouteGroup;
};

export function resolveAuthRoute(input: AuthRouteInput): string | null {
  const { loading, hasSession, onboarded, group } = input;
  if (loading) return null;

  if (!hasSession) {
    return group === 'auth' ? null : '/(auth)/sign-in';
  }

  if (!onboarded) {
    return group === 'onboarding' ? null : '/(onboarding)';
  }

  // Signed in + onboarded: must be inside the app.
  if (group === 'auth' || group === 'onboarding') return '/(tabs)';
  return null;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- resolveAuthRoute
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): pure route-guard decision"
```

---

## Task 4: Age-gate + profile Zod schema (pure, TDD)

**Files:**
- Create: `src/features/profile/profileSchema.ts`
- Test: `src/features/profile/__tests__/profileSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { isAdult, onboardingSchema } from '../profileSchema';

describe('isAdult', () => {
  it('is true for an 18th birthday today', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    expect(isAdult(d, new Date())).toBe(true);
  });

  it('is false one day before the 18th birthday', () => {
    const today = new Date('2026-06-12');
    const dob = new Date('2008-06-13');
    expect(isAdult(dob, today)).toBe(false);
  });
});

describe('onboardingSchema', () => {
  it('accepts a valid adult profile with at least one activity', () => {
    const result = onboardingSchema.safeParse({
      displayName: 'Lee',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty display name', () => {
    const result = onboardingSchema.safeParse({
      displayName: '',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when no activity is selected', () => {
    const result = onboardingSchema.safeParse({
      displayName: 'Lee',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: [],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- profileSchema
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { z } from 'zod';

export function isAdult(birthdate: Date, now: Date = new Date()): boolean {
  const eighteenth = new Date(birthdate);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth.getTime() <= now.getTime();
}

export const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  birthdate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date')
    .refine((s) => isAdult(new Date(s)), 'must be 18+'),
  experienceLevel: z.enum(experienceLevels),
  activityIds: z.array(z.string().uuid()).min(1),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- profileSchema
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(profile): onboarding zod schema + 18+ age gate"
```

---

## Task 5: SessionProvider + useSession

**Files:**
- Create: `src/features/auth/SessionProvider.tsx`
- Create: `src/features/auth/useSession.ts`
- Test: `src/features/auth/__tests__/SessionProvider.test.tsx`

- [ ] **Step 1: Write the failing test** (mock the supabase client)

```tsx
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const getSession = jest.fn().mockResolvedValue({ data: { session: null } });
const onAuthStateChange = jest
  .fn()
  .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

jest.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}));

import { SessionProvider } from '../SessionProvider';
import { useSession } from '../useSession';

function Probe() {
  const { loading } = useSession();
  return <Text>{loading ? 'loading' : 'ready'}</Text>;
}

describe('SessionProvider', () => {
  it('starts loading then resolves to ready', async () => {
    const { getByText } = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    expect(getByText('loading')).toBeTruthy();
    await waitFor(() => expect(getByText('ready')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- SessionProvider
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `useSession` context value type + provider**

`src/features/auth/useSession.ts`:

```ts
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
```

`src/features/auth/SessionProvider.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { SessionContext } from './useSession';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- SessionProvider
```
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): SessionProvider + useSession"
```

---

## Task 6: Profile + activities data hooks

**Files:**
- Create: `src/features/profile/useProfile.ts`
- Create: `src/features/profile/useActivities.ts`
- Test: `src/features/profile/__tests__/useProfile.test.tsx`

- [ ] **Step 1: Write the failing test** (mock supabase query builder + session)

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const maybeSingle = jest
  .fn()
  .mockResolvedValue({ data: { id: 'u1', display_name: 'Lee', onboarding_completed: true }, error: null });
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

jest.mock('@/lib/supabase/client', () => ({ supabase: { from } }));
jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } }, loading: false }),
}));

import { useProfile } from '../useProfile';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProfile', () => {
  it('loads the current user profile', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.data?.display_name).toBe('Lee'));
    expect(from).toHaveBeenCalledWith('profiles');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- useProfile
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hooks and the row type**

`src/features/profile/useProfile.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  home_area: string | null;
  is_companion: boolean;
  onboarding_completed: boolean;
};

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
```

`src/features/profile/useActivities.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type Activity = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  icon: string | null;
};

export function useActivities() {
  return useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, slug, name_en, name_zh, icon')
        .eq('is_active', true)
        .order('slug');
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- useProfile
```
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(profile): profile + activities data hooks"
```

---

## Task 7: OAuth handlers (config-gated)

**Files:**
- Create: `src/features/auth/oauth.ts`
- Test: `src/features/auth/__tests__/oauth.test.ts`

- [ ] **Step 1: Write the failing test** (mock supabase + apple module)

```ts
const signInWithIdToken = jest.fn().mockResolvedValue({ data: {}, error: null });
jest.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signInWithIdToken } },
}));

import { signInWithAppleIdentityToken } from '../oauth';

describe('signInWithAppleIdentityToken', () => {
  beforeEach(() => signInWithIdToken.mockClear());

  it('passes the identity token to supabase with provider apple', async () => {
    await signInWithAppleIdentityToken('tok-123');
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'tok-123',
    });
  });

  it('throws when no token is provided', async () => {
    await expect(signInWithAppleIdentityToken(null)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- "auth/__tests__/oauth"
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (Apple via identity token; Google via expo-auth-session id_token)

```ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase/client';

export async function signInWithAppleIdentityToken(identityToken: string | null) {
  if (!identityToken) throw new Error('Apple sign-in returned no identity token');
  return supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken });
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  return signInWithAppleIdentityToken(credential.identityToken);
}

export async function signInWithGoogleIdToken(idToken: string | null) {
  if (!idToken) throw new Error('Google sign-in returned no id token');
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
}
```

> Note: the Google interactive flow (obtaining `idToken` via `expo-auth-session`) is wired in the sign-in screen (Task 9) using the configured client IDs. `signInWithGoogleIdToken` is the testable seam.

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- "auth/__tests__/oauth"
```
Expected: PASS (2 tests).

- [ ] **Step 5: Install the Apple auth module + commit**

```bash
npx expo install expo-apple-authentication
git add -A
git commit -m "feat(auth): Apple/Google id-token sign-in handlers"
```

---

## Task 8: Shared screen primitives (Avatar, SegmentedControl, ScreenContainer)

**Files:**
- Create: `src/components/ui/ScreenContainer.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`
- Test: `src/components/ui/__tests__/Avatar.test.tsx`
- Test: `src/components/ui/__tests__/SegmentedControl.test.tsx`

- [ ] **Step 1: Implement `ScreenContainer`** (DRY themed safe-area wrapper)

```tsx
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ScreenContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Write the failing test for `Avatar`**

```tsx
import { render } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('shows an initial when no photo is provided', () => {
    const { getByText } = render(<Avatar name="Lee" />);
    expect(getByText('L')).toBeTruthy();
  });

  it('falls back to ? for an empty name', () => {
    const { getByText } = render(<Avatar name="" />);
    expect(getByText('?')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- Avatar
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `Avatar`**

```tsx
import { View, Text, Image } from 'react-native';

export function Avatar({
  name,
  photoUrl,
  size = 64,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (photoUrl) {
    return (
      <Image
        accessibilityLabel="avatar"
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-brand-deep"
    >
      <Text className="font-display text-[24px] text-white">{initial}</Text>
    </View>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- Avatar
```
Expected: PASS (2 tests).

- [ ] **Step 6: Write the failing test for `SegmentedControl`**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';

describe('SegmentedControl', () => {
  it('renders options and reports the selected change', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentedControl
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />
    );
    fireEvent.press(getByText('Light'));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

```bash
npm test -- SegmentedControl
```
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `SegmentedControl`**

```tsx
import { View, Text, Pressable } from 'react-native';

export type SegmentOption<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
}) {
  return (
    <View className="flex-row rounded-md bg-dark-surface p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-sm py-2 ${active ? 'bg-brand-deep' : ''}`}
          >
            <Text className={active ? 'text-white' : 'text-dark-text-secondary'}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 9: Run it to verify it passes**

```bash
npm test -- SegmentedControl
```
Expected: PASS (1 test).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(ui): ScreenContainer, Avatar, SegmentedControl"
```

---

## Task 9: Sign-in screen + (auth) group

**Files:**
- Create: `src/app/(auth)/_layout.tsx`
- Create: `src/app/(auth)/sign-in.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add auth strings to `src/locales/en.json`**

Add this top-level key (keep existing keys):

```json
"auth": {
  "welcomeTitle": "Find your training partner",
  "welcomeSubtitle": "Pros, experienced peers, or someone to just train with — near you.",
  "continueGoogle": "Continue with Google",
  "continueApple": "Continue with Apple",
  "notConfigured": "Sign-in isn't configured yet",
  "signOut": "Sign out"
}
```

- [ ] **Step 2: Add the same keys to `src/locales/zh-Hant.json`**

```json
"auth": {
  "welcomeTitle": "尋找你的訓練夥伴",
  "welcomeSubtitle": "專業教練、有經驗的夥伴，或只是一起訓練的人——就在你附近。",
  "continueGoogle": "使用 Google 繼續",
  "continueApple": "使用 Apple 繼續",
  "notConfigured": "登入尚未設定",
  "signOut": "登出"
}
```

- [ ] **Step 3: Create the (auth) stack layout**

`src/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Create the sign-in screen**

`src/app/(auth)/sign-in.tsx`:

```tsx
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  isGoogleConfigured,
  isAppleConfigured,
  googleWebClientId,
  googleIosClientId,
} from '@/features/auth/authConfig';
import {
  signInWithApple,
  signInWithGoogleIdToken,
} from '@/features/auth/oauth';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    iosClientId: googleIosClientId,
  });

  async function onApple() {
    try {
      setBusy(true);
      await signInWithApple();
    } catch (e) {
      Alert.alert('Apple', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    try {
      setBusy(true);
      const result = await promptGoogle();
      if (result?.type === 'success') {
        await signInWithGoogleIdToken(result.params.id_token ?? null);
      }
    } catch (e) {
      Alert.alert('Google', String(e));
    } finally {
      setBusy(false);
    }
  }

  // Surface async google errors.
  if (googleResponse?.type === 'error') {
    Alert.alert('Google', googleResponse.error?.message ?? 'error');
  }

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center">
        <AppText variant="display">{t('auth.welcomeTitle')}</AppText>
        <AppText variant="body" className="mt-3 text-dark-text-secondary">
          {t('auth.welcomeSubtitle')}
        </AppText>
      </View>
      <View className="gap-3 pb-6">
        {isGoogleConfigured() ? (
          <Button label={t('auth.continueGoogle')} onPress={onGoogle} disabled={busy} />
        ) : null}
        {isAppleConfigured() ? (
          <Button
            label={t('auth.continueApple')}
            variant="secondary"
            onPress={onApple}
            disabled={busy}
          />
        ) : null}
        {!isGoogleConfigured() && !isAppleConfigured() ? (
          <AppText variant="caption" className="text-center">
            {t('auth.notConfigured')}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 5: Install the auth-session deps**

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

- [ ] **Step 6: Verify bundle + types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): sign-in screen with Google/Apple (config-gated)"
```

---

## Task 10: Onboarding wizard

**Files:**
- Create: `src/features/profile/onboardingStore.ts`
- Create: `src/app/(onboarding)/_layout.tsx`
- Create: `src/app/(onboarding)/index.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`
- Test: `src/features/profile/__tests__/onboardingStore.test.ts`

- [ ] **Step 1: Write the failing test for the draft store**

```ts
import { useOnboardingStore } from '../onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('toggles activity selection', () => {
    const { toggleActivity } = useOnboardingStore.getState();
    toggleActivity('a1');
    expect(useOnboardingStore.getState().activityIds).toEqual(['a1']);
    toggleActivity('a1');
    expect(useOnboardingStore.getState().activityIds).toEqual([]);
  });

  it('sets fields', () => {
    useOnboardingStore.getState().setField('displayName', 'Lee');
    expect(useOnboardingStore.getState().displayName).toBe('Lee');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- onboardingStore
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

```ts
import { create } from 'zustand';

type OnboardingState = {
  displayName: string;
  birthdate: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  homeArea: string;
  activityIds: string[];
  setField: (k: 'displayName' | 'birthdate' | 'experienceLevel' | 'homeArea', v: string) => void;
  toggleActivity: (id: string) => void;
  reset: () => void;
};

const initial = {
  displayName: '',
  birthdate: '',
  experienceLevel: 'beginner' as const,
  homeArea: '',
  activityIds: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as Partial<OnboardingState>),
  toggleActivity: (id) =>
    set((s) => ({
      activityIds: s.activityIds.includes(id)
        ? s.activityIds.filter((x) => x !== id)
        : [...s.activityIds, id],
    })),
  reset: () => set({ ...initial }),
}));
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npm test -- onboardingStore
```
Expected: PASS (2 tests).

- [ ] **Step 5: Add onboarding strings to both locale files**

`src/locales/en.json` add:

```json
"onboarding": {
  "nameLabel": "What should we call you?",
  "namePlaceholder": "Your name",
  "birthdateLabel": "Your birthdate",
  "ageError": "You must be 18 or older to use Pacergo.",
  "experienceLabel": "Your experience level",
  "beginner": "Beginner",
  "intermediate": "Intermediate",
  "advanced": "Advanced",
  "activitiesLabel": "What do you want to train?",
  "areaLabel": "Your area (optional)",
  "next": "Next",
  "back": "Back",
  "finish": "Finish",
  "saveError": "Couldn't save your profile. Try again."
}
```

`src/locales/zh-Hant.json` add:

```json
"onboarding": {
  "nameLabel": "我們該怎麼稱呼你？",
  "namePlaceholder": "你的名字",
  "birthdateLabel": "你的生日",
  "ageError": "你必須年滿 18 歲才能使用 Pacergo。",
  "experienceLabel": "你的經驗程度",
  "beginner": "初學者",
  "intermediate": "中級",
  "advanced": "進階",
  "activitiesLabel": "你想訓練什麼？",
  "areaLabel": "你的地區（選填）",
  "next": "下一步",
  "back": "上一步",
  "finish": "完成",
  "saveError": "無法儲存你的個人檔案，請再試一次。"
}
```

- [ ] **Step 6: Create the (onboarding) stack layout**

`src/app/(onboarding)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 7: Create the wizard host**

`src/app/(onboarding)/index.tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useActivities } from '@/features/profile/useActivities';
import { useUpdateProfile } from '@/features/profile/useProfile';
import { useOnboardingStore } from '@/features/profile/onboardingStore';
import { onboardingSchema, experienceLevels } from '@/features/profile/profileSchema';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const store = useOnboardingStore();
  const activities = useActivities();
  const update = useUpdateProfile();
  const { session } = useSession();

  async function finish() {
    const parsed = onboardingSchema.safeParse({
      displayName: store.displayName,
      birthdate: store.birthdate,
      experienceLevel: store.experienceLevel,
      activityIds: store.activityIds,
    });
    if (!parsed.success) {
      Alert.alert('Pacergo', t('onboarding.ageError'));
      return;
    }
    try {
      await update.mutateAsync({
        display_name: parsed.data.displayName,
        experience_level: parsed.data.experienceLevel,
        home_area: store.homeArea || null,
        onboarding_completed: true,
      });
      const userId = session?.user.id;
      if (userId) {
        await supabase.from('profile_activities').insert(
          parsed.data.activityIds.map((activity_id) => ({ profile_id: userId, activity_id }))
        );
      }
      store.reset();
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Pacergo', t('onboarding.saveError'));
    }
  }

  const expOptions = experienceLevels.map((value) => ({ value, label: t(`onboarding.${value}`) }));

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-6">
        {step === 0 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.nameLabel')}</AppText>
            <TextInput
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor="#6B6B74"
              value={store.displayName}
              onChangeText={(v) => store.setField('displayName', v)}
              className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B6B74"
              value={store.birthdate}
              onChangeText={(v) => store.setField('birthdate', v)}
              className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
            <AppText variant="caption">{t('onboarding.birthdateLabel')}</AppText>
          </View>
        )}

        {step === 1 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.experienceLabel')}</AppText>
            <SegmentedControl
              value={store.experienceLevel}
              onChange={(v) => store.setField('experienceLevel', v)}
              options={expOptions}
            />
            <TextInput
              placeholder={t('onboarding.areaLabel')}
              placeholderTextColor="#6B6B74"
              value={store.homeArea}
              onChangeText={(v) => store.setField('homeArea', v)}
              className="mt-2 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
          </View>
        )}

        {step === 2 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.activitiesLabel')}</AppText>
            <View className="flex-row flex-wrap gap-2">
              {(activities.data ?? []).map((a) => {
                const selected = store.activityIds.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => store.toggleActivity(a.id)}
                    className={`rounded-md px-4 py-2 ${selected ? 'bg-brand-deep' : 'bg-dark-surface'}`}
                  >
                    <AppText className={selected ? 'text-white' : 'text-dark-text'}>
                      {i18n.language.startsWith('zh') ? a.name_zh : a.name_en}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View className="flex-row gap-3 pb-6">
        {step > 0 && (
          <View className="flex-1">
            <Button label={t('onboarding.back')} variant="secondary" onPress={() => setStep(step - 1)} />
          </View>
        )}
        <View className="flex-1">
          {step < 2 ? (
            <Button label={t('onboarding.next')} onPress={() => setStep(step + 1)} />
          ) : (
            <Button label={t('onboarding.finish')} onPress={finish} disabled={update.isPending} />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 8: Verify types**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(onboarding): seeker onboarding wizard"
```

---

## Task 11: Profile screen (real) + companion toggle

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add profile strings to both locale files**

`src/locales/en.json` — replace the existing `"profile"` object with:

```json
"profile": {
  "title": "Profile",
  "availableAsCompanion": "Available as a companion",
  "settings": "Settings",
  "noName": "Set up your profile"
}
```

`src/locales/zh-Hant.json` — replace the existing `"profile"` object with:

```json
"profile": {
  "title": "個人檔案",
  "availableAsCompanion": "開放成為夥伴",
  "settings": "設定",
  "noName": "設定你的個人檔案"
}
```

- [ ] **Step 2: Replace the profile screen**

`src/app/(tabs)/profile.tsx`:

```tsx
import { View, Switch, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useProfile, useUpdateProfile } from '@/features/profile/useProfile';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <View className="items-center gap-3">
          <Avatar name={profile?.display_name ?? ''} photoUrl={profile?.photo_url} />
          <AppText variant="h2">{profile?.display_name ?? t('profile.noName')}</AppText>
        </View>

        <View className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.availableAsCompanion')}</AppText>
          <Switch
            value={profile?.is_companion ?? false}
            onValueChange={(v) => update.mutate({ is_companion: v })}
          />
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          className="rounded-lg bg-dark-surface p-4"
        >
          <AppText variant="body">{t('profile.settings')}</AppText>
        </Pressable>
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
git commit -m "feat(profile): real profile screen with companion toggle"
```

---

## Task 12: Settings screen (language / theme / sign out)

**Files:**
- Create: `src/app/settings.tsx`
- Modify: `src/locales/en.json`, `src/locales/zh-Hant.json`

- [ ] **Step 1: Add settings strings to both locale files**

`src/locales/en.json` add:

```json
"settings": {
  "title": "Settings",
  "language": "Language",
  "theme": "Theme",
  "themeDark": "Dark",
  "themeLight": "Light",
  "themeSystem": "System",
  "english": "English",
  "chinese": "中文",
  "signOut": "Sign out"
}
```

`src/locales/zh-Hant.json` add:

```json
"settings": {
  "title": "設定",
  "language": "語言",
  "theme": "主題",
  "themeDark": "深色",
  "themeLight": "淺色",
  "themeSystem": "系統",
  "english": "English",
  "chinese": "中文",
  "signOut": "登出"
}
```

- [ ] **Step 2: Create the settings screen**

`src/app/settings.tsx`:

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { supabase } from '@/lib/supabase/client';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <AppText variant="h1">{t('settings.title')}</AppText>

        <View className="gap-2">
          <AppText variant="caption">{t('settings.language')}</AppText>
          <SegmentedControl
            value={i18n.language.startsWith('zh') ? 'zh-Hant' : 'en'}
            onChange={(v) => i18n.changeLanguage(v)}
            options={[
              { value: 'en', label: t('settings.english') },
              { value: 'zh-Hant', label: t('settings.chinese') },
            ]}
          />
        </View>

        <View className="gap-2">
          <AppText variant="caption">{t('settings.theme')}</AppText>
          <SegmentedControl
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </View>

        <View className="mt-auto pb-6">
          <Button
            label={t('settings.signOut')}
            variant="destructive"
            onPress={() => supabase.auth.signOut()}
          />
        </View>
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
git commit -m "feat(settings): language, theme, and sign-out"
```

---

## Task 13: Wire SessionProvider + route guard into the root layout

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `src/features/auth/useRouteGuard.ts`

- [ ] **Step 1: Create the route-guard hook**

`src/features/auth/useRouteGuard.ts`:

```ts
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSession } from './useSession';
import { useProfile } from '@/features/profile/useProfile';
import { resolveAuthRoute, type RouteGroup } from './resolveAuthRoute';

function groupFromSegments(segments: string[]): RouteGroup {
  const first = segments[0];
  if (first === '(auth)') return 'auth';
  if (first === '(onboarding)') return 'onboarding';
  if (first === '(tabs)') return 'tabs';
  return 'other';
}

export function useRouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: sessionLoading } = useSession();
  const profile = useProfile();

  const loading = sessionLoading || (Boolean(session) && profile.isLoading);

  useEffect(() => {
    const target = resolveAuthRoute({
      loading,
      hasSession: Boolean(session),
      onboarded: Boolean(profile.data?.onboarding_completed),
      group: groupFromSegments(segments as string[]),
    });
    if (target) router.replace(target as never);
  }, [loading, session, profile.data?.onboarding_completed, segments, router]);
}
```

- [ ] **Step 2: Modify `src/app/_layout.tsx` to add SessionProvider + guard**

Replace the `RootLayout` body so the Stack lists the new groups and a `Guarded` inner component runs the guard. Full file:

```tsx
import '../global.css';
import '@/lib/i18n';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { queryClient } from '@/lib/query/client';
import { supabase } from '@/lib/supabase/client';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { useRouteGuard } from '@/features/auth/useRouteGuard';

SplashScreen.preventAutoHideAsync();

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

function Guarded() {
  useRouteGuard();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ThemeProvider>
              <Guarded />
            </ThemeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verify types + full bundle**

```bash
npm run typecheck
rm -rf /tmp/pacergo-export && npx expo export --platform ios --output-dir /tmp/pacergo-export 2>&1 | tail -5 && rm -rf /tmp/pacergo-export
```
Expected: `tsc` passes; export prints `Exported:` with no red errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): wire SessionProvider + route guard into root layout"
```

---

## Task 14: Env docs + full verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add OAuth vars to `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

- [ ] **Step 2: Add an "Auth setup" note to `README.md`** (under Database)

```markdown
## Auth (M1)

Google/Apple sign-in is config-gated. To enable it:

1. In Supabase → Authentication → Providers, enable **Google** and **Apple**.
2. Create Google OAuth client IDs (Web + iOS) and put them in `.env`
   (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`).
3. Apple Sign In requires a paid Apple Developer account and a dev/standalone
   build (it does not work in Expo Go).
4. Apply migrations `0001_foundation.sql` and `0002_onboarding.sql`.

Until configured, the sign-in screen shows "Sign-in isn't configured yet"
and the rest of the app builds and runs normally.
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```
Expected: all suites pass (M0 + new M1: authConfig, resolveAuthRoute, profileSchema, SessionProvider, useProfile, oauth, Avatar, SegmentedControl, onboardingStore).

- [ ] **Step 4: Type-check**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: M1 auth setup + env vars"
```

---

## Done — M1 acceptance

- [ ] Signed-out users land on the sign-in screen; Google/Apple buttons appear only when configured, else a friendly "not configured" message.
- [ ] After sign-in, users without `onboarding_completed` are routed through the wizard (name, 18+ birthdate gate, experience, area, Gym activity), which writes `profiles` + `profile_activities` and flips `onboarding_completed`.
- [ ] Onboarded users land in the tabs; Profile shows name/avatar + "available as companion" toggle and a link to Settings.
- [ ] Settings switches language (en/zh-Hant) and theme (dark/light/system) live, and signs out.
- [ ] `npm test` green, `tsc` clean, `expo export` bundles.

**Verification boundary:** live OAuth + DB writes require the owner to apply migrations and configure providers (see README "Auth"). All logic, routing, schema, and screens are built and unit/bundle-verified.

**Next milestone:** M2 — Discovery (listings/offerings, PostGIS `nearby_companions` RPC, card feed + filters + map, `public_profiles` view).
