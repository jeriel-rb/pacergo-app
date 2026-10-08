# PacerGo Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PacerGo product web app (Home, Trainer list/detail, social auth, app shell) into `apps/web`, backed by shared `@pacergo/shared` types and an env-gated `@pacergo/api` mock layer.

**Architecture:** Yarn-workspace monorepo. Domain types/enums live in `@pacergo/shared` (pure TS, RN-ready); data access in `@pacergo/api` (mock now, Supabase-SSR later, selected by env). The Next.js 15 App Router web app consumes both: Server Components fetch via `@pacergo/api`; small Client Components handle the category filter, theme, language, and save toggles. Components are layered shadcn primitives → token-bound design-system atoms → feature components.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind v4, shadcn/ui (new-york, lucide, CSS variables), next-themes, i18next + react-i18next + next-i18n-router, @supabase/ssr, Vitest + Testing Library.

## Global Constraints

- Visual: blue primary `#2563EB`; hero gradient `#2563EB → #3B82F6`. Reuse mobile radius scale (sm `10px`, md `16px`, lg `20px`, xl `28px`) and light/dark surface structure, recolored blue.
- Default theme: **light** (next-themes `defaultTheme="light"`, class strategy, no system default).
- i18n: locales `['zh','en']`, **defaultLocale `zh`**, `prefixDefault: false` (`/` = zh, `/en/...` = en). All user-facing copy via i18next keys — no hardcoded strings in components.
- Tier enum stays `'A' | 'B' | 'C'`; Chinese labels are display-only (A→社群頂流, B→資深專業, C→陽光搭子).
- Data: env-gated. `USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL`. v1 returns mock; no UI change to flip to Supabase.
- Shared-package field names mirror DB/mobile (`display_name`, `photo_url`, `price_ntd`, `rating_avg`, `rating_count`).
- Node ≥ 20, Yarn 4 workspaces. Web package name `@pacergo/web`.
- Reference patterns (do not copy app-specific logic): `/Users/jeriel/Documents/GitLab/optserv-next/apps/web`.

---

## File Structure

**`packages/shared/src/`**
- `enums/tier.ts`, `enums/activity.ts`, `enums/booking.ts`, `enums/experience.ts` — enums + value arrays
- `constants/tier-labels.ts`, `constants/activity-meta.ts` — display maps (zh/en, icon, color intent)
- `types/trainer.ts`, `types/booking.ts` — domain types
- `index.ts` — barrel re-export

**`packages/api/src/`**
- `supabase-client.ts` — env-gated `@supabase/ssr` browser/server factory + `USE_MOCK`
- `mock/trainers.ts`, `mock/activities.ts` — fixtures typed with shared types
- `queries/trainers.ts` — `getRecommendedTrainers`, `getTrainerById`
- `queries/activities.ts` — `getActivities`
- `index.ts` — barrel re-export

**`apps/web/`**
- `package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `components.json`, `vitest.config.ts`, `vitest.setup.ts`, `.env.example`, `.eslintrc`/`eslint.config.mjs`
- `src/middleware.ts` — i18n-only middleware
- `src/lib/utils.ts` — `cn`
- `src/lib/i18n/config.ts`, `src/lib/i18n/init.ts` — i18n config + initTranslations
- `src/locales/zh.json`, `src/locales/en.json`
- `src/providers/i18n-provider.tsx`, `src/providers/theme-provider.tsx`, `src/providers/index.tsx`
- `src/app/[locale]/layout.tsx`, `src/app/[locale]/globals.css`
- `src/app/[locale]/(tabs)/layout.tsx`, `page.tsx`, `trainers/page.tsx`, `trainers/[id]/page.tsx`, `community/page.tsx`, `messages/page.tsx`, `profile/page.tsx`
- `src/app/[locale]/(auth)/sign-in/page.tsx`, `(auth)/sign-up/page.tsx`
- `src/shared/components/ui/*` — shadcn primitives
- `src/shared/components/atoms/*` — TierBadge, PriceTag, RatingStars, ActivityChip, SectionCard, ProgressBar, GradientHeader
- `src/shared/components/shell/*` — AppHeader, BottomNav, ThemeToggle, LanguageSwitcher
- `src/features/home/*` — HeroBanner, QuickActionsGrid, WeeklyProgressCard, CategoryFilter, TrainerCard, RecommendedTrainers, filterTrainers.ts
- `src/features/trainer/*` — TrainerDetailHeader, ServiceTags, BioSection, GymMemberships, AvailabilityList, ReviewsSection, PlatformManagerCard, BookingCTA
- `src/features/auth/*` — AuthCard, SocialButtons, signInWithProvider.ts

---

## Task 1: `@pacergo/shared` — enums, constants, types

**Files:**
- Create: `packages/shared/src/enums/{tier,activity,booking,experience}.ts`
- Create: `packages/shared/src/constants/{tier-labels,activity-meta}.ts`
- Create: `packages/shared/src/types/{trainer,booking}.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/shared.test.ts`
- Modify: `packages/shared/package.json` (add vitest), `packages/shared/tsconfig.json` if needed

**Interfaces — Produces:**
- `Tier = 'A' | 'B' | 'C'`; `TIERS: Tier[]`
- `ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'`
- `BookingStatus = 'requested'|'accepted'|'declined'|'cancelled'|'completed'|'expired'`
- `ActivitySlug = 'gym'|'running'|'hiking'|'cycling'|'yoga'|'swimming'|'boxing'|'basketball'`
- `TIER_LABELS: Record<Tier, { zh: string; en: string }>`
- `TIER_INTENT: Record<Tier, 'primary'|'dark'|'soft'>`
- `ACTIVITY_META: Record<ActivitySlug, { icon: string; zh: string; en: string }>`
- `TrainerSummary`, `TrainerProfile`, `Offering`, `Review`, `AvailabilitySlot`, `GymMembership`, `PlatformManager`

- [ ] **Step 1: Write enums and value arrays**

`packages/shared/src/enums/tier.ts`:
```ts
export type Tier = 'A' | 'B' | 'C';
export const TIERS: readonly Tier[] = ['A', 'B', 'C'] as const;
```
`packages/shared/src/enums/experience.ts`:
```ts
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'] as const;
```
`packages/shared/src/enums/booking.ts`:
```ts
export type BookingStatus =
  | 'requested' | 'accepted' | 'declined' | 'cancelled' | 'completed' | 'expired';
export const BOOKING_STATUSES: readonly BookingStatus[] =
  ['requested', 'accepted', 'declined', 'cancelled', 'completed', 'expired'] as const;
```
`packages/shared/src/enums/activity.ts`:
```ts
export type ActivitySlug =
  | 'gym' | 'running' | 'hiking' | 'cycling' | 'yoga' | 'swimming' | 'boxing' | 'basketball';
export const ACTIVITY_SLUGS: readonly ActivitySlug[] =
  ['gym', 'running', 'hiking', 'cycling', 'yoga', 'swimming', 'boxing', 'basketball'] as const;
```

- [ ] **Step 2: Write display-constant maps**

`packages/shared/src/constants/tier-labels.ts`:
```ts
import type { Tier } from '../enums/tier';
export const TIER_LABELS: Record<Tier, { zh: string; en: string }> = {
  A: { zh: '社群頂流', en: 'Top Tier' },
  B: { zh: '資深專業', en: 'Senior Pro' },
  C: { zh: '陽光搭子', en: 'Buddy' },
};
export const TIER_INTENT: Record<Tier, 'primary' | 'dark' | 'soft'> = {
  A: 'primary', B: 'dark', C: 'soft',
};
```
`packages/shared/src/constants/activity-meta.ts`:
```ts
import type { ActivitySlug } from '../enums/activity';
export const ACTIVITY_META: Record<ActivitySlug, { icon: string; zh: string; en: string }> = {
  gym: { icon: 'dumbbell', zh: '健身', en: 'Gym' },
  running: { icon: 'footprints', zh: '陪跑', en: 'Running' },
  hiking: { icon: 'mountain', zh: '陪爬', en: 'Hiking' },
  cycling: { icon: 'bike', zh: '騎車', en: 'Cycling' },
  yoga: { icon: 'flower', zh: '瑜珈', en: 'Yoga' },
  swimming: { icon: 'waves', zh: '游泳', en: 'Swimming' },
  boxing: { icon: 'shield', zh: '拳擊', en: 'Boxing' },
  basketball: { icon: 'circle', zh: '籃球', en: 'Basketball' },
};
```

- [ ] **Step 3: Write domain types**

`packages/shared/src/types/trainer.ts`:
```ts
import type { Tier } from '../enums/tier';
import type { ExperienceLevel } from '../enums/experience';
import type { ActivitySlug } from '../enums/activity';

export interface TrainerSummary {
  id: string;
  display_name: string;
  photo_url: string | null;
  tier: Tier;
  activities: ActivitySlug[];
  home_area: string;
  price_ntd: number;
  is_free: boolean;
  rating_avg: number;
  rating_count: number;
  experience_level: ExperienceLevel | null;
}

export interface Offering { activity: ActivitySlug; tier: Tier; price_ntd: number; is_free: boolean; session_minutes: number; }
export interface AvailabilitySlot { weekday: number; start_minute: number; end_minute: number; }
export interface GymMembership { name: string; branch: string | null; }
export interface Review { id: string; author_name: string; rating: number; comment: string | null; created_at: string; }
export interface PlatformManager { name: string; region: string; note_zh: string; note_en: string; }

export interface TrainerProfile extends TrainerSummary {
  bio: string;
  certifications: string[];
  offerings: Offering[];
  gym_memberships: GymMembership[];
  availability: AvailabilitySlot[];
  reviews: Review[];
  manager: PlatformManager | null;
  is_bidding: boolean;
}
```
`packages/shared/src/types/booking.ts`:
```ts
import type { Tier } from '../enums/tier';
import type { BookingStatus } from '../enums/booking';
import type { ActivitySlug } from '../enums/activity';

export interface Booking {
  id: string;
  trainer_id: string;
  activity: ActivitySlug | null;
  tier: Tier | null;
  status: BookingStatus;
  scheduled_start: string | null;
  duration_min: number;
  agreed_price: number;
  is_free: boolean;
  created_at: string;
}
```

- [ ] **Step 4: Barrel export** — `packages/shared/src/index.ts`:
```ts
export * from './enums/tier';
export * from './enums/activity';
export * from './enums/booking';
export * from './enums/experience';
export * from './constants/tier-labels';
export * from './constants/activity-meta';
export * from './types/trainer';
export * from './types/booking';
```

- [ ] **Step 5: Write tests** — `packages/shared/src/__tests__/shared.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TIERS, TIER_LABELS, TIER_INTENT, ACTIVITY_META, ACTIVITY_SLUGS } from '../index';

describe('shared domain constants', () => {
  it('has a label for every tier in zh and en', () => {
    for (const t of TIERS) {
      expect(TIER_LABELS[t].zh.length).toBeGreaterThan(0);
      expect(TIER_LABELS[t].en.length).toBeGreaterThan(0);
    }
  });
  it('maps every tier to a badge intent', () => {
    for (const t of TIERS) expect(['primary', 'dark', 'soft']).toContain(TIER_INTENT[t]);
  });
  it('has meta for every activity slug', () => {
    for (const s of ACTIVITY_SLUGS) {
      expect(ACTIVITY_META[s].icon.length).toBeGreaterThan(0);
      expect(ACTIVITY_META[s].zh.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 6: Add vitest to package** — `packages/shared/package.json` scripts: `"test": "vitest run"`; devDeps: `vitest`. Run `yarn workspace @pacergo/shared test`. Expected: PASS.

- [ ] **Step 7: Commit** — `git add packages/shared && git commit -m "feat(shared): domain enums, display maps, and trainer/booking types"`

---

## Task 2: `@pacergo/api` — env-gated mock data layer

**Files:**
- Create: `packages/api/src/supabase-client.ts`, `mock/{trainers,activities}.ts`, `queries/{trainers,activities}.ts`
- Modify: `packages/api/src/index.ts`, `packages/api/package.json`
- Create: `packages/api/src/__tests__/queries.test.ts`

**Interfaces:**
- Consumes: `@pacergo/shared` (`TrainerSummary`, `TrainerProfile`, `ActivitySlug`, `Tier`).
- Produces:
  - `USE_MOCK: boolean`
  - `getRecommendedTrainers(opts?: { activity?: ActivitySlug }): Promise<TrainerSummary[]>`
  - `getTrainerById(id: string): Promise<TrainerProfile | null>`
  - `getActivities(): Promise<{ slug: ActivitySlug; is_active: boolean }[]>`

- [ ] **Step 1: Env-gate + supabase client** — `packages/api/src/supabase-client.ts`:
```ts
export const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;
// Lazy Supabase client; only constructed when env is present. Mock path never imports it.
export async function getSupabaseBrowser() {
  const { createBrowserClient } = await import('@supabase/ssr');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Mock fixtures** — `packages/api/src/mock/trainers.ts` exports `MOCK_TRAINERS: TrainerProfile[]` matching screenshots: 王建宏 (C, gym, NT$650, 信義區, 4.9), 李雅婷 (B, gym+running, NT$1000, 中山區, 4.8), 張偉誠 (A, gym+hiking, NT$1800, 大安區, 5.0), 陳怡君 (C, gym, NT$650, 萬華區, 4.6), 林俊傑 (B, hiking, NT$900, 松山區, 4.8), 吳宜蓁 (C, running+hiking, NT$700, 文山區, 4.5). Detail-rich entry 林雅婷 (A, gym+running, NT$1500, 大安區, 4.8, 127 ratings, bio, NSCA certs, gyms World Gym 大安/健身工廠 信義, availability Mon/Wed 9–18 Fri 14–21, manager 張志明/台北市, is_bidding true). `mock/activities.ts` exports active gym/running/hiking + inactive rest.

- [ ] **Step 3: Query functions** — `packages/api/src/queries/trainers.ts`:
```ts
import type { ActivitySlug, TrainerSummary, TrainerProfile } from '@pacergo/shared';
import { USE_MOCK } from '../supabase-client';
import { MOCK_TRAINERS } from '../mock/trainers';

const toSummary = (t: TrainerProfile): TrainerSummary => ({
  id: t.id, display_name: t.display_name, photo_url: t.photo_url, tier: t.tier,
  activities: t.activities, home_area: t.home_area, price_ntd: t.price_ntd,
  is_free: t.is_free, rating_avg: t.rating_avg, rating_count: t.rating_count,
  experience_level: t.experience_level,
});

export async function getRecommendedTrainers(opts?: { activity?: ActivitySlug }): Promise<TrainerSummary[]> {
  if (USE_MOCK) {
    const list = MOCK_TRAINERS.map(toSummary);
    return opts?.activity ? list.filter((t) => t.activities.includes(opts.activity!)) : list;
  }
  throw new Error('Supabase trainers query not implemented yet');
}

export async function getTrainerById(id: string): Promise<TrainerProfile | null> {
  if (USE_MOCK) return MOCK_TRAINERS.find((t) => t.id === id) ?? null;
  throw new Error('Supabase trainer-by-id query not implemented yet');
}
```

- [ ] **Step 4: Tests** — `packages/api/src/__tests__/queries.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getRecommendedTrainers, getTrainerById } from '../queries/trainers';

describe('trainer queries (mock)', () => {
  it('returns all trainers with no filter', async () => {
    expect((await getRecommendedTrainers()).length).toBeGreaterThanOrEqual(6);
  });
  it('filters by activity', async () => {
    const running = await getRecommendedTrainers({ activity: 'running' });
    expect(running.every((t) => t.activities.includes('running'))).toBe(true);
  });
  it('returns a full profile by id and null for unknown', async () => {
    const all = await getRecommendedTrainers();
    expect(await getTrainerById(all[0].id)).not.toBeNull();
    expect(await getTrainerById('nope')).toBeNull();
  });
});
```

- [ ] **Step 5: Barrel + deps + run** — update `index.ts` (`export * from './queries/trainers'; export * from './queries/activities'; export * from './supabase-client';`); add `@supabase/ssr`, `vitest` to `packages/api/package.json`; `"test": "vitest run"`. Run `yarn workspace @pacergo/api test`. Expected: PASS.

- [ ] **Step 6: Commit** — `git add packages/api && git commit -m "feat(api): env-gated mock trainer/activity data layer"`

---

## Task 3: Scaffold `apps/web` (Next 15 + Tailwind v4 + tooling)

**Files:** `apps/web/package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `.env.example`, `src/lib/utils.ts`, `src/app/[locale]/globals.css` (minimal), `src/app/[locale]/layout.tsx` (minimal), placeholder `src/app/[locale]/(tabs)/page.tsx`.

- [ ] **Step 1:** Write `apps/web/package.json` — name `@pacergo/web`; deps: `next@15`, `react@19`, `react-dom@19`, `@pacergo/shared` `workspace:*`, `@pacergo/api` `workspace:*`, `next-themes`, `i18next`, `react-i18next`, `next-i18n-router`, `i18next-resources-to-backend`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@supabase/ssr`, `@supabase/supabase-js`; devDeps: `typescript`, `@types/react`, `@types/node`, `tailwindcss@4`, `@tailwindcss/postcss`, `tw-animate-css`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`, `eslint`, `eslint-config-next`. Scripts: `dev`, `build`, `start`, `lint`, `test`.
- [ ] **Step 2:** `tsconfig.json` with `"paths": { "@/*": ["./src/*"] }`, extending repo `tsconfig.base.json`, `jsx: preserve`, `moduleResolution: bundler`, next plugin (mirror optserv).
- [ ] **Step 3:** `postcss.config.mjs` → `{ plugins: ["@tailwindcss/postcss"] }`. `next.config.ts` minimal (`reactStrictMode`, `transpilePackages: ['@pacergo/shared','@pacergo/api']`). `components.json` (new-york, rsc, lucide, css vars, aliases `@/shared/components`, `@/lib/utils`, ui `@/shared/components/ui`).
- [ ] **Step 4:** `src/lib/utils.ts` with `cn` (clsx + twMerge). Minimal `globals.css` (`@import "tailwindcss"; @import "tw-animate-css"; @custom-variant dark (&:is(.dark *));`) and minimal `[locale]/layout.tsx` returning `<html><body>{children}</body></html>` + a placeholder `(tabs)/page.tsx`.
- [ ] **Step 5:** From repo root `yarn install`; then `yarn workspace @pacergo/web build`. Expected: compiles (placeholder home renders).
- [ ] **Step 6: Commit** — `git add apps/web && git commit -m "chore(web): scaffold Next 15 + Tailwind v4 app shell"`

---

## Task 4: Theme system (blue tokens + next-themes)

**Files:** `apps/web/src/app/[locale]/globals.css` (full tokens), `src/providers/theme-provider.tsx`, `src/shared/components/shell/ThemeToggle.tsx`. Test: `src/shared/components/shell/__tests__/ThemeToggle.test.tsx`.

**Interfaces — Produces:** `ThemeProvider` (wraps next-themes, `defaultTheme="light"`, `attribute="class"`, `enableSystem={false}`); `ThemeToggle` button toggling `light`/`dark`.

- [ ] **Step 1:** Define `:root` (light) and `.dark` CSS variables in `globals.css` using the blue palette. Light: `--background #FFFFFF`, `--card #FFFFFF`, `--muted #F6F7FB`, `--primary #2563EB`, `--primary-foreground #FFFFFF`, `--foreground #14151A`, `--muted-foreground #6B7280`, `--border` `rgba(0,0,0,0.06)`, `--radius 16px`, tier vars `--tier-a #2563EB`, `--tier-b #14151A`, `--tier-c #DBEAFE`. Dark: `--background #18181B`, `--card #232328`, `--muted #2C2C32`, `--foreground #F5F5F7`, `--muted-foreground #A1A1AA`, `--primary #3B82F6`, `--border rgba(255,255,255,0.08)`. Add `@theme inline` mapping `--color-*` and `--radius-*` (sm 10/md 16/lg 20/xl 28) for Tailwind v4 utilities.
- [ ] **Step 2:** `theme-provider.tsx` — `"use client"` wrapper around `next-themes` `ThemeProvider`.
- [ ] **Step 3:** Write failing test for `ThemeToggle` (renders a button with accessible name; clicking calls `setTheme`). Mock `next-themes` `useTheme`.
- [ ] **Step 4:** Implement `ThemeToggle` (lucide `Sun`/`Moon`, reads/sets theme). Run test. Expected: PASS.
- [ ] **Step 5:** Add `suppressHydrationWarning` to `<html>` in `[locale]/layout.tsx`; import `globals.css`. Build. Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -am "feat(web): blue light/dark theme tokens + ThemeToggle"`

---

## Task 5: i18n (config, middleware, provider, locale files, switcher)

**Files:** `src/lib/i18n/config.ts`, `src/lib/i18n/init.ts`, `src/middleware.ts`, `src/providers/i18n-provider.tsx`, `src/locales/{zh,en}.json`, `src/shared/components/shell/LanguageSwitcher.tsx`. Test: `src/lib/i18n/__tests__/config.test.ts`.

**Interfaces — Produces:** `i18nConfig` (`locales ['zh','en']`, `defaultLocale 'zh'`, `prefixDefault false`), `isValidLocale`, `addLocaleToPathname`, `removeLocaleFromPathname`; `initTranslations`; `I18nProvider`; `LanguageSwitcher`.

- [ ] **Step 1:** `config.ts` — adapt optserv `i18n-config.ts` with `locales ['zh','en']`, `defaultLocale 'zh'`. Include `isValidLocale`, `addLocaleToPathname`, `removeLocaleFromPathname`.
- [ ] **Step 2:** Failing test `config.test.ts` — `/` ↔ zh; `addLocaleToPathname('/trainers','en') === '/en/trainers'`; `addLocaleToPathname('/trainers','zh') === '/trainers'`; `removeLocaleFromPathname('/en/trainers') === '/trainers'`.
- [ ] **Step 3:** Implement helpers; run test. Expected: PASS.
- [ ] **Step 4:** `init.ts` — adapt optserv `initTranslations` but resolve from `src/locales/${locale}.json` single namespace `translation` (use `i18next-resources-to-backend` importing the JSON). `i18n-provider.tsx` — adapt optserv provider (single namespace).
- [ ] **Step 5:** `middleware.ts` — thin: `export function middleware(req){ return i18nRouter(req, i18nConfig); }` + matcher excluding `_next`, static assets, `api`.
- [ ] **Step 6:** `src/locales/zh.json` + `en.json` — seed from `apps/mobile/src/locales/{zh-Hant,en}.json` and ADD keys: `nav` (home 首頁/Home, community 社群/Community, trainers 陪練師/Trainer, messages 訊息/Messages, profile 我的/Me), `home` (greeting `Hi, {{name}} 👋`, prompt 今天想一起訓練嗎?/Want to train today?, switchTrainer 切換陪練員, heroTitle 找到你的訓練夥伴/Find your training partner, heroKicker FIND YOUR TRAINING PARTNER, heroSub `6+ 位專業陪練師等你`, quickFind 找夥伴, trainingLog 訓練記錄, aiPlan AI 訓練計劃, hourPack 時數包, quickActions 快速功能, logTraining 記錄訓練, bodyData 身體數據, aiPhoto AI 修圖, dietLog 飲食日誌, weeklyProgress 本週訓練進度, weeklyEn WEEKLY PROGRESS, weeklyCount `{{done}}/{{total}} 完成訓練`, recommended 推薦陪練師, viewAll 查看全部), `category` (all 全部, gym 健身, running 陪跑, hiking 陪爬), `trainerDetail` (services 服務項目, bio 個人簡介, certs 認證資格, gyms 健身房會籍, gymsNote 可在以上健身房進行陪練服務, availability 可預約時段, reviews 用戶評價, noReviews 尚無評價, manager 平台特約經理人, managerRegion 負責區域, bookNow 立即預約, bookHint 預約後陪練師將在 24 小時內確認, perHour /小時, bidding 競標制, ratingCount `({{count}})`), `auth` (extend with signInTitle, signUpTitle, signInSub, signUpSub, continueGoogle, continueApple, haveAccount, noAccount, terms), `placeholder` (comingSoon 即將推出/Coming soon), weekday short names array.
- [ ] **Step 7:** `LanguageSwitcher.tsx` — `"use client"`; uses `usePathname`/`useRouter` + `addLocaleToPathname`/`removeLocaleFromPathname` to swap locale; shows 中文 / EN.
- [ ] **Step 8:** Run i18n test; `yarn workspace @pacergo/web build`. Expected: PASS.
- [ ] **Step 9: Commit** — `git commit -am "feat(web): i18n (zh default/en), middleware, locale files, LanguageSwitcher"`

---

## Task 6: Root providers + `[locale]/layout.tsx` wiring

**Files:** `src/providers/index.tsx`, `src/app/[locale]/layout.tsx`.

**Interfaces:** Consumes `ThemeProvider`, `I18nProvider`. Produces `<Providers locale resources>`.

- [ ] **Step 1:** `providers/index.tsx` — composes `ThemeProvider` + `I18nProvider`, `"use client"`.
- [ ] **Step 2:** `[locale]/layout.tsx` — `generateStaticParams` for `['zh','en']`; load resources via `initTranslations(locale,['translation'])`; set `<html lang={locale} suppressHydrationWarning>`; wrap children in `<Providers locale resources>`. Set `dir`/font. Build. Expected: PASS.
- [ ] **Step 3: Commit** — `git commit -am "feat(web): wire root providers and locale layout"`

---

## Task 7: Design-system atoms

**Files:** `src/shared/components/atoms/{TierBadge,PriceTag,RatingStars,ActivityChip,SectionCard,ProgressBar,GradientHeader}.tsx`. Tests: `__tests__/{TierBadge,PriceTag,RatingStars}.test.tsx`.

**Interfaces — Produces:**
- `TierBadge({ tier, locale?, className? })` — colored badge; label from `TIER_LABELS[tier]`, color from `TIER_INTENT[tier]` (primary→blue solid, dark→near-black, soft→light-blue tint).
- `PriceTag({ amount, isFree?, perHour?, className? })` — `免費`/`Free` when free else `NT$<amount>` + optional `/小時`.
- `RatingStars({ value, count?, size? })` — filled stars for `Math.round(value)`, prints `value` and `(count)`.
- `ActivityChip({ slug, active?, onClick? })` — lucide icon (via name→component map) + label.
- `SectionCard({ icon?, title, children, className? })` — white/elevated rounded card with optional icon+title header.
- `ProgressBar({ value /*0..100*/ })`; `GradientHeader({ children, className? })` — blue gradient container.

- [ ] **Step 1:** Failing test `TierBadge.test.tsx` — renders 社群頂流 for tier A (zh) and Top Tier (en).
- [ ] **Step 2:** Implement `TierBadge` using shared maps + `cn`; run. Expected: PASS.
- [ ] **Step 3:** Failing test `PriceTag.test.tsx` — `amount=650` → `NT$650`; `isFree` → `免費`.
- [ ] **Step 4:** Implement `PriceTag`; run. Expected: PASS.
- [ ] **Step 5:** Failing test `RatingStars.test.tsx` — `value=4.8 count=127` renders `4.8` and `(127)`.
- [ ] **Step 6:** Implement `RatingStars`; run. Expected: PASS.
- [ ] **Step 7:** Implement `ActivityChip`, `SectionCard`, `ProgressBar`, `GradientHeader` (presentational; a lucide icon-name→component map in `src/shared/components/atoms/icon-map.ts`). Build. Expected: PASS.
- [ ] **Step 8: Commit** — `git commit -am "feat(web): token-bound design-system atoms"`

---

## Task 8: shadcn primitives + app shell (header, bottom nav)

**Files:** `src/shared/components/ui/{button,card,avatar,badge,separator,skeleton,sheet,scroll-area,sonner,tabs}.tsx` (via shadcn add or hand-written), `src/shared/components/shell/{AppHeader,BottomNav}.tsx`, `src/app/[locale]/(tabs)/layout.tsx`.

**Interfaces — Produces:** shadcn `Button`, `Card`, `Avatar`, `Badge`, etc.; `AppHeader` (logo, bell, ThemeToggle, LanguageSwitcher); `BottomNav` (5 tabs from `nav.*`, active state from `usePathname`, blue active, center 陪練師 emphasized; on `≥lg` renders as top nav row). `(tabs)/layout.tsx` composes header + content container (`max-w-md` mobile centered, wider on desktop) + BottomNav.

- [ ] **Step 1:** Add shadcn primitives (`npx shadcn@latest add button card avatar badge separator skeleton sheet scroll-area sonner tabs` inside `apps/web`, or hand-write minimal versions if registry unavailable). Verify `cn` alias resolves.
- [ ] **Step 2:** `BottomNav.tsx` — `"use client"`; nav items array (icon, key, href); active via `usePathname` + `removeLocaleFromPathname`; blue active color; center item raised. Responsive: fixed bottom bar `<lg`, inline top row `≥lg`.
- [ ] **Step 3:** `AppHeader.tsx` — PacerGo logo text, notification bell (lucide), `ThemeToggle`, `LanguageSwitcher`. Sticky top.
- [ ] **Step 4:** `(tabs)/layout.tsx` — `<AppHeader/>` + `<main class="mx-auto w-full max-w-md lg:max-w-3xl pb-24 lg:pb-8">{children}</main>` + `<BottomNav/>`. Build. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(web): shadcn primitives + responsive app shell (header, bottom nav)"`

---

## Task 9: Home page (首頁)

**Files:** `src/features/home/{HeroBanner,QuickActionsGrid,WeeklyProgressCard,CategoryFilter,TrainerCard,RecommendedTrainers,filterTrainers}.tsx` + `__tests__/filterTrainers.test.ts`; `src/app/[locale]/(tabs)/page.tsx`.

**Interfaces — Produces:**
- `filterTrainers(list: TrainerSummary[], activity: ActivitySlug | 'all'): TrainerSummary[]`
- `TrainerCard({ trainer, locale })` — avatar/initial, TierBadge, name, area (pin), PriceTag, RatingStars, activity icons, save star.
- `RecommendedTrainers({ trainers, locale })` — `"use client"`; CategoryFilter (all/gym/running/hiking) + responsive grid (`grid-cols-2 lg:grid-cols-3`) filtered client-side.
- Home `page.tsx` — Server Component: `getRecommendedTrainers()` → renders AppHeader greeting, HeroBanner, QuickActionsGrid, WeeklyProgressCard, RecommendedTrainers.

- [ ] **Step 1:** Failing test `filterTrainers.test.ts` — `'all'` returns all; `'running'` returns only running-tagged.
- [ ] **Step 2:** Implement `filterTrainers`; run. Expected: PASS.
- [ ] **Step 3:** Build presentational `HeroBanner` (GradientHeader + kicker/title/sub + arrow), `QuickActionsGrid` (4 tiles: 找夥伴/訓練記錄/AI 訓練計劃/時數包 with lucide icons + soft tinted bg), `WeeklyProgressCard` (label + 0% + ProgressBar + `0/5 完成訓練`).
- [ ] **Step 4:** `TrainerCard` — compose atoms; matches screenshot card (rounded, avatar circle with initial, tier badge pill, name + price row, area pin, stars, activity icon chips, top-right save star).
- [ ] **Step 5:** `CategoryFilter` (`"use client"`, segmented chips, blue active) + `RecommendedTrainers` (state for active category, `filterTrainers`, responsive grid, section header 推薦陪練師 + 查看全部 link).
- [ ] **Step 6:** Home `page.tsx` — fetch trainers, render greeting (use date — `new Date()` formatted to `M月D日週X` zh / weekday en), compose sections. Build + run app (`yarn workspace @pacergo/web dev`), verify visually against screenshot 1.
- [ ] **Step 7: Commit** — `git commit -am "feat(web): home page (hero, quick actions, weekly progress, recommended trainers)"`

---

## Task 10: Trainer list + detail (陪練師)

**Files:** `src/features/trainer/{TrainerDetailHeader,ServiceTags,BioSection,GymMemberships,AvailabilityList,ReviewsSection,PlatformManagerCard,BookingCTA}.tsx`; `src/app/[locale]/(tabs)/trainers/page.tsx`, `trainers/[id]/page.tsx`.

**Interfaces:** Consumes `getRecommendedTrainers`, `getTrainerById`, shared types, atoms. Produces the detail sections + `BookingCTA({ price, isFree, locale })` (sticky blue button + hint line).

- [ ] **Step 1:** `trainers/page.tsx` — Server Component: `getRecommendedTrainers()` → `RecommendedTrainers` reused as full list (CategoryFilter + grid) under page title.
- [ ] **Step 2:** `TrainerDetailHeader` — `GradientHeader` with back button, TierBadge (A1 級 style), name, `社群頂流・競標制` line (tier label + bidding), `RatingStars` (4.8 (127)), area pin, `PriceTag` NT$1,500/小時; right-side photo/avatar.
- [ ] **Step 3:** `ServiceTags` (offerings → ActivityChips: 健身陪練/陪跑), `BioSection` (bio + 認證資格 list), `GymMemberships` (bulleted gyms + note), `AvailabilityList` (weekday slots formatted `週一 9:00–18:00` from `AvailabilitySlot`), `ReviewsSection` (count + 尚無評價 empty), `PlatformManagerCard` (amber card: manager name, region, note). Each wrapped in `SectionCard`.
- [ ] **Step 4:** `BookingCTA` — sticky bottom blue button `立即預約 — NT$1,500 / 小時` + hint `預約後陪練師將在 24 小時內確認`. (Mock: button shows a toast via sonner; no navigation.)
- [ ] **Step 5:** `trainers/[id]/page.tsx` — `getTrainerById(params.id)`; `notFound()` if null; compose header + sections + CTA. Build + dev, verify against screenshot 2.
- [ ] **Step 6: Commit** — `git commit -am "feat(web): trainer list + detail page"`

---

## Task 11: Auth (sign in / sign up, social-only mock)

**Files:** `src/features/auth/{AuthCard,SocialButtons,signInWithProvider}.tsx`; `src/app/[locale]/(auth)/sign-in/page.tsx`, `(auth)/sign-up/page.tsx`.

**Interfaces:** `signInWithProvider(provider: 'google'|'apple'): Promise<void>` (mock → `router.push('/')`). `SocialButtons` (Google/Apple branded buttons). `AuthCard({ mode: 'sign-in'|'sign-up' })`.

- [ ] **Step 1:** `signInWithProvider.ts` — mock that routes home (real OAuth later). `SocialButtons.tsx` — `"use client"`, Google + Apple buttons (lucide / inline svg), calls `signInWithProvider`.
- [ ] **Step 2:** `AuthCard.tsx` — centered card with PacerGo logo, title/subtitle from `auth.*` by mode, `SocialButtons`, footer link toggling sign-in↔sign-up; sign-up adds ToS line. Includes ThemeToggle + LanguageSwitcher top-right.
- [ ] **Step 3:** `sign-in/page.tsx` + `sign-up/page.tsx` — render `AuthCard` with respective mode, centered full-height gradient/blank background. Build. Expected: PASS.
- [ ] **Step 4: Commit** — `git commit -am "feat(web): social-only sign-in/sign-up pages"`

---

## Task 12: Placeholder tabs (社群 / 訊息 / 我的)

**Files:** `src/app/[locale]/(tabs)/{community,messages,profile}/page.tsx`; `src/shared/components/atoms/ComingSoon.tsx`.

- [ ] **Step 1:** `ComingSoon({ titleKey })` atom — centered icon + localized title + `placeholder.comingSoon`.
- [ ] **Step 2:** Three pages rendering `ComingSoon` with their nav title key. Build. Expected: PASS.
- [ ] **Step 3: Commit** — `git commit -am "feat(web): placeholder community/messages/profile tabs"`

---

## Task 13: Final pass — tests, responsive, dark mode, i18n, lint

- [ ] **Step 1:** `vitest.config.ts` (jsdom, `@vitejs/plugin-react`, setup `vitest.setup.ts` with `@testing-library/jest-dom`) + path alias `@`. Run `yarn workspace @pacergo/web test`. Expected: all PASS.
- [ ] **Step 2:** Add a `RatingStars`/`TierBadge` render smoke and `BottomNav` active-state test if missing. Run all workspace tests (`yarn workspace @pacergo/shared test`, `@pacergo/api`, `@pacergo/web`). Expected: green.
- [ ] **Step 3:** `yarn workspace @pacergo/web build` clean. Manually verify in dev: light/dark toggle, zh↔en switch, mobile (375px) bottom nav + desktop (≥1024px) top nav, Home and Trainer detail match screenshots, auth pages render.
- [ ] **Step 4:** `yarn workspace @pacergo/web lint` clean (fix issues).
- [ ] **Step 5: Commit** — `git commit -am "test(web): vitest config + final responsive/theme/i18n pass"`
- [ ] **Step 6:** Update `apps/web/README.md` (scripts, env, structure) + root `README.md` if it lists workspaces. Commit `docs`.

---

## Self-Review

**Spec coverage:** stack (T3) ✓; shared types/enums RN-ready (T1) ✓; env-gated mock api (T2) ✓; blue theme + dark/light default light (T4) ✓; i18n zh-default/en (T5,T6) ✓; atoms + shadcn (T7,T8) ✓; app shell + responsive nav (T8) ✓; Home (T9) ✓; trainer list+detail (T10) ✓; social-only auth (T11) ✓; placeholder tabs (T12) ✓; tests + final pass (T13) ✓. Build order matches spec.

**Type consistency:** `TrainerSummary`/`TrainerProfile` defined in T1, consumed unchanged in T2/T9/T10. `getRecommendedTrainers`/`getTrainerById` signatures identical across T2/T9/T10. `TIER_LABELS`/`TIER_INTENT`/`ACTIVITY_META` defined T1, consumed T7. i18n helpers (`addLocaleToPathname` etc.) defined T5, consumed T5/T8. `signInWithProvider` defined and consumed in T11.

**Placeholder scan:** no TBD/TODO; visual components specify exact props, structure, and source data; testable logic (filter, query, atoms, i18n helpers) has concrete test code.
