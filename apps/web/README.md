# @pacergo/web

Pacergo **product app** — Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn-style
components. Consumes shared domain types from `@pacergo/shared` and data from `@pacergo/api`.

## Run

```bash
yarn workspace @pacergo/web dev       # http://localhost:3000
yarn workspace @pacergo/web build     # production build
yarn workspace @pacergo/web test      # vitest
yarn workspace @pacergo/web typecheck # tsc --noEmit
```

## What's built

- **Home (首頁)** — greeting, hero, quick-action grids, weekly progress, recommended trainers
  with an activity filter (全部 / 健身 / 陪跑 / 陪爬).
- **Trainers (陪練師)** — list + full detail page (services, bio, certs, gym memberships,
  availability, reviews, platform-manager card, booking CTA).
- **Auth** — social-only sign in / sign up (Google / Apple), mocked until Supabase auth lands.
- **Community / Messages / Profile** — placeholder tabs so navigation works end-to-end.

## Conventions

- **Theme** — light is default; `next-themes` (`class` strategy) toggles dark. Blue brand
  (`#1565ff`, shared with the marketing site). Tokens live in `src/app/globals.css`.
- **i18n** — `next-i18n-router` + i18next. `zh` (Traditional Chinese) is the default at `/`;
  English is at `/en/...`. Strings live in `src/locales/{zh,en}/*.json`.
- **Data** — `@pacergo/api` is env-gated: with no `NEXT_PUBLIC_SUPABASE_URL` it serves mock
  fixtures (current state). Copy `.env.example` → `.env.local` and set the Supabase vars to go
  live; no UI changes needed.
- **Components** — `src/shared/components/ui` (shadcn primitives) → `…/atoms` (token-bound
  design-system atoms) → `src/features/*` (feature components). Domain enums/types come from
  `@pacergo/shared` so the React Native app can reuse them.

## Structure

```
src/
  app/[locale]/
    (tabs)/        home, trainers (+[id]), community, messages, profile  (+ app shell)
    (auth)/        sign-in, sign-up
    globals.css    blue light/dark theme tokens
  shared/
    components/ui/      shadcn primitives (button, card, badge, …)
    components/atoms/   TierBadge, PriceTag, RatingStars, ActivityChip, SectionCard, …
    components/shell/   AppHeader, BottomNav, ThemeToggle, LanguageSwitcher
    hooks/              useLocale
  features/
    home/          hero, quick actions, weekly progress, recommended trainers, filter
    trainer/       grid, list view, detail header + sections, manager card, booking CTA
    auth/          AuthCard, SocialButtons, mock signInWithProvider
  lib/             cn, i18n init, locale-path helpers
  locales/{zh,en}/ common, nav, home, trainer, auth namespaces
```
