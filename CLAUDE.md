# Pacergo — agent notes

Yarn 4 workspaces monorepo. Find an in-person workout companion in Taiwan
(Tier A pro trainers · B experienced peers · C training buddies).

## Workspaces

- `apps/mobile` — React Native (Expo + NativeWind), the original app. Jest tests.
- `apps/web` — `@pacergo/web`, Next.js 15 product app (App Router, Tailwind v4,
  shadcn-style components, i18n zh-default/en, light/dark). Vitest tests.
- `apps/website` — `@pacergo/website`, public marketing site (Next.js 15).
- `packages/shared` — `@pacergo/shared`, framework-free enums/types/constants
  shared by web + native (Tier, ActivitySlug, TrainerSummary/Profile, etc.).
- `packages/api` — `@pacergo/api`, data layer (env-gated mock ⇄ live Supabase).

## Commands

- `yarn web` / `yarn web:build` / `yarn web:test` — the Next.js product app.
- `yarn mobile` — Expo; `yarn test` / `yarn typecheck` — mobile (jest/tsc).
- `yarn workspace @pacergo/shared test`, `yarn workspace @pacergo/api test`.

## Data layer (`@pacergo/api`)

- **Env-gated:** `USE_MOCK = !NEXT_PUBLIC_SUPABASE_URL`. No env → mock fixtures;
  env set (web `.env.local`, git-ignored) → live Supabase.
- Web browses **publicly** (anon) via SECURITY DEFINER RPCs `recommended_companions`
  / `companion_profile` (return JSON shaped like the shared types). Base tables are
  `authenticated`-only RLS. Real auth/sessions are not wired yet.
- Native uses the authenticated client + `nearby_companions` / table queries.

## Supabase

- Project ref `kezkrcyfnjlugkrcbwmy` (Tokyo). The repo is CLI-linked.
- Apply migrations: `supabase db push` (the Claude.ai Supabase MCP is connected to
  a different account and can't reach this project — use the CLI).
- Migrations live in `supabase/migrations/`. `0009` seeds 6 demo trainers.

## Conventions / gotchas

- The user/profile table is **`users`** (NOT `profiles`), FK column **`user_id`**
  (NOT `profile_id`). `auth.users` is separate (Supabase auth); `public.users` is
  the app profile, 1:1 via the `handle_new_user` trigger.
- Put domain types/enums in `@pacergo/shared` so native can reuse them.
- Web components: `shared/components/ui` (shadcn) → `…/atoms` → `features/*`.
