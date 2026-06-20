# Pacergo Web App — Design Spec

**Date:** 2026-06-20
**Status:** Approved
**Workspace:** `apps/web` (`@pacergo/web`)

## Goal

Build the Pacergo **product web app** (Next.js, behind auth) into the empty `apps/web`
placeholder. First deliverables: **Home (首頁)**, **Trainer list & detail (陪練師)**, and
**authentication (sign in / sign up)**, plus the app shell (header + bottom navigation) and
placeholder pages for the remaining tabs. The app must be responsive (mobile → tablet →
desktop), support light/dark themes (default **light**), and support i18n with **Traditional
Chinese (zh) as default** and **English (en)** as an option.

Domain types, enums, and the data-access layer live in shared `packages/*` so the future
React Native parity work (and the existing `apps/mobile`) can consume the same source of truth.

## Decisions (locked)

- **Visual direction:** Blue palette from the provided screenshots (primary ≈ `#2563EB`),
  reusing the existing token *architecture* from `apps/mobile` (radius scale, light/dark
  structure) and the `Tier A/B/C` enum underneath. Web is its own visual skin; the DB enum and
  domain names stay aligned with mobile.
- **Page scope now:** Home + Trainer list & detail + Auth built fully. Community (社群),
  Messages (訊息), Profile (我的) are placeholder pages so the nav works end-to-end.
- **Auth:** Social-only (Google / Apple), matching the mobile OAuth-first welcome. Mocked
  until Supabase auth is wired.
- **Data strategy (A):** Server Components fetch from `@pacergo/api`; client interactivity
  (category filter, save toggles) operates on already-loaded data. No data-fetching library
  for v1. Swaps cleanly to Supabase SSR later.
- **Supabase:** Client scaffolded with `@supabase/ssr` but **env-gated** — returns **mock
  data** when `NEXT_PUBLIC_SUPABASE_URL` is absent (current state). No UI changes needed to
  flip to live data.

## Stack

- Next.js 15 (App Router, RSC) · React 19 · TypeScript · Tailwind v4 (CSS-variable theming)
- shadcn/ui — `new-york` style, lucide icons, CSS variables (mirrors optserv-next `components.json`)
- next-themes (default light, class strategy)
- i18next + react-i18next + next-i18n-router (`[locale]` routing)
- `@supabase/ssr` + `@supabase/supabase-js` (env-gated)
- Vitest + Testing Library

Reference for stack/config conventions: `/Users/jeriel/Documents/GitLab/optserv-next/apps/web`.

## Shared packages (React Native–ready)

### `@pacergo/shared` (pure TS, no React)

- **Enums / consts:** `Tier` (`'A'|'B'|'C'`), `ExperienceLevel` (`beginner|intermediate|advanced`),
  `BookingStatus`, `ActivitySlug` (`gym|running|hiking|cycling|yoga|swimming|boxing|basketball`).
- **Display maps:** `TIER_LABELS` (A→社群頂流/Top Tier, B→資深專業/Senior Pro, C→陽光搭子/Buddy)
  with zh+en; `TIER_TOKENS` (badge color intent per tier); `ACTIVITY_META` (slug → icon name,
  zh, en).
- **Domain types:** `TrainerSummary` (discovery card), `TrainerProfile` (detail), `Offering`,
  `Review`, `AvailabilitySlot`, `GymMembership`, `PlatformManager`. Field names mirror the DB /
  `apps/mobile` types (e.g. `display_name`, `photo_url`, `price_ntd`, `rating_avg`) so mobile can
  migrate onto these without churn.

### `@pacergo/api` (data access)

- Query functions returning shared types: `getRecommendedTrainers({ activity? })`,
  `getTrainerById(id)`, `getActivities()`.
- `supabase-client.ts` (using `@supabase/ssr`) + `mock/` fixtures. A `USE_MOCK` switch driven by
  presence of `NEXT_PUBLIC_SUPABASE_URL` selects the source. Today: mock. Mock trainers match the
  screenshots (王建宏, 李雅婷, 張偉誠, 陳怡君, 林俊傑, 吳宜蓁; detail 林雅婷).

## Theme tokens (blue)

CSS variables in `globals.css` (light + dark) consumed by shadcn and custom atoms:

- `--primary` ≈ `#2563EB`; hero gradient `#2563EB → #3B82F6`.
- Tier badges: A = blue solid, B = dark/near-black, C = light-blue tint (per screenshots).
- Reuse mobile radius scale (sm 10 / md 16 / lg 20 / xl 28) and the light/dark surface structure,
  recolored to blue.
- Header exposes `ThemeToggle` (sun/moon) and `LanguageSwitcher` (中文 / EN).

## i18n

- `next-i18n-router`, locales `['zh','en']`, **defaultLocale `zh`**, `prefixDefault: false`
  → `/` = Traditional Chinese, `/en/...` = English.
- Messages in `apps/web/src/locales/{zh,en}.json`, seeded from mobile's `zh-Hant.json` / `en.json`
  plus new keys: home dashboard (hero, quick actions, weekly progress), trainer-detail sections,
  bottom nav.
- Server + client i18n providers following the optserv-next pattern.

## Component architecture (shared-first, then composed)

**Tier 1 — shadcn primitives** (`src/shared/components/ui/`): button, card, badge, avatar, input,
tabs, separator, skeleton, sheet, dialog, scroll-area, sonner.

**Tier 2 — Pacergo design-system atoms** (token-bound, reusable): `TierBadge`, `PriceTag`
(NT$ / 小時), `RatingStars`, `ActivityChip` / `ActivityIcon`, `SectionCard`, `ProgressBar`,
`GradientHeader`.

**Tier 3 — feature components:**
- *Home:* `AppHeader` (greeting / date / bell / 切換陪練員), `HeroBanner`, `QuickActionsGrid`,
  `WeeklyProgressCard`, `CategoryFilter`, `TrainerCard`, `RecommendedTrainers` (responsive grid).
- *Detail:* `TrainerDetailHeader` (gradient), `ServiceTags`, `BioSection` (+ 認證資格),
  `GymMemberships`, `AvailabilityList`, `ReviewsSection`, `PlatformManagerCard`, `BookingCTA`.
- *Shell:* `BottomNav` (5 tabs) ⇄ desktop top nav, `ThemeToggle`, `LanguageSwitcher`.
- *Auth:* `AuthCard` + `SocialButtons` (Google / Apple).

## Routes & responsive layout

```
src/app/[locale]/
  (tabs)/
    layout.tsx              ← app shell + BottomNav / top nav
    page.tsx                ← Home 首頁
    trainers/page.tsx       ← Trainer list 陪練師
    trainers/[id]/page.tsx  ← Trainer detail
    community/page.tsx      ← placeholder 社群
    messages/page.tsx       ← placeholder 訊息
    profile/page.tsx        ← placeholder 我的
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
```

**Responsive:** mobile-first centered max-width column with a **bottom tab bar** on
mobile/tablet; on **desktop (≥lg)** the bottom bar becomes a **top header nav** and the
recommended-trainers grid expands **1 col → 2 → 3–4**. Hero, cards, and detail sections are fluid.

## Auth (social-only, mock)

`sign-in` and `sign-up` share `AuthCard` (different heading / copy; sign-up adds a ToS line).
`Continue with Google` / `Continue with Apple` call a mock `signInWithProvider()` that routes to
`/` for now. Real OAuth wires in when Supabase auth is live.

## Testing

Vitest + Testing Library: unit tests for design-system atoms (`TierBadge`, `PriceTag`,
`RatingStars`), `CategoryFilter` filtering logic, and `@pacergo/api` mock functions. Matches the
mobile app's tested-component convention.

## Build order

1. `@pacergo/shared` types / enums / display maps.
2. `@pacergo/api` mock data layer (+ env-gated Supabase client scaffold).
3. Scaffold `apps/web`: Next 15 + Tailwind v4 + shadcn + theme + i18n + app shell.
4. Tier-1 shadcn primitives + Tier-2 design-system atoms.
5. Home page (compose Tier-3 home components).
6. Trainer list + detail.
7. Auth (sign in / sign up).
8. Placeholder tabs (community / messages / profile).
9. Tests + final responsive / dark-mode / i18n pass.

## Out of scope (post-v1)

Payments / 時數包, real booking flow, chat, AI features (訓練計劃 / 修圖), running & hiking
activation beyond display, LINE auth, live Supabase wiring.
