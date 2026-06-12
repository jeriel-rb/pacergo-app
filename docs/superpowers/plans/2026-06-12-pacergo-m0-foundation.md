# Pacergo M0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Pacergo Expo app skeleton — design system, theming, i18n, Supabase wiring, navigation, a core component kit, and the foundational database schema — so feature milestones (M1–M5) can build on it.

**Architecture:** Expo (managed) + expo-router file-based navigation. NativeWind (Tailwind) expresses a Phantom-inspired design system via tokens. A React Context ThemeProvider supports dark/light/system. i18next + expo-localization provide en/zh-Hant with NTD/date/distance formatters. A Supabase client singleton (AsyncStorage-persisted session) connects to the existing project, with the foundational schema (profiles, activities, profile_activities) created via SQL migrations. TanStack Query + Zustand handle server and UI state.

**Tech Stack:** TypeScript, Expo, expo-router, NativeWind v4, react-native-reanimated/moti, i18next/react-i18next, expo-localization, @supabase/supabase-js, @tanstack/react-query, zustand, lucide-react-native, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-12-pacergo-design.md` (this plan implements section 14 milestone **M0**).

**Conventions for every task below:**
- All commands run from the repo root `/Users/jeriel/Documents/github/pacergo-app` unless stated.
- Use `npx expo install <pkg>` for any package with native code (it pins Expo-compatible versions). Use `npm install -D <pkg>` for pure dev tooling.
- Run tests with `npm test -- <pattern>`.

---

## Task 1: Scaffold the Expo app into the existing repo

**Files:**
- Create: the full Expo `default` template (expo-router + TypeScript) merged into the repo, preserving existing `.git/`, `.claude/`, and `docs/`.

- [ ] **Step 1: Scaffold into a temp dir and merge in**

The repo already contains `.git/`, `.claude/`, and `docs/`, so `create-expo-app` would refuse to run in place. Scaffold beside it and rsync the result in (excluding the scaffold's own `.git`):

```bash
cd /Users/jeriel/Documents/github
npx create-expo-app@latest pacergo-scaffold --template default
rsync -a --exclude='.git' pacergo-scaffold/ pacergo-app/
rm -rf pacergo-scaffold
cd pacergo-app
```

- [ ] **Step 2: Install dependencies and verify the project is coherent**

```bash
npm install
npx expo-doctor
```

Expected: `npx expo-doctor` reports no critical issues (it may warn about the empty git tree or unused config — those are fine).

- [ ] **Step 3: Reset the template's example screens**

The default template ships an example app under `app/(tabs)/`. Remove the example so we can build our own skeleton in Task 9:

```bash
npm run reset-project <<< $'n\n' 2>/dev/null || true
rm -rf app-example
```

If `reset-project` is not present, manually delete everything inside `app/` except keep the directory:

```bash
rm -rf app/* && mkdir -p app
```

- [ ] **Step 4: Set the app identity in `app.json`**

**Files:** Modify `app.json`

Set these fields (leave other generated fields as-is):

```json
{
  "expo": {
    "name": "Pacergo",
    "slug": "pacergo",
    "scheme": "pacergo",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.pacergo.app" },
    "android": { "package": "com.pacergo.app" }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app skeleton"
```

---

## Task 2: Install all foundation dependencies

**Files:** Modify `package.json` (via install commands).

- [ ] **Step 1: Install native/runtime dependencies (Expo-pinned)**

```bash
npx expo install react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-screens \
  @react-native-async-storage/async-storage \
  expo-localization expo-blur expo-haptics expo-image expo-font \
  react-native-svg
```

- [ ] **Step 2: Install pure JS runtime dependencies**

```bash
npm install nativewind moti zustand @tanstack/react-query \
  i18next react-i18next @supabase/supabase-js react-native-url-polyfill \
  lucide-react-native zod \
  @expo-google-fonts/inter @expo-google-fonts/noto-sans-tc @expo-google-fonts/space-grotesk
```

- [ ] **Step 3: Install dev/test tooling**

```bash
npm install -D tailwindcss@3 jest-expo jest @testing-library/react-native \
  @types/jest react-test-renderer
```

- [ ] **Step 4: Verify install**

```bash
npx tsc --noEmit
```

Expected: completes (there may be type errors only if config files are missing — none should exist yet since we haven't added source).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add foundation dependencies"
```

---

## Task 3: Configure the test harness

**Files:**
- Modify: `package.json` (jest config + test script)
- Create: `jest.setup.js`
- Create: `src/lib/__tests__/sanity.test.ts`

- [ ] **Step 1: Add jest config and script to `package.json`**

Add a `test` script and a `jest` block:

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|moti|@supabase/.*|lucide-react-native))"
    ]
  }
}
```

- [ ] **Step 2: Create `jest.setup.js`**

```js
// Silences the reanimated warning in tests and provides a basic mock.
require('react-native-reanimated').setUpTests?.();

// AsyncStorage mock for tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

- [ ] **Step 3: Write a sanity test**

**Files:** Create `src/lib/__tests__/sanity.test.ts`

```ts
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it to verify the harness works**

```bash
npm test -- sanity
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: configure jest-expo harness"
```

---

## Task 4: Configure NativeWind + Phantom design tokens

**Files:**
- Create: `tailwind.config.js`
- Create: `global.css`
- Create: `metro.config.js`
- Modify: `babel.config.js`
- Create: `nativewind-env.d.ts`

- [ ] **Step 1: Create `tailwind.config.js` with the Phantom palette**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#AB9FF2',
          violet: '#AB9FF2',
          deep: '#7C5CFF',
        },
        tierA: { from: '#F5C451', to: '#E0A93C' },
        tierB: { from: '#AB9FF2', to: '#7C5CFF' },
        tierC: { from: '#3DDC97', to: '#2BB67D' },
        success: '#3DDC97',
        warning: '#FFB020',
        danger: '#FF5C5C',
        // Dark theme surfaces
        'dark-bg': '#18181B',
        'dark-surface': '#232328',
        'dark-elevated': '#2C2C32',
        'dark-text': '#F5F5F7',
        'dark-text-secondary': '#A1A1AA',
        'dark-text-muted': '#6B6B74',
        // Light theme surfaces
        'light-bg': '#FFFFFF',
        'light-surface': '#F6F5FA',
        'light-text': '#1A1A1F',
        'light-text-secondary': '#6B6B74',
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '20px',
        xl: '28px',
      },
      fontFamily: {
        display: ['SpaceGrotesk_600SemiBold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
```

> Design note: `SpaceGrotesk` is the installable stand-in for the spec's display target **General Sans** (geometric, similar vibe). Swap the font family here when brand fonts are licensed.

- [ ] **Step 2: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Create `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 4: Replace `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

> If `npx expo install react-native-reanimated` pulled Reanimated 4 (Expo SDK 53+), the bundler will tell you to use `'react-native-worklets/plugin'` instead of `'react-native-reanimated/plugin'`. Use whichever the install output / startup error names.

- [ ] **Step 5: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Verify types still compile**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: configure NativeWind with Phantom design tokens"
```

---

## Task 5: Theme tokens + ThemeProvider (dark/light/system)

**Files:**
- Create: `src/lib/theme/tokens.ts`
- Create: `src/lib/theme/resolveScheme.ts`
- Create: `src/lib/theme/ThemeProvider.tsx`
- Test: `src/lib/theme/__tests__/resolveScheme.test.ts`

- [ ] **Step 1: Create the color token source of truth**

**Files:** Create `src/lib/theme/tokens.ts`

```ts
export type ColorScheme = 'dark' | 'light';
export type ThemePreference = 'dark' | 'light' | 'system';

export const palette = {
  brand: '#AB9FF2',
  brandDeep: '#7C5CFF',
  tier: {
    A: { from: '#F5C451', to: '#E0A93C' },
    B: { from: '#AB9FF2', to: '#7C5CFF' },
    C: { from: '#3DDC97', to: '#2BB67D' },
  },
} as const;

export const themes = {
  dark: {
    bg: '#18181B',
    surface: '#232328',
    elevated: '#2C2C32',
    hairline: 'rgba(255,255,255,0.08)',
    text: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textMuted: '#6B6B74',
    brand: '#AB9FF2',
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F6F5FA',
    elevated: '#FFFFFF',
    hairline: 'rgba(0,0,0,0.06)',
    text: '#1A1A1F',
    textSecondary: '#6B6B74',
    textMuted: '#9B9BA5',
    brand: '#7C5CFF',
  },
} as const;

export type ThemeColors = (typeof themes)['dark'];
```

- [ ] **Step 2: Write the failing test for scheme resolution**

**Files:** Create `src/lib/theme/__tests__/resolveScheme.test.ts`

```ts
import { resolveScheme } from '../resolveScheme';

describe('resolveScheme', () => {
  it('returns the explicit preference when not system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('follows the system scheme when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('defaults to dark when system scheme is null', () => {
    expect(resolveScheme('system', null)).toBe('dark');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npm test -- resolveScheme
```

Expected: FAIL — `Cannot find module '../resolveScheme'`.

- [ ] **Step 4: Implement `resolveScheme`**

**Files:** Create `src/lib/theme/resolveScheme.ts`

```ts
import type { ColorScheme, ThemePreference } from './tokens';

export function resolveScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null
): ColorScheme {
  if (preference === 'system') {
    return systemScheme ?? 'dark';
  }
  return preference;
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npm test -- resolveScheme
```

Expected: PASS (3 tests).

- [ ] **Step 6: Implement the ThemeProvider**

**Files:** Create `src/lib/theme/ThemeProvider.tsx`

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { resolveScheme } from './resolveScheme';
import { themes, type ThemeColors, type ThemePreference } from './tokens';

const STORAGE_KEY = 'pacergo.themePreference';

type ThemeContextValue = {
  scheme: 'dark' | 'light';
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() ?? null;
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'dark' || v === 'light' || v === 'system') {
        setPreferenceState(v);
      }
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const scheme = resolveScheme(preference, system);

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, colors: themes[scheme], preference, setPreference }),
    [scheme, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: theme tokens and dark/light/system ThemeProvider"
```

---

## Task 6: i18n + locale-aware formatters

**Files:**
- Create: `src/locales/en.json`
- Create: `src/locales/zh-Hant.json`
- Create: `src/lib/i18n/index.ts`
- Create: `src/lib/format/index.ts`
- Test: `src/lib/format/__tests__/format.test.ts`

- [ ] **Step 1: Create translation files**

**Files:** Create `src/locales/en.json`

```json
{
  "tabs": { "discover": "Discover", "bookings": "Bookings", "chat": "Chat", "profile": "Profile" },
  "common": { "free": "Free", "loading": "Loading…", "retry": "Retry" },
  "discover": { "title": "Find a companion" },
  "bookings": { "title": "Your bookings" },
  "chatScreen": { "title": "Messages" },
  "profile": { "title": "Profile" }
}
```

**Files:** Create `src/locales/zh-Hant.json`

```json
{
  "tabs": { "discover": "探索", "bookings": "預約", "chat": "訊息", "profile": "個人檔案" },
  "common": { "free": "免費", "loading": "載入中…", "retry": "重試" },
  "discover": { "title": "尋找夥伴" },
  "bookings": { "title": "你的預約" },
  "chatScreen": { "title": "訊息" },
  "profile": { "title": "個人檔案" }
}
```

- [ ] **Step 2: Create the i18n initializer**

**Files:** Create `src/lib/i18n/index.ts`

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from '../../locales/en.json';
import zhHant from '../../locales/zh-Hant.json';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const initialLng = deviceLanguage === 'zh' ? 'zh-Hant' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-Hant': { translation: zhHant },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 3: Write the failing test for formatters**

**Files:** Create `src/lib/format/__tests__/format.test.ts`

```ts
import { formatNTD, formatDistanceMeters } from '../index';

describe('formatNTD', () => {
  it('formats whole NTD amounts with no decimals', () => {
    expect(formatNTD(1200)).toBe('NT$1,200');
  });

  it('shows Free when amount is 0 in English', () => {
    expect(formatNTD(0, 'en')).toBe('Free');
  });

  it('shows the localized Free label in Traditional Chinese', () => {
    expect(formatNTD(0, 'zh-Hant')).toBe('免費');
  });
});

describe('formatDistanceMeters', () => {
  it('shows meters under 1km', () => {
    expect(formatDistanceMeters(450)).toBe('450 m');
  });

  it('shows one-decimal km at or above 1km', () => {
    expect(formatDistanceMeters(1500)).toBe('1.5 km');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

```bash
npm test -- format
```

Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 5: Implement the formatters**

**Files:** Create `src/lib/format/index.ts`

```ts
type Locale = 'en' | 'zh-Hant';

const FREE_LABEL: Record<Locale, string> = {
  en: 'Free',
  'zh-Hant': '免費',
};

export function formatNTD(amount: number, locale: Locale = 'en'): string {
  if (amount <= 0) return FREE_LABEL[locale];
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
```

- [ ] **Step 6: Run it to verify it passes**

```bash
npm test -- format
```

Expected: PASS (5 tests). If `Intl.NumberFormat` currency output differs (e.g. `$` vs `NT$`) on this Hermes build, adjust the assertion to match Hermes' ICU output and note it — the formatter is correct; only the expected string may need alignment to the runtime's ICU data.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: i18n setup (en/zh-Hant) and NTD/distance formatters"
```

---

## Task 7: Supabase client singleton + env

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore` (ensure `.env` ignored)
- Create: `src/lib/supabase/client.ts`
- Test: `src/lib/supabase/__tests__/client.test.ts`

- [ ] **Step 1: Create `.env` with the project's client-safe values**

```
EXPO_PUBLIC_SUPABASE_URL=https://kezkrcyfnjlugkrcbwmy.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_39MYXV0_qsyEYsqFKC_OlA_qM7I0ZC5
```

- [ ] **Step 2: Create `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 3: Ensure `.env` is gitignored**

**Files:** Modify `.gitignore` — confirm it contains a line `.env` (the Expo template usually does). If not, append:

```
.env
```

- [ ] **Step 4: Create the Supabase client**

**Files:** Create `src/lib/supabase/client.ts`

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 5: Write a test that the client builds with env set**

**Files:** Create `src/lib/supabase/__tests__/client.test.ts`

```ts
describe('supabase client', () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
  });

  it('exports a client with auth and from()', () => {
    const { supabase } = require('../client');
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.from).toBe('function');
  });
});
```

- [ ] **Step 6: Run it to verify it passes**

```bash
npm test -- supabase
```

Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Supabase client singleton with AsyncStorage session"
```

---

## Task 8: Core component kit primitives

**Files:**
- Create: `src/components/ui/AppText.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/TierBadge.tsx`
- Create: `src/components/ui/PriceTag.tsx`
- Test: `src/components/ui/__tests__/TierBadge.test.tsx`
- Test: `src/components/ui/__tests__/PriceTag.test.tsx`
- Test: `src/components/ui/__tests__/Button.test.tsx`

- [ ] **Step 1: Create `AppText`**

**Files:** Create `src/components/ui/AppText.tsx`

```tsx
import { Text, type TextProps } from 'react-native';

type Variant = 'display' | 'h1' | 'h2' | 'body' | 'caption';

const variantClass: Record<Variant, string> = {
  display: 'font-display text-[32px] leading-[40px] text-dark-text',
  h1: 'font-display text-[28px] leading-[34px] text-dark-text',
  h2: 'font-sans-semibold text-[22px] leading-[28px] text-dark-text',
  body: 'font-sans text-[16px] leading-[22px] text-dark-text',
  caption: 'font-sans text-[13px] leading-[18px] text-dark-text-secondary',
};

export function AppText({
  variant = 'body',
  className,
  ...props
}: TextProps & { variant?: Variant; className?: string }) {
  return <Text className={`${variantClass[variant]} ${className ?? ''}`} {...props} />;
}
```

- [ ] **Step 2: Create `Card`**

**Files:** Create `src/components/ui/Card.tsx`

```tsx
import { View, type ViewProps } from 'react-native';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-lg bg-dark-surface p-4 ${className ?? ''}`}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Write the failing test for `TierBadge`**

**Files:** Create `src/components/ui/__tests__/TierBadge.test.tsx`

```tsx
import { render } from '@testing-library/react-native';
import { TierBadge } from '../TierBadge';

describe('TierBadge', () => {
  it('renders the tier letter', () => {
    const { getByText } = render(<TierBadge tier="A" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('exposes an accessibility label naming the tier', () => {
    const { getByLabelText } = render(<TierBadge tier="C" />);
    expect(getByLabelText('Tier C')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

```bash
npm test -- TierBadge
```

Expected: FAIL — `Cannot find module '../TierBadge'`.

- [ ] **Step 5: Implement `TierBadge`**

**Files:** Create `src/components/ui/TierBadge.tsx`

```tsx
import { View, Text } from 'react-native';
import { palette } from '../../lib/theme/tokens';

export type Tier = 'A' | 'B' | 'C';

export function TierBadge({ tier }: { tier: Tier }) {
  const color = palette.tier[tier].to;
  return (
    <View
      accessibilityLabel={`Tier ${tier}`}
      style={{ backgroundColor: color }}
      className="h-6 w-6 items-center justify-center rounded-full"
    >
      <Text className="font-sans-semibold text-[13px] text-white">{tier}</Text>
    </View>
  );
}
```

- [ ] **Step 6: Run it to verify it passes**

```bash
npm test -- TierBadge
```

Expected: PASS (2 tests).

- [ ] **Step 7: Write the failing test for `PriceTag`**

**Files:** Create `src/components/ui/__tests__/PriceTag.test.tsx`

```tsx
import { render } from '@testing-library/react-native';
import { PriceTag } from '../PriceTag';

describe('PriceTag', () => {
  it('formats a paid amount as NTD', () => {
    const { getByText } = render(<PriceTag amount={1200} />);
    expect(getByText('NT$1,200')).toBeTruthy();
  });

  it('shows Free for a zero amount', () => {
    const { getByText } = render(<PriceTag amount={0} />);
    expect(getByText('Free')).toBeTruthy();
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

```bash
npm test -- PriceTag
```

Expected: FAIL — `Cannot find module '../PriceTag'`.

- [ ] **Step 9: Implement `PriceTag`**

**Files:** Create `src/components/ui/PriceTag.tsx`

```tsx
import { Text } from 'react-native';
import { formatNTD } from '../../lib/format';

export function PriceTag({
  amount,
  locale = 'en',
}: {
  amount: number;
  locale?: 'en' | 'zh-Hant';
}) {
  return (
    <Text className="font-sans-semibold text-[16px] text-dark-text">
      {formatNTD(amount, locale)}
    </Text>
  );
}
```

- [ ] **Step 10: Run it to verify it passes**

```bash
npm test -- PriceTag
```

Expected: PASS (2 tests). (If Task 6 Step 6 required an ICU string adjustment, use the same NTD string here.)

- [ ] **Step 11: Write the failing test for `Button`**

**Files:** Create `src/components/ui/__tests__/Button.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its label', () => {
    const { getByText } = render(<Button label="Request" onPress={() => {}} />);
    expect(getByText('Request')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Request" onPress={onPress} />);
    fireEvent.press(getByText('Request'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="Request" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Request'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 12: Run it to verify it fails**

```bash
npm test -- Button
```

Expected: FAIL — `Cannot find module '../Button'`.

- [ ] **Step 13: Implement `Button`**

**Files:** Create `src/components/ui/Button.tsx`

```tsx
import { Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const containerClass: Record<Variant, string> = {
  primary: 'bg-brand-deep',
  secondary: 'bg-dark-surface border border-white/10',
  ghost: 'bg-transparent',
  destructive: 'bg-danger',
};

const labelClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-dark-text',
  ghost: 'text-brand',
  destructive: 'text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`h-12 items-center justify-center rounded-md px-5 ${containerClass[variant]} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Text className={`font-sans-semibold text-[16px] ${labelClass[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 14: Run it to verify it passes**

```bash
npm test -- Button
```

Expected: PASS (3 tests).

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: core UI kit (AppText, Card, Button, TierBadge, PriceTag)"
```

---

## Task 9: Root providers + navigation skeleton

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/bookings.tsx`
- Create: `app/(tabs)/chat.tsx`
- Create: `app/(tabs)/profile.tsx`
- Create: `src/lib/query/client.ts`

- [ ] **Step 1: Create the Query client**

**Files:** Create `src/lib/query/client.ts`

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
```

- [ ] **Step 2: Create the root layout with providers and font loading**

**Files:** Create `app/_layout.tsx`

```tsx
import '../global.css';
import '../src/lib/i18n';
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
import { ThemeProvider } from '../src/lib/theme/ThemeProvider';
import { queryClient } from '../src/lib/query/client';
import { supabase } from '../src/lib/supabase/client';

SplashScreen.preventAutoHideAsync();

// Keep Supabase session auto-refresh tied to app foreground state.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

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
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Install the splash-screen module used above**

```bash
npx expo install expo-splash-screen
```

- [ ] **Step 4: Create the tab navigator**

**Files:** Create `app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Compass, CalendarCheck, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../../src/lib/theme/ThemeProvider';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 5: Create the four placeholder tab screens**

**Files:** Create `app/(tabs)/index.tsx`

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui/AppText';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="h1">{t('discover.title')}</AppText>
      </View>
    </SafeAreaView>
  );
}
```

**Files:** Create `app/(tabs)/bookings.tsx`

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui/AppText';

export default function BookingsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="h1">{t('bookings.title')}</AppText>
      </View>
    </SafeAreaView>
  );
}
```

**Files:** Create `app/(tabs)/chat.tsx`

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui/AppText';

export default function ChatScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="h1">{t('chatScreen.title')}</AppText>
      </View>
    </SafeAreaView>
  );
}
```

**Files:** Create `app/(tabs)/profile.tsx`

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui/AppText';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="h1">{t('profile.title')}</AppText>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Verify types compile and the bundler starts**

```bash
npx tsc --noEmit
npx expo start --no-dev --max-workers 1 &
sleep 25 && kill %1
```

Expected: `tsc` passes; `expo start` reaches "Waiting on http://localhost:8081" / bundles without a red error before being killed. (Manual: open in Expo Go / a simulator to see the four themed tabs.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: root providers and 4-tab navigation skeleton"
```

---

## Task 10: Foundational database schema (Supabase migrations)

**Files:**
- Create: `supabase/migrations/0001_foundation.sql`

These migrations are applied to the existing Supabase project. Apply them with the Supabase MCP `apply_migration` tool (name: `foundation`) using the SQL below, **or** via the Supabase CLI (`supabase db push`) if the local stack is linked. After applying, verify with `list_tables`.

- [ ] **Step 1: Write the migration**

**Files:** Create `supabase/migrations/0001_foundation.sql`

```sql
-- Extensions
create extension if not exists postgis;

-- Enums
do $$ begin
  create type tier_level as enum ('A', 'B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  bio text,
  gender text,
  birthdate date,
  locale text not null default 'en',
  experience_level experience_level,
  location geography(Point, 4326),
  home_area text,
  is_companion boolean not null default false,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- activities taxonomy
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh text not null,
  icon text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- seeker activity interests
create table if not exists profile_activities (
  profile_id uuid not null references profiles (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  primary key (profile_id, activity_id)
);

-- Seed activities: Gym active, others inactive (enabled later)
insert into activities (slug, name_en, name_zh, icon, is_active) values
  ('gym',        'Gym / Strength', '健身 / 重訓', 'dumbbell', true),
  ('running',    'Running',        '跑步',        'footprints', false),
  ('hiking',     'Hiking',         '登山健行',     'mountain', false),
  ('cycling',    'Cycling',        '騎車',        'bike', false),
  ('yoga',       'Yoga',           '瑜珈',        'flower', false),
  ('swimming',   'Swimming',       '游泳',        'waves', false),
  ('boxing',     'Boxing / Martial Arts', '拳擊 / 武術', 'shield', false),
  ('basketball', 'Basketball',     '籃球',        'circle', false)
on conflict (slug) do nothing;

-- handle new auth user -> create profile row
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table activities enable row level security;
alter table profile_activities enable row level security;

-- profiles: any authenticated user can read; only owner writes own row
drop policy if exists "profiles readable by authenticated" on profiles;
create policy "profiles readable by authenticated"
  on profiles for select to authenticated using (true);

drop policy if exists "profiles owner can update" on profiles;
create policy "profiles owner can update"
  on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles owner can insert" on profiles;
create policy "profiles owner can insert"
  on profiles for insert to authenticated with check (auth.uid() = id);

-- activities: readable by everyone authenticated; no client writes
drop policy if exists "activities readable" on activities;
create policy "activities readable"
  on activities for select to authenticated using (true);

-- profile_activities: owner manages own rows
drop policy if exists "profile_activities owner read" on profile_activities;
create policy "profile_activities owner read"
  on profile_activities for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "profile_activities owner write" on profile_activities;
create policy "profile_activities owner write"
  on profile_activities for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
```

- [ ] **Step 2: Apply the migration**

Apply `supabase/migrations/0001_foundation.sql` via the Supabase MCP `apply_migration` tool (migration name `foundation`). If the migration runs through the MCP, the SQL executes against the remote project directly.

Expected: success with no errors.

- [ ] **Step 3: Verify the schema landed**

Use the Supabase MCP `list_tables` tool (or run via `execute_sql`):

```sql
select slug, is_active from activities order by slug;
```

Expected: 8 rows; `gym` has `is_active = true`, all others `false`.

- [ ] **Step 4: Create the storage buckets**

Run this SQL via the Supabase MCP `execute_sql` tool (buckets are not part of the schema diff):

```sql
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('listing-photos', 'listing-photos', true),
  ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;
```

Expected: 3 buckets exist; `verification-docs` is **private** (`public = false`).

- [ ] **Step 5: Commit the migration file**

```bash
git add supabase/migrations/0001_foundation.sql
git commit -m "feat: foundational DB schema (profiles, activities, RLS, buckets)"
```

---

## Task 11: Project README and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

**Files:** Create `README.md`

```markdown
# Pacergo

Find an in-person workout companion in Taiwan — from certified pro trainers (Tier A) to experienced peers (Tier B) to training buddies (Tier C). React Native (Expo) + Supabase.

See the design spec at `docs/superpowers/specs/2026-06-12-pacergo-design.md`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase values.
3. `npx expo start`

## Scripts

- `npm test` — run the Jest test suite
- `npx expo start` — start the dev server
- `npx tsc --noEmit` — type-check

## Stack

Expo · expo-router · NativeWind · i18next (en / zh-Hant) · Supabase · TanStack Query · Zustand.
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all suites pass (sanity, resolveScheme, format, supabase, TierBadge, PriceTag, Button).

- [ ] **Step 3: Type-check the whole project**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: add project README"
```

---

## Done — M0 acceptance

- [ ] Expo app boots to a 4-tab skeleton (Discover / Bookings / Chat / Profile), themed from the Phantom token palette.
- [ ] Dark/light/system theme preference resolves and persists.
- [ ] UI strings render from i18next; switching device language to Chinese shows `zh-Hant`.
- [ ] NTD / distance formatters and the core UI kit (AppText, Card, Button, TierBadge, PriceTag) are tested and green.
- [ ] Supabase client connects; `profiles`, `activities` (Gym active), `profile_activities` exist with RLS; storage buckets created (`verification-docs` private).
- [ ] `npm test` and `npx tsc --noEmit` both pass.

**Next milestone:** M1 — Auth & Onboarding (Google/Apple sign-in, seeker onboarding wizard, profile + settings). Plan it with the writing-plans skill when ready.
