# PacerGo — agent notes

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
  `0002_policies.sql` (all RLS + storage policies). Fold further schema changes
  into `0001_init.sql` and further policies into `0002_policies.sql`. Live
  history on the linked project is `0001` then `0002`; after folding a file
  in, `supabase migration repair --status reverted <version>` drops the old
  history row. Do not `db reset` the linked project. Changing `0001` does not
  re-run it on a remote where `0001` is already applied.
- **Exercises:** the catalog upsert is GENERATED into `backend/migrations/0001_init.sql`
  between `-- BEGIN ai_plan_exercises` and `-- END ai_plan_exercises` (one row per
  catalog exercise, kebab-case slugs). Regenerate with
  `node apps/web/scripts/generate-exercises-seed.mjs`; hand-written steps/tips live in
  `apps/web/src/shared/assets/exercise-content.json`. Changing `0001` does not reload
  the live catalog — apply that block with a one-off push, then
  `supabase migration repair --status reverted <version>` so history stays `0001`/`0002`.
  The one-time saved-plan slug rewrite already ran and is not a migration file.
- **Exercise QA:** the AI only generates exercises that have instructions, a muscle
  mapping, an illustration and a QA pass. Exercises that failed QA are listed with
  reasons in `QA_EXCLUDED_EXERCISES` (`packages/shared/src/plan/exercise-qa.ts`) and
  filtered out inside `generateTrainingPlan`; remove an entry once its art/instructions
  are fixed. Illustrations sync all SVG frames from bryllim/workout-guide for catalog
slugs only (see `apps/web/scripts/sync-exercise-art.mjs`); detail views
animate them, list thumbnails use `frame-1`. Cooldowns are real stretches only, picked from `STRETCH_LIBRARY`
  (`plan/stretch-library.ts`) by the muscles each workout trained — add a stretch there
  (with art + instructions) rather than reusing strength/core moves. Bump
  `PLAN_RULES_VERSION` when generation output changes; the plan overview then offers to
  update older plans.
- **Experience is stored twice, under different words.** The plan answer
  (`user_onboarding.training_preferences.experience`, and the same field on a saved
  plan snapshot) is Beginner = `no_experience` (2×12–15) and Basic = `basic`
  (3×10–12). A stored plan `beginner` is still read as Basic. The public column
  `users.experience_level` is Beginner = `beginner` and Basic = `basic`.
  `save_profile_setup` / `save_onboarding_answers` copy `no_experience` → `beginner`
  and leave `basic` as `basic`; a leftover plan `beginner` still maps to public
  `basic`. A blank plan answer does not write a public level. Generation still
  fills a missing experience with the Basic scheme.
  The mobile composer does not offer Basic.
- **Plan quality:** the guard rails (difficulty ceiling for novices, exclusions by main
  muscle only, reachable priorities, walking instead of running for novice / low-impact /
  low-BMI users, high-impact moves kept out of low-impact plans by whole slug words
  so a woodchop is not a hop, one move per movement family, compounds before accessories) live in
  `generateTrainingPlan` and are described in `docs/plan-engine/architecture.md`.
  `packages/shared/src/__tests__/plan-invariants.test.ts` runs the generator over the real
  catalog, read from the generated block in `0001_init.sql` by `__tests__/helpers/
  migration-catalog.ts` — nothing to keep in sync. Use that helper for new plan tests.
- **Muscle tags:** the catalog uses the picker's vocabulary where exercises exist
  (`middle_delts`, `traps`, `abductors` besides the older tags) — set in
  `refineMainMuscle` (`apps/web/scripts/exercise-seed-entry.ts`) and regenerated into
  `0001_init.sql`. Deploy the app code **before** loading the new tags into the live
  `exercises` table: old code does not know those tags and would drop lateral raises,
  shrugs and hip-abduction moves from plans. New code works on old tags.

## Sensitive fields (bank account numbers)

- Stored **encrypted**, same scheme as Optserv: AES-GCM in the Next.js server
  (`apps/web/src/lib/crypto/field-encryption.ts`), key from the server-only
  `ENCRYPTION_KEY` env, ciphertext `enc:v1:<base64(iv‖ct‖tag)>` in
  `users.bank_account_number`, the owner's user id bound as AAD. Postgres never
  sees the plaintext; `bank_account_mask` (e.g. `********0912`) is computed by the
  server and stored beside it.
- **Write**: `POST /api/studio/bank-account` → `save_bank_account_encrypted`. The
  old plaintext `save_bank_account` RPC is revoked.
- **Read**: owner's page (`getMyEarnings`) and the admin payout page
  (`getPayoutDetail`) decrypt server-side; the admin **user sheet** shows the mask and
  reveals the full number only on "Show" via
  `GET /api/admin/users/[id]/bank-account` (admin-gated in the DB by
  `admin_user_bank_secret`; `no-store`; logs ids only, never the number).
- Legacy plaintext values still read fine (no prefix = returned as is). After
  setting `ENCRYPTION_KEY` and applying the migration, run **once**
  `node backend/scripts/encrypt-bank-accounts.mjs --dry-run`, then without
  `--dry-run` (needs `ENCRYPTION_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
  It is idempotent and prints counts only.
- Don't rotate or lose `ENCRYPTION_KEY` casually: existing ciphertext becomes
  unreadable (the UI then shows the number as missing, never a crash).

## Payments (NewebPay 藍新金流)

- MPG 2.3 hosted checkout: `apps/web/src/lib/payments/newebpay.ts` (AES-256-CBC
  `TradeInfo` + SHA-256 `TradeSha`), routes under `apps/web/src/app/api/payments/newebpay/`
  (`create`, `return`, `notify` — notify answers `1|OK`). `PAYMENT_PROVIDER=simulated`
  switches checkout to the built-in fake provider instead.
- **Sandbox store:** merchant `MS159835515` (PacerGo 陪練動), portal
  `https://cwww.newebpay.com` (the `c` prefix = test site; live is `www.newebpay.com`),
  gateway `https://ccore.newebpay.com/MPG/mpg_gateway`. Keys: 會員中心 → 商店管理 →
  商店資料設定 → 設定 → API串接金鑰. Don't press 更換商店金鑰 (regenerates the keys and
  breaks the integration).
- **HashKey / HashIV live only in env** (`NEWEBPAY_HASH_KEY` 32 chars, `NEWEBPAY_HASH_IV`
  16 chars — web `.env.local` + Vercel), never in git: with them anyone can sign a fake
  "paid" notify to our endpoint. Copy them from the portal, not from chat — the HashKey
  contains a lowercase `l` that looks like a capital `I`, and that one-letter swap is what
  made every early attempt fail with **MPG03009 (交易資料 SHA 256 檢查不符合)**.
- Sandbox payment methods enabled: WebATM, ATM 轉帳, 超商代碼, 條碼. 信用卡一次付清 is
  **not enabled** yet (enable it in the portal before testing with a card).
- **Callback order is not guaranteed.** NewebPay's server `notify` and the customer's
  browser `return` can land in either order (notify usually first, return a few seconds
  later). The DB functions `apply_newebpay_notification` / `observe_newebpay_return` must
  stay order-independent: a return must never move a paid payment's booking backwards
  (it once reset `accepted` to `payment_processing`), and a repeated notify repairs a
  booking left mid-payment.
- Quick key check: POST a signed checkout to the sandbox gateway — a page containing
  `錯誤代碼：MPG…` means rejected; the Vue payment page (our order no. + amount) means OK.

## Profile validation

- Body facts (age 13–100, height 90–275 cm, weight 25–250 kg) are bounded by
  `PROFILE_LIMITS` in `packages/shared/src/nutrition/profile-limits.ts`. The same
  bounds are enforced server-side in `validate_fitness_profile()` (called by
  `save_onboarding_answers`) — change both together. `parseFitnessProfileRow`
  sanitizes the saved row on the way in; `calculateNutrition` returns null
  outside the bounds.

## Conventions / gotchas

- The user/profile table is **`users`** (NOT `profiles`), FK column **`user_id`**
  (NOT `profile_id`). `auth.users` is separate (Supabase auth); `public.users` is
  the app profile, 1:1 via the `handle_new_user` trigger.
- Put domain types/enums in `@pacergo/shared` so native can reuse them.
- Web components: `shared/components/ui` (shadcn) → `…/atoms` → `features/*`.
