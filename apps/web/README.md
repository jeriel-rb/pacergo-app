# @pacergo/web

PacerGo product app - Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn-style components. Consumes shared domain types from `@pacergo/shared` and data from `@pacergo/api`.

## Run

```bash
yarn workspace @pacergo/web dev       # http://localhost:3000
yarn workspace @pacergo/web build     # production build
yarn workspace @pacergo/web test      # vitest
yarn workspace @pacergo/web typecheck # tsc --noEmit
```

## What's Built

- **Home** - greeting, hero, quick-action grids, weekly progress, recommended trainers with an activity filter.
- **Trainers** - list + full detail page with services, bio, certs, gym memberships, availability, reviews, platform-manager card, and booking CTA.
- **Auth** - Supabase email/password sign in, sign up, email verification, and password reset.
- **Community / Messages / Profile** - placeholder tabs so navigation works end-to-end.

## Conventions

- **Theme** - light is default; `next-themes` (`class` strategy) toggles dark. Blue brand (`#1565ff`, shared with the marketing site). Tokens live in `src/app/globals.css`.
- **i18n** - `next-i18n-router` + i18next. `zh` (Traditional Chinese) is the default at `/`; English is at `/en/...`. Strings live in `src/locales/{zh,en}/*.json`.
- **Data** - `@pacergo/api` is env-gated: with no Supabase URL/key it serves mock fixtures. Copy `.env.example` to `.env.local` and set the Supabase vars to go live.
- **Auth email redirects** - set the canonical web origin with `http://` or `https://`, then add matching URLs in Supabase Dashboard > Authentication > URL Configuration. Production should allow the deployed app origin, not a `*.supabase.co/rest/v1` or `*.supabase.co/auth/v1` API URL. See `docs/auth-email-setup.md`.
- **Components** - `src/shared/components/ui` (shadcn primitives) to `src/shared/components/atoms` (token-bound design-system atoms) to `src/features/*` (feature components). Domain enums/types come from `@pacergo/shared` so the React Native app can reuse them.

## Structure

```text
src/
  app/[locale]/
    (tabs)/        home, trainers (+[id]), community, messages, profile (+ app shell)
    (auth)/        sign-in, sign-up, forgot-password, new-password
    globals.css    blue light/dark theme tokens
  shared/
    components/ui/      shadcn primitives (button, card, badge, ...)
    components/atoms/   TierBadge, PriceTag, RatingStars, ActivityChip, SectionCard, ...
    components/shell/   AppHeader, BottomNav, ThemeToggle, LanguageSwitcher
    hooks/              useLocale
  features/
    home/          hero, quick actions, weekly progress, recommended trainers, filter
    trainer/       grid, list view, detail header + sections, manager card, booking CTA
    auth/          AuthCard, email auth forms, verification, password reset
  lib/             cn, i18n init, locale-path helpers
  locales/{zh,en}/ common, nav, home, trainer, auth namespaces
```

## Deploying

Vercel builds this app from `apps/web` (see `vercel.json`). Pushing to `main`
deploys production; a push only rebuilds when files under `apps/web` change.
