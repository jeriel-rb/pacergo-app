# Pacergo — Product & Technical Design Spec

- **Date:** 2026-06-12
- **Status:** Approved (brainstorming complete) — ready for milestone implementation planning
- **Platform:** React Native (Expo, managed) — iOS + Android
- **Backend:** Supabase (Auth, Postgres + PostGIS, Storage, Realtime, Edge Functions)
- **Launch market:** Taiwan (NTD currency, English + Traditional Chinese)

---

## 1. Vision

Pacergo helps anyone in Taiwan find an **in-person workout companion** near them — anywhere on a spectrum from a certified pro trainer to a peer who just wants to train together — and book a session in a few taps, **no gym membership or long-term coaching contract required**.

It feels playful and personal — Tinder-style profile discovery, **but with no swipe gestures** — wrapped in a premium, Phantom-wallet-grade dark UI.

The original proof-of-concept (a Manus-built web app) framed it as a "Sports Coaching Marketplace MVP." This spec is the React Native productization of that idea.

---

## 2. Core concepts

### 2.1 Tiers (skill / price level)

Every companion belongs to one tier, shown everywhere as a colored badge displaying the **letter A/B/C** (no word label — color carries meaning).

| Tier | Who | Pricing (NTD) | Trust requirement |
|------|-----|---------------|-------------------|
| **A** | Certified personal trainers / coaches | Premium band (e.g. 1000–1200+/session) | Must pass verification (cert + ID) |
| **B** | Skilled enthusiasts, not certified | Mid band | Profile + reviews |
| **C** | Peers who just want to train together | **Companion's choice: free OR small fee** | Profile only |

Price is set by the companion within their tier's band.

### 2.2 Activities (what you do)

Activity is a **first-class dimension**, independent of tier. They combine freely: a *Tier A running coach*, a *Tier C hiking buddy*, a *Tier B gym partner*.

- The activity **system is built to support many activities** (Gym, Running, Hiking, Cycling, Yoga, Swimming, Boxing/Martial Arts, Basketball, …).
- **v1 ships with only Gym enabled.** Other activities exist in the taxonomy as inactive rows and are switched on post-launch (a config flip, no rework). Running/Hiking are the first planned additions (M6).

### 2.3 Roles — opt-in dual role

- Everyone signs up as a **Seeker** (primary persona for v1).
- Any user can flip a switch to also be listed as a **Companion**. Tier C buddies can do this in minutes; **Tier A pros must pass verification**.
- Companions get a **light** experience in v1: a listing, accept/decline requests, manage availability, view a (future) earnings placeholder.
- **Admin (you):** review Tier A verifications and handle moderation reports via a lightweight Supabase/web dashboard — **not** in the mobile app.

### 2.4 The booking loop (core mechanic)

```
Discover (feed / map) → Profile → Request session (time, place, duration, price)
   → Companion accepts / declines → Chat to coordinate → Meet in person
   → Mark complete → Both leave a review
```

**Money in v1:** the agreed NTD price is recorded only. There is **no real payment processing in v1**. The model is built so in-app payment + Pacergo commission slot in as the next milestone (M6).

---

## 3. Personas

- **The Seeker** — wants flexible, affordable training/company without committing to a gym package. Browses, requests, meets, reviews. *(Primary v1 persona.)*
- **The Companion** — any user who opts in. Tier C buddy flips a switch; Tier A pro verifies.
- **Admin / You** — verification review + moderation, outside the app.

---

## 4. Complete screen map

**Onboarding & Auth**
1. Animated splash / brand intro
2. Value-prop welcome carousel (3 slides)
3. Sign in — Google / Apple (Supabase OAuth)
4. Seeker profile setup wizard — name, photo, **birthdate (18+ gate)**, location, goals, experience level, activities (Gym), preferred areas/gyms, availability
5. Permission priming — location & notifications

**Discovery (Seeker home)**
6. **Home — card feed** of nearby companions (photo, tier badge, activity icon, price, distance, top goals) + activity category chips + filter chips + search
7. **Map view** toggle — companion pins (iconified by activity) → mini card → profile
8. Filters sheet — activity, tier, price range (NTD), goal, distance, availability, gender preference
9. **Companion profile** — photo gallery, tier badge, verified check (Tier A), bio, specialties/activities, price, rating & reviews, served areas, availability, "Request session" CTA, save

**Booking**
10. Request session flow — date/time, duration, location (gym/area on map), note, price (auto from offering; free for Tier C if set)
11. Request-sent confirmation
12. **Bookings** list — tabs: Upcoming / Requests / Past
13. Booking detail — status, time, place map, price, companion, chat entry, cancel/reschedule, mark complete
14. Review & rating screen

**Chat**
15. Conversations inbox
16. Chat thread — realtime, with booking-context header

**Companion mode (opt-in, light)**
17. "Become a companion" wizard — pick tier, activities, price, specialties, areas, availability, bio, photos
18. Tier A verification — upload cert + ID (status pending/approved/rejected)
19. Companion dashboard — incoming requests, upcoming sessions, listing preview, earnings placeholder
20. Availability editor — weekly schedule + blocked dates
21. Listing editor

**Profile & Settings**
22. My profile — view/edit, **"Available as companion" toggle**
23. Settings — account, notifications, privacy, location, **language (中文 / English)**, **theme (dark / light / system)**, payment methods (placeholder), help, legal, sign out, delete account
24. My reviews (received & given)
25. Notification center
26. Safety center — report/block, in-person meeting safety tips, share-session-details

**System states:** empty states, offline, error, loading skeletons throughout.

---

## 5. Localization

- **Launch languages:** English + **Traditional Chinese (Taiwan)** — locale `zh-Hant-TW`.
- Built on **i18next + react-i18next** with **expo-localization** for device-language detection and a manual override in Settings.
- **No hardcoded UI strings** from day one — all strings live in `src/locales/{en,zh-Hant}`. Adding a language later is just a new file.
- Missing `zh-Hant` keys fall back to `en`.
- Locale-aware formatting for dates, distances, and **NTD currency** via `Intl`.
- **CJK font:** Noto Sans TC paired automatically for `zh-Hant`.
- User-generated content (bios, reviews) stays in the language the user wrote it; only the app shell is translated.

---

## 6. Design system — Phantom-inspired (dark + light)

We use Phantom's **design language** (violet, dark, rounded, playful, glassy) — **not** its ghost mascot. Pacergo gets its own simple wordmark/mark (placeholder until branding exists).

### Color tokens
- **Brand:** primary violet `#AB9FF2`, gradient to deep violet `#7C5CFF` for CTAs, soft violet glow on key actions.
- **Dark (default):** background `#18181B`, surface `#232328`, elevated `#2C2C32`, hairline `rgba(255,255,255,.08)`, text `#F5F5F7` / secondary `#A1A1AA` / muted `#6B6B74`.
- **Light:** background `#FFFFFF`, surface `#F6F5FA`, text `#1A1A1F` / secondary `#6B6B74`; accent shifts to `#7C5CFF` for contrast on white.
- **Tier badge colors:** A = amber/gold `#F5C451→#E0A93C`; B = brand violet `#AB9FF2→#7C5CFF`; C = mint `#3DDC97→#2BB67D`.
- **Semantic:** success mint, warning `#FFB020`, error `#FF5C5C`.

### Typography
- Display/headings: **General Sans** (closest free match to Phantom Sans)
- Body/UI: **Inter**
- Traditional Chinese: **Noto Sans TC**
- Scale: Display 32 · H1 28 · H2 22 · H3 18 · Body 16 · Caption 13 · Micro 11

### Shape & feel
- 4-based spacing; radii sm 10 / md 16 / lg 20 / xl 28 / pill.
- Generous, airy padding; soft large-blur shadows; **frosted-blur** tab bar & bottom sheets (`expo-blur`); subtle violet radial glows in heroes/empty states.
- Spring-based motion (`reanimated` + `moti`) with **haptics** on key actions.

### Component kit
Primary / Secondary / Ghost / Destructive buttons · CompanionCard · TierBadge (A/B/C) · ActivityChip · PriceTag (NTD) · RatingStars · Avatar (+ verified check) · FilterChip · feed/map SegmentedControl · BottomSheet · TextField · DateTime/Duration picker · Availability grid · StatusPill (booking states) · Toast · Skeletons · EmptyState · custom blurred TabBar. Icons: **lucide-react-native**.

---

## 7. Data model (Supabase Postgres + PostGIS)

### Tables
- `profiles` — 1:1 with `auth.users` (display_name, photo, bio, gender, birthdate, locale, experience_level, `location geography(Point)`, home_area, `is_companion`, push_token)
- `activities` — taxonomy (slug, name_en, name_zh, icon, `is_active`). Gym active; others inactive.
- `profile_activities` — seeker's activity interests (M:N)
- `companion_listings` — 1:1 with a companion profile (headline, long bio, served areas, status draft/active/paused, rating_avg, rating_count)
- `listing_offerings` — `(listing_id, activity_id, tier A/B/C, price NTD, is_free, session_minutes, description)`. Lets one person offer multiple activities/tiers (e.g. Gym·A·1200 now, Running·C·free later).
- `availability` (weekday + time ranges) + `availability_blocks` (blocked dates)
- `verifications` — Tier A cert/ID docs (type, document_url, status pending/approved/rejected, reviewer, notes)
- `bookings` — seeker_id, companion_id, offering ref, status (requested/accepted/declined/cancelled/completed/expired), scheduled_start, duration, location (name + point), agreed_price, is_free, note, timestamps, cancelled_by, completed_at
- `reviews` — per booking, both directions (rating 1–5, comment)
- `conversations` + `messages` — realtime chat, optionally tied to a booking
- `reports`, `blocks` — trust & safety
- `notifications` — in-app notification center
- `saved_companions` — bookmark a profile (the non-swipe equivalent of a "like")

### Storage buckets
- `avatars` (public), `listing-photos` (public), `verification-docs` (**private — owner + admin only**)

### Security (RLS) — key rules
- **Public-readable:** active listings/offerings, reviews, limited public profile fields (via a safe view — no precise location/PII; distance computed server-side).
- **Owner-only writes** on own profile/listing/availability.
- `bookings` + `messages` visible only to the two parties.
- Reviews writable only by someone with a **completed** booking with that person.
- `verification-docs`, `reports` → owner/admin only.
- `blocks` enforced inside discovery so blocked users never surface.

### Discovery query
PostGIS RPC `nearby_companions(lat, lng, radius, activity, tier, price_range, …)` using `ST_DWithin`/`ST_Distance` to return ranked nearby companions with distance — feeds both the card list and the map.

### Realtime
`messages` (chat) and `bookings` (live status changes) via Supabase Realtime.

### Edge Functions / automation
- `on-booking-event` — fan out Expo push notifications on booking state changes
- `expire-requests` — scheduled; auto-expire pending requests after 48h
- Admin verification handled in a lightweight Supabase dashboard/web view, outside the app.

### Supabase project (client-safe values)
- URL: `https://kezkrcyfnjlugkrcbwmy.supabase.co`
- Publishable key: `sb_publishable_39MYXV0_qsyEYsqFKC_OlA_qM7I0ZC5`
- React Native uses `@supabase/supabase-js` with **AsyncStorage**-backed session persistence (NOT the Next.js `@supabase/ssr` flavor from the original POC snippet).

---

## 8. App architecture (Expo)

- **Routing:** `expo-router` (file-based). Groups: `(auth)`, `(onboarding)`, `(tabs)` → **Discover · Bookings · Chat · Profile**, plus modal routes (filters, request, profile detail, companion wizard).
- **Data/state:** TanStack Query (server state) + Zustand (UI/filters/theme); Supabase client singleton with AsyncStorage session persistence.
- **Styling:** **NativeWind** with the token palette above; ThemeProvider for dark/light/system.
- **Forms:** react-hook-form + zod.
- **Maps:** react-native-maps with a custom dark style.
- **i18n:** i18next + expo-localization.
- **Media:** expo-image, expo-image-picker.
- **Notifications:** expo-notifications + Expo Push.
- **Animation/feel:** reanimated, moti, expo-blur, expo-haptics.
- **Build/release:** EAS Build + EAS Update (OTA); TestFlight / internal distribution.

### Folder structure
```
/app                      # expo-router routes
/src/components/ui        # design-system component kit
/src/features/
  ├── auth
  ├── discovery
  ├── booking
  ├── chat
  ├── companion
  └── profile
/src/lib/
  ├── supabase
  ├── i18n
  ├── theme
  └── query
/src/locales/{en,zh-Hant}
/supabase/{migrations,functions}
```

---

## 9. Authentication

- Supabase Auth with **Google + Apple** OAuth for v1 (`expo-auth-session` / `expo-apple-authentication` → Supabase `signInWithIdToken`).
- Session persisted via AsyncStorage; token auto-refresh.
- On first sign-in, a DB trigger `handle_new_user` creates the `profiles` row.
- **Future (M6):** LINE login (custom OAuth — Taiwanese users will expect it) + phone OTP (SMS).

---

## 10. Trust & safety (first-class — strangers meet in person)

- **Tier A verification:** upload cert + ID → admin review → **verified check** on profile. Rejections show a reason and allow resubmit.
- **Report & block** anywhere a user appears; reports → admin queue; blocks enforced in discovery **and** chat.
- **Safety center:** meeting-safety tips + **"share session details"** via native share sheet.
- **Age gate 18+** at onboarding (birthdate).
- **Location privacy:** exact coordinates never exposed — only approximate distance + area, computed server-side.
- Basic photo/bio guidelines; manual moderation for v1.

---

## 11. Edge cases & error handling

- **Auth:** OAuth cancel/fail, existing-account linking, token refresh, sign-out.
- **Location denied →** fall back to manual **city/district picker**; discovery still works by area.
- **No companions nearby →** empty state with "widen radius" CTA.
- **Booking integrity:** can't request yourself; can't request a paused listing or removed offering; double-book guard; requests **auto-expire after 48h** if unanswered.
- **Reviews:** only after a **completed** booking; one per direction per booking.
- **Chat:** optimistic send + retry, offline queue, blocked/expired-booking handling.
- **Offline:** cached data via Query + offline banner + retry.
- **i18n:** missing `zh-Hant` key → `en` fallback; NTD/date formatting via `Intl`.
- **Account deletion:** cancel future bookings, anonymize past reviews, purge personal data + storage.
- **Uploads/push:** image failure & size limits; push permission denied / token refresh handled gracefully.

---

## 12. Notifications
Booking requested · accepted · declined · cancelled · **session reminder** · new message · review received · verification result · request-expiring-soon. (`expo-notifications` + Expo Push, fanned out by `on-booking-event`.)

---

## 13. Testing strategy

- **Unit:** formatting, zod schemas, the **booking state machine**, pricing & distance/filter logic.
- **DB:** RLS policy + RPC tests (pgTAP / Supabase test harness) — RLS is the security boundary.
- **Component:** React Native Testing Library.
- **E2E:** **Maestro** — sign in → discover → request → accept → chat → review.
- **On-device:** EAS preview / TestFlight internal builds.
- **TDD** for business logic (booking states, pricing, filtering).

---

## 14. Milestone roadmap

Each milestone is its own spec → plan → build cycle. **v1 = M0–M5.**

| # | Milestone | What ships |
|---|-----------|-----------|
| **M0** | **Foundation** | Expo scaffold, design tokens + dark/light theme, component kit, i18n (en/zh-Hant), Supabase client, navigation skeleton, base DB migrations |
| **M1** | **Auth & Onboarding** | Google/Apple sign-in, profile creation, seeker onboarding wizard (Gym activity, location, 18+ gate), profile + settings (language/theme) |
| **M2** | **Discovery** | Listings/offerings, PostGIS `nearby_companions` RPC, card feed + filters + map toggle, profile detail, save |
| **M3** | **Booking loop** | Request flow, bookings list/detail, accept/decline, status state machine, reviews, booking notifications |
| **M4** | **Companion mode + Chat** | Become-a-companion wizard, listing/availability editors, Tier A verification, realtime chat |
| **M5** | **Trust & safety + polish** | Report/block, safety center, notification center, empty/error pass, age gate, account deletion |
| **M6** | **Next phase (post-v1)** | In-app payments + commission (TapPay / LINE Pay / Stripe) & payouts, enable Running/Hiking, LINE + phone OTP auth |

First implementation plan: **M0 (Foundation)** — everything depends on it.

---

## 15. Out of scope for v1 (YAGNI — deliberately deferred)

Real payments / payouts · running / hiking & other activities **live** · LINE / phone auth · group sessions · subscriptions · web app · AI / advanced matching · remote / video coaching · social feed · gamification / streaks.

All deferred; the data model leaves room for them.
