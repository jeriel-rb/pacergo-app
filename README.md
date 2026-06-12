# Pacergo

Find an in-person workout companion in Taiwan — from certified pro trainers (Tier A) to experienced peers (Tier B) to training buddies (Tier C). React Native (Expo) + Supabase.

See the design spec at [`docs/superpowers/specs/2026-06-12-pacergo-design.md`](docs/superpowers/specs/2026-06-12-pacergo-design.md) and the M0 plan at [`docs/superpowers/plans/2026-06-12-pacergo-m0-foundation.md`](docs/superpowers/plans/2026-06-12-pacergo-m0-foundation.md).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase values.
3. Apply the database schema (see **Database** below).
4. `npx expo start`

## Scripts

- `npm test` — run the Jest test suite
- `npm run typecheck` — type-check (`tsc --noEmit`)
- `npx expo start` — start the dev server
- `npx expo export --platform ios` — production-bundle (build smoke test)

## Database

The schema lives in [`supabase/migrations/`](supabase/migrations/):
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

## Stack

Expo SDK 56 · React Native 0.85 · expo-router (`src/app/`) · NativeWind · Reanimated 4 ·
i18next (en / zh-Hant) · Supabase · TanStack Query · Zustand · jest-expo + Testing Library.

## Project structure

```
src/
  app/            # expo-router routes (root layout + (tabs) group)
  components/ui/  # design-system component kit
  lib/
    theme/        # tokens + dark/light/system ThemeProvider
    i18n/         # i18next setup
    format/       # NTD / distance / locale formatters
    supabase/     # Supabase client singleton
    query/        # TanStack Query client
  locales/        # en.json, zh-Hant.json
  types/          # ambient TS declarations
supabase/migrations/  # SQL migrations
```
