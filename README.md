# PacerGo

Find an in-person workout companion in Taiwan — from certified pro trainers (Tier A) to experienced peers (Tier B) to training buddies (Tier C). React Native (Expo) + Supabase.

This is a **Yarn 4 workspaces monorepo**. The mobile app lives in [`apps/mobile/`](apps/mobile/);
shared code and data access have package homes in [`packages/`](packages/) (scaffolds for now).

See the design spec at [`docs/superpowers/specs/2026-06-12-pacergo-design.md`](docs/superpowers/specs/2026-06-12-pacergo-design.md) and the M0 plan at [`docs/superpowers/plans/2026-06-12-pacergo-m0-foundation.md`](docs/superpowers/plans/2026-06-12-pacergo-m0-foundation.md).

## Setup

Requires Node ≥ 20 and Corepack (`corepack enable`) so the pinned Yarn 4 is used.

1. `yarn install` (from the repo root)
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in the Supabase values.
3. Apply the database schema (see **Database** below).
4. `yarn mobile` (alias for `yarn workspace pacergo start`)

## Scripts

Run from the repo root:

- `yarn test` — run the mobile Jest suite (`yarn workspace pacergo test`)
- `yarn typecheck` — type-check the mobile app (`tsc --noEmit`)
- `yarn mobile` / `yarn mobile:ios` / `yarn mobile:android` / `yarn mobile:web` — start the dev server
- `yarn workspace pacergo exec expo export --platform ios` — production-bundle (build smoke test)

## Database

The schema lives in [`backend/migrations/`](backend/migrations/):
`0001_foundation.sql` (profiles, activities, profile_activities, RLS, `handle_new_user`
trigger) and `0002_onboarding.sql` (adds `profiles.onboarding_completed`).

Apply them to the Supabase project one of these ways:

- **Dashboard:** paste the migration SQL into the project's SQL Editor and run it.
- **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.

Then create the storage buckets (run in the SQL Editor):

```sql
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('listing-photos', 'listing-photos', true),
  ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;
```

## Auth (M1)

Google/Apple sign-in is config-gated. To enable it:

1. In Supabase → Authentication → Providers, enable **Google** and **Apple**.
2. Create Google OAuth client IDs (Web + iOS) and put them in `.env`
   (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`).
3. Apple Sign In requires a paid Apple Developer account and a dev/standalone
   build (it does not work in Expo Go).
4. Apply migrations `0001_foundation.sql` and `0002_onboarding.sql`.

Until configured, the sign-in screen shows "Sign-in isn't configured yet" and the
rest of the app builds and runs normally. After sign-in, users without
`onboarding_completed` are routed through the onboarding wizard (name, 18+ gate,
experience, area, Gym activity) before reaching the tabs.

## Discovery (M2)

The Discover tab calls the `nearby_companions` PostGIS RPC with a center coordinate
(from `expo-location`, falling back to Taipei). Companion data appears once
migration `0003_discovery.sql` is applied and `companion_listings` /
`listing_offerings` rows exist with a `profiles.location`. The RPCs
(`nearby_companions`, `get_companion`) are `security definer` and return only safe
columns + rounded distance — never raw coordinates or PII. The map uses
`react-native-maps` (Apple Maps on iOS needs no key; Android needs a Google Maps
API key).

## Booking (M3)

The booking loop: a seeker requests a session from a companion's detail screen
(choose offering, time, place), the companion accepts/declines, either party can
cancel or mark complete, and both can leave a review afterward. A guarded state
machine (`src/features/booking/stateMachine.ts`) decides which actions appear in
the UI; the **actual transitions are enforced server-side** by `SECURITY DEFINER`
RPCs (`accept_booking`/`decline_booking`/`cancel_booking`/`complete_booking`) —
clients cannot UPDATE bookings directly, and reviews are constrained to the
booking counterparty. A trigger writes `notifications` rows on booking events and
recomputes a companion's rating on review. Requires migration `0004_booking.sql`.
Expo push delivery + the in-app notification center come later (M5).

## Companion mode (M4a)

Any user can become a companion: a wizard creates a `companion_listings` row +
`listing_offerings` (activity · tier · price; only Tier C may be free, enforced by
`validateOffering`) and flips `profiles.is_companion`. A dashboard shows incoming
requests + upcoming sessions (from `useBookings`), with listing/availability
editors and a Tier A verification flow that uploads a doc to the private
`verification-docs` bucket and inserts a `verifications` row (admin review is
out-of-app). Requires migration `0005_companion.sql`.

## Chat (M4b)

Realtime 1:1 chat between booking parties. `conversations` store a sorted
participant pair with denormalized counterpart names (so the inbox renders under
owner-only profile RLS); `messages` stream via Supabase Realtime. A "Message"
button on a booking find-or-creates the conversation and opens the thread.
Requires migration `0006_chat.sql` with the `messages` table added to the
`supabase_realtime` publication.

## Trust & safety (M5)

Report and block users (block is enforced in the `nearby_companions` RPC, both
directions), a safety center with meeting tips + native share-session-details, an
in-app notification center reading the `notifications` table (written by booking
triggers since M3), and account deletion via a `delete_account()` SECURITY DEFINER
RPC (cascades through FKs). Requires migration `0007_trust_safety.sql`. This
completes v1 (M0–M5).

## Stack

Expo SDK 56 · React Native 0.85 · expo-router (`src/app/`) · NativeWind · Reanimated 4 ·
i18next (en / zh-Hant) · Supabase · TanStack Query · Zustand · jest-expo + Testing Library.

## Project structure

```
package.json            # root: Yarn 4 workspaces (apps/*, packages/*)
tsconfig.base.json      # shared compiler options for the packages
.yarnrc.yml             # nodeLinker: node-modules (required for RN/Metro)

backend/                # Supabase schema (CLI may use a local `supabase` → `backend` junction)
  migrations/           # SQL migrations (0001–…)
  functions/            # edge functions (empty for now)
  seed.sql              # local seed data (empty for now)
  config.toml           # local Supabase CLI config

packages/               # scaffolds — real code extracted incrementally
  shared/               # @pacergo/shared — enums, types, helpers, constants, schemas
  api/                  # @pacergo/api — supabase client, queries, mutations

apps/
  mobile/               # @pacergo "pacergo" — the Expo app (this is the v1 product)
    src/
      app/              # expo-router routes (root layout + (tabs) group)
      components/ui/    # design-system component kit
      features/         # account, auth, booking, chat, companion, discovery, …
      lib/
        theme/          # tokens + dark/light/system ThemeProvider
        i18n/           # i18next setup
        format/         # NTD / distance / locale formatters
        supabase/       # Supabase client singleton
        query/          # TanStack Query client
      locales/          # en.json, zh-Hant.json
      types/            # ambient TS declarations
  web/                  # @pacergo/web — product app (Next.js 15, App Router)
  website/              # @pacergo/website — marketing site (Next.js, placeholder)
```
