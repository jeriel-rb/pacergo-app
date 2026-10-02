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

## Backend (Supabase)

- Project ref `kezkrcyfnjlugkrcbwmy` (Tokyo). The repo is CLI-linked.
- Schema / migrations live in `backend/` (renamed from `supabase/`).
- Apply migrations: `supabase db push` from the repo root.
- The Supabase CLI hard-requires a folder named `supabase`. On Windows, create a
  junction once: `cmd /c mklink /J supabase backend` (gitignored). On macOS/Linux:
  `ln -s backend supabase`.
- **Core migrations:** `0001_init.sql` (schema/types/functions/RPCs only) then
  `0002_policies.sql` (all RLS + storage policies, commented). Add further
  changes as `YYYYMMDDHHMMSS_name.sql` after those. Keep new RLS in
  `0002_policies.sql` (or a follow-up that updates it) so policies stay
  centralized — do not scatter CREATE POLICY across feature migrations.
- **Exercises:** `backend/seeds/03_ai_plan_exercises.sql` is GENERATED — one row per
  catalog exercise (302, kebab-case slugs). Regenerate with
  `node apps/web/scripts/generate-exercises-seed.mjs`; hand-written steps/tips live in
  `apps/web/src/shared/assets/exercise-content.json`. That seed file is the only
  catalog load (`config.toml` `[db.seed]`, on `supabase db reset`). Do not copy
  the insert into a migration. The one-time saved-plan slug rewrite already ran
  on the linked database and is not a migration file.
- **Exercise QA:** the AI only generates exercises that have instructions, a muscle
  mapping, an illustration and a QA pass. Exercises that failed QA are listed with
  reasons in `QA_EXCLUDED_EXERCISES` (`packages/shared/src/plan/exercise-qa.ts`) and
  filtered out inside `generateTrainingPlan`; remove an entry once its art/instructions
  are fixed. Illustrations are static (one `frame-1.svg` per exercise; the sync script
  keeps only that). Cooldowns are real stretches only, picked from `STRETCH_LIBRARY`
  (`plan/stretch-library.ts`) by the muscles each workout trained — add a stretch there
  (with art + instructions) rather than reusing strength/core moves. Bump
  `PLAN_RULES_VERSION` when generation output changes; the plan overview then offers to
  update older plans.

## Conventions / gotchas

- The user/profile table is **`users`** (NOT `profiles`), FK column **`user_id`**
  (NOT `profile_id`). `auth.users` is separate (Supabase auth); `public.users` is
  the app profile, 1:1 via the `handle_new_user` trigger.
- Put domain types/enums in `@pacergo/shared` so native can reuse them.
- Web components: `shared/components/ui` (shadcn) → `…/atoms` → `features/*`.
