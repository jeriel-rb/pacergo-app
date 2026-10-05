-- Pacergo init migration — schema, types, functions, RPCs (no RLS).
--
-- Final schema in one file: the original 0001–0046 sequence, admin members,
-- profile-setup single source, fitness-profile validation, and withdrawal /
-- account-deletion safety. Row-level security lives in 0002_policies.sql.
-- Reference data lives in ../seeds/ (loaded after migrations on `supabase db reset`).
--
-- Live history: 0001 (schema) → 0002 (policies). Changing this file does not
-- re-run on already-applied remotes.

-- Extensions
create extension if not exists postgis;

create extension if not exists pg_cron;

do $$ begin
  create type booking_status as enum (
    'requested', 'accepted', 'declined', 'cancelled', 'completed', 'expired',
    'pending_payment', 'payment_processing', 'payment_failed'
  );
exception when duplicate_object then null; end $$;

-- Enums
do $$ begin
  create type tier_level as enum ('A', 'B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- updated_at helper;

do $$ begin
  create type experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- updated_at helper;

do $$ begin
  create type payment_status as enum
    ('created', 'redirected', 'processing', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

-- Refund status (B-5).
do $$ begin
  create type payment_refund_status as enum
    ('none', 'refund_requested', 'refunded');
exception when duplicate_object then null; end $$;

-- Settlement state machine (B-6) + statuses (B-3).
do $$ begin
  create type settlement_status as enum ('unsettled', 'paid');
exception when duplicate_object then null; end $$;
do $$ begin
  create type settlement_eligibility_status as enum ('ineligible', 'eligible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type settlement_eligibility_status as enum ('ineligible', 'eligible');
exception when duplicate_object then null; end $$;

-- Phase 2 platform-wide requirement A-10 / Â§6.2: consent & legal pages
-- (Terms of Service, Privacy Policy, risk disclosure, partner conduct rules).
--
-- Re-read against the actual spec wording: "Client supplies all legal
-- wording. Dev implements pages, checkboxes, versioning, records only."
-- The client hands over finished text; nothing implies they need to self-edit
-- it through an admin UI. So the legal text itself is NOT stored here â€” it
-- lives as hardcoded i18n copy in the web app (apps/web/src/locales/*/legal.json),
-- exactly like every other page's copy in this codebase. "Versioning" just
-- means: each document has one hand-bumped version label (a date string) next
-- to its text, edited by a dev whenever the client sends updated wording.
--
-- The only thing that needs a database row is the CONSENT RECORD â€” proof that
-- a specific user agreed to a specific version at a specific time. That's
-- what this migration adds. (An earlier draft of this migration also modeled
-- the document text itself as a versioned table + read RPC â€” removed because
-- it solved a problem the spec doesn't ask for: nothing here has been pushed
-- to Supabase yet, so this file was rewritten in place rather than
-- superseded by a new migration number.)
--
-- Checkbox placement (decided 2026-09-15, see docs/phase2-work-tracker.md
-- Decisions log): one combined checkbox at sign-up for the 3 documents every
-- user needs (terms_of_service, privacy_policy, risk_disclosure), plus a
-- second, separate checkbox in the trainer studio flow for
-- partner_conduct_rules â€” that document only applies to trainers, and studio
-- is where a user becomes one.
--
-- Sign-up consent recording: NOT done via a client RPC call after signUp()
-- returns. This app requires email verification, so signUp() almost always
-- returns with no session yet (auth.uid() is null) â€” the session only
-- appears later, in a DIFFERENT browsing context (the user clicks the
-- verification link, typically in a new tab or even a different device via
-- their phone's mail app). A first attempt at this deferred the write via
-- sessionStorage + a flush-on-next-mount effect; that was wrong â€”
-- sessionStorage does not survive a link click into a new tab (no
-- window.opener relationship from an email client, so there's no "copy from
-- opener" exception either), so the flush would silently never fire for
-- most real users. Fixed by passing the consent choice through
-- `auth.signUp()`'s `options.data` (Supabase writes this to
-- `auth.users.raw_user_meta_data` synchronously, server-side, at signup â€”
-- no session or client round-trip required) and reading it back inside
-- `handle_new_user()` below, in the SAME transaction that creates the
-- `public.users` profile row. Works regardless of which device/tab/browser
-- the user later opens the verification link in.
--
-- Studio's partner_conduct_rules checkbox is different: the user already HAS
-- a session at that point (they're deep in an authenticated flow), so
-- accept_consent() below â€” a normal auth.uid()-gated RPC call â€” is correct
-- and sufficient there. No metadata trick needed for that one.

do $$ begin
  create type consent_document_slug as enum (
    'terms_of_service',
    'privacy_policy',
    'risk_disclosure',
    'partner_conduct_rules'
  );
exception when duplicate_object then null; end $$;

-- One row per (user, document, version) they've agreed to. `version_label` is
-- a free-form string matching whatever hand-bumped version the app showed at
-- accept time (e.g. "2026-09-15") â€” not a foreign key, because the document
-- text isn't a database entity; it's a point-in-time label for audit purposes.;

create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Cap the display name copied from OAuth metadata.;

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  bio text,
  gender text,
  birthdate date,
  locale text not null default 'en',
  experience_level experience_level,
  location geography(Point, 4326),
  home_area text,
  -- First-run profile setup. Answers live on user_onboarding (primaryActivity,
  -- experience). null status means the prompt has not been shown.
  profile_setup_status text
    check (profile_setup_status in ('completed', 'skipped')),
  profile_setup_at timestamptz,
  is_companion boolean not null default false,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  onboarding_completed boolean not null default false,
  weekly_target int not null default 5,
  banner_url text,
  is_admin boolean not null default false,
  bank_account_mask text,
  bank_code text,
  bank_name text,
  branch_name text,
  bank_account_number text,
  bank_account_holder text
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh text not null,
  icon text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- seeker activity interests;

create table if not exists user_activities (
  user_id uuid not null references users (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  primary key (user_id, activity_id)
);

-- Seed activities: Gym active, others inactive (enabled later);

-- Companion listing (1:1 with a companion profile)
create table if not exists companion_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  headline text,
  bio_long text,
  served_area text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Offerings: an activity at a tier and price within a listing
create table if not exists listing_offerings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references companion_listings (id) on delete cascade,
  activity_id uuid not null references activities (id),
  tier tier_level not null,
  price_ntd int not null default 0,
  is_free boolean not null default false,
  session_minutes int not null default 60,
  description text,
  created_at timestamptz not null default now()
);

-- Saved companions (bookmark)
create table if not exists saved_companions (
  seeker_id uuid not null references users (id) on delete cascade,
  companion_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seeker_id, companion_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references users (id) on delete cascade,
  companion_id uuid not null references users (id) on delete cascade,
  offering_id uuid references listing_offerings (id) on delete set null,
  activity_slug text,
  tier tier_level,
  status booking_status not null default 'requested',
  scheduled_start timestamptz,
  duration_min int not null default 60,
  location_name text,
  agreed_price int not null default 0,
  is_free boolean not null default false,
  seeker_note text,
  -- denormalized display (avoids cross-user profile reads under owner-only RLS)
  seeker_name text,
  seeker_photo text,
  companion_name text,
  companion_photo text,
  cancelled_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seeker_id <> companion_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  reviewer_id uuid not null references users (id) on delete cascade,
  reviewee_id uuid not null references users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  booking_id uuid references bookings (id) on delete cascade,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Weekly recurring availability slots (minutes from midnight, local intent).
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  blocked_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_date)
);

-- Tier A verification documents (metadata; files live in the private bucket).
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  doc_type text not null check (doc_type in ('certification', 'id')),
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 1:1 conversation between a sorted pair of participants.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references users (id) on delete cascade,
  participant_b uuid not null references users (id) on delete cascade,
  a_name text,
  a_photo text,
  b_name text,
  b_photo text,
  booking_id uuid references bookings (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists blocks (
  blocker_id uuid not null references users (id) on delete cascade,
  blocked_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users (id) on delete cascade,
  reported_id uuid not null references users (id) on delete cascade,
  booking_id uuid references bookings (id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'harassment', 'spam', 'safety', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  provider text not null default 'newebpay',
  merchant_order_no text not null,
  provider_trade_no text,
  amount int not null check (amount > 0),
  currency text not null default 'TWD',
  status payment_status not null default 'created',
  provider_status text,
  payment_method text,
  response_code text,
  response_message text,
  payment_instructions jsonb not null default '{}'::jsonb,
  initiated_at timestamptz not null default now(),
  returned_at timestamptz,
  notified_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_order_no),
  check (provider in ('newebpay', 'simulated')),
  check (currency = 'TWD')
,
  gross_amount int,
  platform_fee_rate numeric(5,4) not null default 0.05,
  platform_fee_amount int not null default 0,
  processing_fee_rate numeric(5,4),
  processing_fee_amount int,
  trainer_payable int,
  refund_status payment_refund_status not null default 'none',
  service_completed_at timestamptz,
  settlement_hold_until timestamptz,
  settlement_eligibility_status settlement_eligibility_status not null default 'ineligible',
  settlement_status settlement_status not null default 'unsettled',
  settled_at timestamptz,
  admin_hold boolean not null default false,
  admin_hold_reason text,
  admin_hold_by uuid references users (id) on delete set null,
  admin_hold_at timestamptz
);

create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references users (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  amount int not null check (amount > 0),
  bank_account_mask text not null,      -- masked; never the raw account here
  status text not null default 'requested'
    check (status in ('requested','processing','paid','rejected','cancelled')),
  reason_note text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  document_slug consent_document_slug not null,
  version_label text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_slug, version_label)
);

-- ---------------------------------------------------------------------------
-- 2. Audit log for admin corrections/actions on a payment (B-6, B-8: "each
--    change logs timestamp + acting admin"). Cron-driven automatic
--    transitions are also logged here with actor_id null, so the full
--    history (auto + admin) is one queryable trail per payment.
-- ---------------------------------------------------------------------------

create table if not exists payment_status_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  event_type text not null,
  from_value text,
  to_value text,
  reason_note text,
  actor_id uuid references users (id) on delete set null, -- null = system/cron
  created_at timestamptz not null default now()
);

-- Phase 2 Stage 3 steps 2-6 (docs/phase2-execution-order.md): withdrawal
-- request RPC, B-5 admin cancel/refund, B-4 trainer earnings view, B-7 admin
-- payout list, B-8 admin payout detail + workflow + corrections. Builds on
-- 0039 (settlement state machine: trainer_balance(), eligibility columns).
--
-- DOCUMENTED ASSUMPTION (not spec'd, flagged in phase2-work-tracker.md
-- Decisions log): the spec defines trainer balance as "sum of eligible,
-- unsettled orders" and a withdrawal request as an amount <= that balance,
-- but never specifies which underlying orders a paid-out withdrawal actually
-- settles. This migration settles whole orders FIFO (oldest
-- service_completed_at first) until the cumulative trainer_payable covers
-- the withdrawal amount, allowing the last order applied to push the total
-- slightly over the requested amount (never under). This keeps the ledger
-- reconcilable (every settled order is attributable to exactly one
-- withdrawal) without inventing partial-order settlement, which the schema's
-- per-order settlement_status enum ('unsettled'/'paid') can't represent
-- anyway. Reasonable default for Phase 1 simulated payouts; revisit if the
-- client's actual reconciliation process (manual bank transfer) needs exact
-- amounts instead.

-- ---------------------------------------------------------------------------
-- 1. Withdrawal status history (B-8: "each change logs timestamp + acting
--    admin", "full status history" in the detail view).
-- ---------------------------------------------------------------------------

create table if not exists withdrawal_status_events (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references withdrawal_requests (id) on delete cascade,
  from_status text,
  to_status text not null,
  reason_note text,
  actor_id uuid references users (id) on delete set null, -- null = trainer self-request
  created_at timestamptz not null default now()
);

-- No direct client policies: written by SECURITY DEFINER functions only,
-- read via the admin detail RPC (B-8) below.

-- Which specific orders a withdrawal settled (see assumption note above).
create table if not exists withdrawal_settlements (
  withdrawal_request_id uuid not null references withdrawal_requests (id) on delete cascade,
  payment_id uuid not null references payments (id) on delete cascade,
  amount_applied int not null,
  created_at timestamptz not null default now(),
  primary key (withdrawal_request_id, payment_id)
);

-- Exercise content library (A-7) + server-side storage for the AI plan
-- onboarding wizard's answers (About You / Training Preferences / Gym &
-- Equipment) and saved training plans.

-- exercises: read-only catalog data, same "readable by everyone
-- authenticated, no client writes" pattern as `activities` (0001_foundation.sql).
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh text not null,
  muscle_groups text[] not null default '{}',
  equipment_settings text[] not null default '{}',
  equipment text[] not null default '{}',
  instructions_en text[] not null default '{}',
  instructions_zh text[] not null default '{}',
  tips_en text[] not null default '{}',
  tips_zh text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- user_onboarding: the AI-plan wizard's collected answers, one row per user.
create table if not exists user_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal text,
  gym_type text,
  about_you jsonb not null default '{}'::jsonb,
  training_preferences jsonb not null default '{}'::jsonb,
  gym_equipment jsonb not null default '{}'::jsonb,
  nutrition jsonb,
  nutrition_status text check (nutrition_status in ('built', 'skipped')),
  updated_at timestamptz not null default now()
);

-- user_training_plans: saved plans — a user can have several (list/view/delete).
-- `goal` is the onboarding goal key (e.g. build_muscle) so the UI can
-- re-translate the plan title; `label` stays as the display fallback.
create table if not exists user_training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  plan jsonb not null,
  onboarding_snapshot jsonb not null default '{}'::jsonb,
  goal text,
  created_at timestamptz not null default now()
);

alter table user_onboarding
  add column if not exists active_plan_id uuid references user_training_plans (id) on delete set null;

-- One row per exercise per calendar day (Asia/Taipei). RPC-only: RLS on, no policies.
create table if not exists workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references user_training_plans (id) on delete set null,
  week int not null check (week between 1 and 52),
  day_index int not null check (day_index between 0 and 6),
  exercise_slug text not null check (char_length(exercise_slug) between 1 and 120),
  performed_on date not null,
  sets jsonb not null default '[]'::jsonb,
  effort text check (effort in ('too_light', 'just_right', 'too_heavy')),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, plan_id, week, day_index, exercise_slug, performed_on)
);

create index if not exists workout_exercise_logs_history_idx
  on workout_exercise_logs (user_id, exercise_slug, performed_on desc);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references user_training_plans (id) on delete set null,
  week int not null check (week between 1 and 52),
  day_index int not null check (day_index between 0 and 6),
  performed_on date not null,
  completed_at timestamptz not null default now(),
  unique nulls not distinct (user_id, plan_id, week, day_index, performed_on)
);

create index if not exists workout_sessions_user_idx on workout_sessions (user_id, performed_on desc);

alter table workout_exercise_logs enable row level security;
alter table workout_sessions enable row level security;

create index if not exists listing_offerings_listing_idx on listing_offerings (listing_id);

create index if not exists bookings_seeker_idx on bookings (seeker_id);

create index if not exists bookings_companion_idx on bookings (companion_id);

-- One open request per seeker/companion. Accepted and later states are not open.
create unique index if not exists bookings_one_open_per_pair_idx
  on bookings (seeker_id, companion_id)
  where status in ('requested', 'pending_payment', 'payment_processing', 'payment_failed');

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- One notification per (recipient, booking, type). Null booking_id stays unconstrained.
create unique index if not exists notifications_one_per_booking_event_idx
  on notifications (user_id, booking_id, type)
  where booking_id is not null;

create index if not exists availability_profile_idx on availability (user_id);

create index if not exists verifications_profile_idx on verifications (user_id);

create index if not exists conversations_a_idx on conversations (participant_a);

create index if not exists conversations_b_idx on conversations (participant_b);

create index if not exists messages_conv_idx on messages (conversation_id, created_at);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 4. Schema integrity + performance indexes.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- One offering per activity per listing: enforced in add_offering since 0023,
-- now also as a constraint (verified duplicate-free on live data).
create unique index if not exists listing_offerings_listing_activity_key
  on listing_offerings (listing_id, activity_id);

-- Geo search: nearby_companions was a sequential scan without this.
create index if not exists users_location_gix on users using gist (location)
  where location is not null;

-- FK / hot-path indexes.
create index if not exists reviews_reviewee_idx on reviews (reviewee_id);

create index if not exists reviews_reviewer_idx on reviews (reviewer_id);

create index if not exists listing_offerings_activity_idx on listing_offerings (activity_id);

create index if not exists saved_companions_companion_idx on saved_companions (companion_id);

create index if not exists blocks_blocked_idx on blocks (blocked_id);

create index if not exists conversations_booking_idx on conversations (booking_id);

create index if not exists bookings_offering_idx on bookings (offering_id);

create index if not exists user_activities_activity_idx on user_activities (activity_id);

create index if not exists messages_sender_idx on messages (sender_id);

create index if not exists reports_reporter_idx on reports (reporter_id);

create index if not exists reports_reported_idx on reports (reported_id);

create index if not exists reports_booking_idx on reports (booking_id);

create index if not exists verifications_gate_idx
  on verifications (user_id, doc_type, activity_id) where status = 'approved';

create index if not exists companion_listings_active_idx
  on companion_listings (status) where status = 'active';

-- Unread counters (bell badge / chat badges) hit only unread rows now.
create index if not exists notifications_unread_idx
  on notifications (user_id) where read_at is null;

create index if not exists messages_unread_idx
  on messages (conversation_id) where read_at is null;

create index if not exists payments_booking_idx on payments (booking_id, created_at desc);

create index if not exists payments_user_idx on payments (user_id, created_at desc);

create index if not exists payments_provider_trade_no_idx on payments (provider_trade_no);

create index if not exists payments_status_idx on payments (status);

-- One payment that is paid and not already flagged for refund. A late or
-- duplicate capture is stored as paid + refund_requested, so it does not
-- collide with the original.
create unique index if not exists payments_one_paid_per_booking_idx
  on payments (booking_id)
  where status = 'paid' and refund_status = 'none';

create index if not exists withdrawal_requests_trainer_idx
  on withdrawal_requests (trainer_id, requested_at desc);

create index if not exists withdrawal_requests_status_idx
  on withdrawal_requests (status);

create index if not exists consent_records_user_idx
  on consent_records (user_id, document_slug);

create index if not exists payment_status_events_payment_idx
  on payment_status_events (payment_id, created_at desc);

create index if not exists withdrawal_status_events_request_idx
  on withdrawal_status_events (withdrawal_request_id, created_at desc);

create index if not exists user_training_plans_user_id_created_at_idx
  on user_training_plans (user_id, created_at desc);

-- must match the bank account name

-- `bank_account_mask` (0035) is kept as the masked, export/listing-safe copy,
-- but is now derived automatically from `bank_account_number` instead of
-- being written by hand â€” keeps the two columns from ever drifting apart.
-- Mirrors apps/web/src/lib/export/mask.ts::maskBankAccount exactly (keep last
-- 4 chars, mask the rest; <=4 chars masks entirely; null/empty -> null).
create or replace function mask_bank_account(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_value is null or trim(p_value) = '' then null
    when length(trim(p_value)) <= 4 then repeat('*', length(trim(p_value)))
    else repeat('*', length(trim(p_value)) - 4) || right(trim(p_value), 4)
  end;
$$;

create or replace function users_set_bank_account_mask()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Ciphertext can't be masked: the server that encrypted it (or the back-fill,
  -- which leaves the existing mask in place) provides the mask instead.
  if new.bank_account_number like 'enc:%' then
    return new;
  end if;
  new.bank_account_mask := mask_bank_account(new.bank_account_number);
  return new;
end $$;

drop trigger if exists users_bank_account_mask on users;
create trigger users_bank_account_mask
  before insert or update of bank_account_number on users
  for each row execute function users_set_bank_account_mask();

comment on column users.bank_account_number is
  'Raw bank account number. Admin-detail-only (B-8); never appears in exports, listings, or logs. Format per P-6, best-guess default until client confirms.';
comment on column users.bank_account_mask is
  'Auto-derived from bank_account_number via users_bank_account_mask trigger. Safe for exports/listings (B-9, B-7).';



drop trigger if exists users_bank_account_mask on users;
create trigger users_bank_account_mask
  before insert or update of bank_account_number on users
  for each row execute function users_set_bank_account_mask();

comment on column users.bank_account_number is
  'Raw bank account number. Admin-detail-only (B-8); never appears in exports, listings, or logs. Format per P-6, best-guess default until client confirms.';
comment on column users.bank_account_mask is
  'Auto-derived from bank_account_number via users_bank_account_mask trigger. Safe for exports/listings (B-9, B-7).';

-- ---------------------------------------------------------------------------
-- Sign-up consent: extend handle_new_user() (0001/0010/0030) to also write
-- consent_records from auth.signUp()'s options.data metadata. The web client
-- passes:
--   { consent_terms_of_service: "2026-09-15",
--     consent_privacy_policy: "2026-09-15",
--     consent_risk_disclosure: "2026-09-15" }
-- (the CONSENT_VERSIONS labels from apps/web/src/lib/consent.ts, only
-- included when the sign-up checkbox was checked â€” the client blocks
-- submission otherwise, so their presence here is the record of consent).
-- Re-declaring the full function (`create or replace` needs the whole body);
-- the only change from 0030's version is the loop at the end.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_key text;
  slug consent_document_slug;
begin
  insert into public.users (id, display_name, photo_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'User'
      ),
      80
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  -- Sign-up consent (see comment block above). Loop over the 3 documents so
  -- adding a 4th sign-up-time document later is a one-line change here, not
  -- three near-identical inserts.
  foreach slug in array array['terms_of_service', 'privacy_policy', 'risk_disclosure']::consent_document_slug[]
  loop
    meta_key := 'consent_' || slug::text;
    if new.raw_user_meta_data ? meta_key then
      insert into consent_records (user_id, document_slug, version_label)
      values (new.id, slug, new.raw_user_meta_data ->> meta_key)
      on conflict (user_id, document_slug, version_label) do nothing;
    end if;
  end loop;

  return new;
end $$;

-- Bump last_message_at when a message lands (definer so the sender needn't
-- hold an explicit conversations UPDATE grant beyond participation).
create or replace function bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_bump_conversation on messages;
create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation();

-- Realtime stream for messages.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;

-- Recompute listing rating when a review lands on the companion.
create or replace function recompute_listing_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update companion_listings l
  set rating_count = sub.cnt,
      rating_avg = round(sub.avg, 1)
  from (
    select reviewee_id, count(*) cnt, avg(rating)::numeric avg
    from reviews where reviewee_id = new.reviewee_id group by reviewee_id
  ) sub
  where l.user_id = sub.reviewee_id;
  return new;
end $$;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert on reviews
  for each row execute function recompute_listing_rating();

-- Notify the relevant party on booking insert/status change. recipient and
-- payload are derived server-side only (no attacker-controlled routing).
create or replace function notify_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  ntype text;
begin
  if (tg_op = 'INSERT') then
    recipient := new.companion_id; ntype := 'booking_requested';
  elsif (new.status is distinct from old.status) then
    ntype := 'booking_' || new.status;
    if new.status in ('accepted', 'declined') then
      recipient := new.seeker_id;
    elsif new.status = 'cancelled' and new.cancelled_by is not null then
      recipient := case when new.cancelled_by = new.seeker_id then new.companion_id else new.seeker_id end;
    else
      recipient := new.seeker_id;
    end if;
  else
    return new;
  end if;

  insert into notifications (user_id, type, booking_id, payload)
  values (recipient, ntype, new.id, jsonb_build_object('booking_id', new.id, 'status', new.status))
  on conflict (user_id, booking_id, type) where booking_id is not null do nothing;
  return new;
end $$;

drop trigger if exists bookings_notify on bookings;
create trigger bookings_notify
  after insert or update on bookings
  for each row execute function notify_booking_event();



drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert on reviews
  for each row execute function recompute_listing_rating();

drop trigger if exists users_set_updated_at on users;

drop trigger if exists on_auth_user_created on auth.users;

drop trigger if exists users_set_updated_at on users;

drop trigger if exists on_auth_user_created on auth.users;

drop trigger if exists companion_listings_set_updated_at on companion_listings;

drop trigger if exists bookings_set_updated_at on bookings;

drop trigger if exists bookings_notify on bookings;

drop trigger if exists reviews_recompute_rating on reviews;

drop trigger if exists bookings_set_updated_at on bookings;

drop trigger if exists bookings_notify on bookings;

drop trigger if exists reviews_recompute_rating on reviews;

drop trigger if exists messages_bump_conversation on messages;

-- submit_review upserts (edit = ON CONFLICT DO UPDATE), but the recompute
-- trigger only fired on INSERT, so edited ratings never reached rating_avg.
drop trigger if exists reviews_recompute_rating on reviews;

drop trigger if exists payments_set_updated_at on payments;

drop trigger if exists payments_set_updated_at on payments;

drop trigger if exists withdrawal_requests_set_updated_at on withdrawal_requests;

drop trigger if exists withdrawal_requests_set_updated_at on withdrawal_requests;

drop trigger if exists users_bank_account_mask on users;

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger companion_listings_set_updated_at
  before update on companion_listings
  for each row execute function set_updated_at();

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger bookings_notify
  after insert or update on bookings
  for each row execute function notify_booking_event();

create trigger reviews_recompute_rating
  after insert or update of rating on reviews
  for each row execute function recompute_listing_rating();

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation();

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create trigger withdrawal_requests_set_updated_at
  before update on withdrawal_requests
  for each row execute function set_updated_at();

create trigger users_bank_account_mask
  before insert or update of bank_account_number on users
  for each row execute function users_set_bank_account_mask();

create trigger user_onboarding_set_updated_at
  before update on user_onboarding
  for each row execute function set_updated_at();

create or replace function nearby_companions(
  center_lat double precision,
  center_lng double precision,
  radius_m double precision default 20000,
  filter_activity text default null,
  filter_tier tier_level default null,
  max_price int default null
)
returns table (
  companion_id uuid, display_name text, photo_url text, experience_level experience_level,
  home_area text, tier tier_level, activity_slug text, price_ntd int, is_free boolean,
  distance_m double precision
)
language sql security definer set search_path = public stable as $$
  select
    p.id, p.display_name, p.photo_url, p.experience_level, p.home_area,
    o.tier, a.slug, o.price_ntd, o.is_free,
    round(ST_Distance(p.location, ST_MakePoint(center_lng, center_lat)::geography)) as distance_m
  from companion_listings l
  join users p on p.id = l.user_id
  join listing_offerings o on o.listing_id = l.id
  join activities a on a.id = o.activity_id
  where l.status = 'active'
    and p.location is not null
    and ST_DWithin(
      p.location,
      ST_MakePoint(center_lng, center_lat)::geography,
      least(greatest(coalesce(radius_m, 20000), 100), 100000)
    )
    and (filter_activity is null or a.slug = filter_activity)
    and (filter_tier is null or o.tier = filter_tier)
    and (max_price is null or o.price_ntd <= max_price)
    and not exists (
      select 1 from blocks bl
      where (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
         or (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
    )
  order by distance_m asc
  limit 100;
$$;

-- recommended_companions: clamp p_limit (anon could request unbounded rows).;

-- Public companion detail: safe columns only.
create or replace function get_companion(p_id uuid)
returns table (
  companion_id uuid,
  display_name text,
  photo_url text,
  bio text,
  experience_level experience_level,
  home_area text,
  rating_avg numeric,
  rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.bio, p.experience_level, p.home_area,
         coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;

grant execute on function get_companion to authenticated;

create or replace function accept_booking(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'accepted'
  where id = p_id and companion_id = auth.uid() and status = 'requested';
  if not found then raise exception 'accept not allowed'; end if;
end $$;

create or replace function decline_booking(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'declined'
  where id = p_id and companion_id = auth.uid() and status = 'requested';
  if not found then raise exception 'decline not allowed'; end if;
end $$;

create or replace function cancel_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r payments%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  update bookings
  set status = 'cancelled', cancelled_by = v_uid
  where id = p_id
    and (seeker_id = v_uid or companion_id = v_uid)
    and status in (
      'requested', 'pending_payment', 'payment_processing', 'payment_failed', 'accepted'
    );
  if not found then raise exception 'cancel not allowed'; end if;

  for r in
    select * from payments
    where booking_id = p_id
      and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    for update
  loop
    update payments
    set status = 'cancelled',
        failed_at = coalesce(failed_at, now())
    where id = r.id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, actor_id)
    values (r.id, 'booking_cancelled_open_attempt', r.status::text, 'cancelled', v_uid);
  end loop;

  for r in
    select * from payments
    where booking_id = p_id
      and status = 'paid'
      and refund_status = 'none'
      and settlement_status = 'unsettled'
    for update
  loop
    update payments
    set refund_status = 'refund_requested',
        settlement_eligibility_status = 'ineligible'
    where id = r.id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, actor_id)
    values (
      r.id, 'booking_cancelled_refund_requested', 'none', 'refund_requested', v_uid
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Simulated attempts record a zero processing fee (nothing to deduct).
-- ---------------------------------------------------------------------------

grant execute on function payment_review(uuid) to authenticated;
grant execute on function payment_detail(uuid) to authenticated;
grant execute on function create_newebpay_payment_attempt(uuid, text, int) to authenticated;
grant execute on function mark_newebpay_payment_redirected(uuid) to authenticated;
grant execute on function observe_newebpay_return(text, text, text, text, text, text, jsonb, payment_status) to service_role;
grant execute on function apply_newebpay_notification(text, int, text, text, text, text, text, jsonb, payment_status) to service_role;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;

create or replace function complete_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  update bookings
  set status = 'completed', completed_at = now()
  where id = p_id
    and (seeker_id = v_uid or companion_id = v_uid)
    and status = 'accepted';
  if not found then raise exception 'complete not allowed'; end if;

  select * into pay
  from payments
  where booking_id = p_id
    and status = 'paid'
    and service_completed_at is null
  order by paid_at desc nulls last, created_at desc
  limit 1
  for update;

  if not found then return; end if;
  if pay.settlement_status = 'paid' then return; end if;

  update payments
  set service_completed_at = now(),
      settlement_hold_until = now() + interval '24 hours'
  where id = pay.id;

  insert into payment_status_events (payment_id, event_type, to_value, actor_id)
  values (pay.id, 'service_completed_by_session', now()::text, v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- Cancel closes an open attempt, or asks for a refund on a paid unsettled
-- order. Settled orders stay put — an admin has to undo the payout first.
-- ---------------------------------------------------------------------------

grant execute on function accept_booking(uuid) to authenticated;
grant execute on function decline_booking(uuid) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;
grant execute on function complete_booking(uuid) to authenticated;



drop trigger if exists bookings_notify on bookings;
create trigger bookings_notify
  after insert or update on bookings
  for each row execute function notify_booking_event();



drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert on reviews
  for each row execute function recompute_listing_rating();

-- Refuses deletion while this user still has money in flight (open withdrawal,
-- in-progress payment, pending refund, or a paid order not yet settled).
-- Bookings are locked first so a payment attempt cannot start in between.
create or replace function assert_account_deletable(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from bookings
  where seeker_id = p_user_id or companion_id = p_user_id
  for update;

  if exists (
    select 1 from withdrawal_requests
    where trainer_id = p_user_id and status in ('requested', 'processing')
  ) or exists (
    select 1
    from payments p
    join bookings b on b.id = p.booking_id
    where (b.seeker_id = p_user_id or b.companion_id = p_user_id or p.user_id = p_user_id)
      and (
        p.status in ('created', 'redirected', 'processing', 'awaiting_payment')
        or (p.status = 'paid' and p.refund_status = 'refund_requested')
        or (p.status = 'paid' and p.refund_status = 'none' and p.settlement_status = 'unsettled')
      )
  ) then
    raise exception 'account_has_open_payments';
  end if;
end $$;

revoke all on function assert_account_deletable(uuid) from public, anon, authenticated;

-- Account deletion: removes the auth user; FKs cascade to profile + all data.
create or replace function delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform assert_account_deletable(auth.uid());
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function delete_account to authenticated;

create or replace function recommended_companions(
  p_activity text default null,
  p_limit int default 24
)
returns jsonb
language sql security definer set search_path = public stable as $$
  with headline as (
    select distinct on (o.listing_id)
      o.listing_id, o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ),
  acts as (
    select o.listing_id, array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    group by o.listing_id
  )
  select coalesce(
    jsonb_agg(r.obj order by r.rating_avg desc, r.rating_count desc),
    '[]'::jsonb
  )
  from (
    select
      jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
        'banner_url', p.banner_url,
        'tier', h.tier, 'activities', to_jsonb(acts.activities),
        'home_area', coalesce(p.home_area, l.served_area, ''),
        'price_ntd', h.price_ntd, 'is_free', h.is_free,
        'rating_avg', l.rating_avg, 'rating_count', l.rating_count,
        'experience_level', p.experience_level
      ) as obj,
      l.rating_avg, l.rating_count
    from companion_listings l
    join users p on p.id = l.user_id
    join headline h on h.listing_id = l.id
    join acts on acts.listing_id = l.id
    where l.status = 'active'
      and (p_activity is null or p_activity = any (acts.activities))
    order by l.rating_avg desc, l.rating_count desc
    limit least(greatest(coalesce(p_limit, 24), 1), 48)
  ) r;
$$;

-- companion_profile: previously `(l.status = 'active' or l.id is null)` leaked
-- non-companion users' profiles to anon; now active listings only. Also
-- restores the reviews list (dropped by 0022's restatement), capped at 50.;

create or replace function companion_profile(p_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
    'banner_url', p.banner_url,
    'tier', h.tier,
    'activities', to_jsonb(coalesce(acts.activities, array[]::text[])),
    'home_area', coalesce(p.home_area, l.served_area, ''),
    'price_ntd', coalesce(h.price_ntd, 0), 'is_free', coalesce(h.is_free, false),
    'rating_avg', coalesce(l.rating_avg, 0), 'rating_count', coalesce(l.rating_count, 0),
    'experience_level', p.experience_level,
    'bio', coalesce(p.bio, l.bio_long, ''),
    'certifications', coalesce(certs.list, '[]'::jsonb),
    'competitions', coalesce(comps.list, '[]'::jsonb),
    'offerings', coalesce(off.offerings, '[]'::jsonb),
    'gym_memberships', '[]'::jsonb,
    'availability', coalesce(av.slots, '[]'::jsonb),
    'reviews', coalesce(rv.reviews, '[]'::jsonb),
    'manager', null,
    'is_bidding', false
  ) end
  from users p
  join companion_listings l on l.user_id = p.id
  left join lateral (
    select distinct on (o.listing_id) o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    where o.listing_id = l.id
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ) h on true
  left join lateral (
    select array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) acts on true
  left join lateral (
    select jsonb_agg(v.label order by v.created_at) as list
    from verifications v
    where v.user_id = p.id and v.doc_type = 'certification'
      and v.status = 'approved' and v.label is not null
  ) certs on true
  left join lateral (
    select jsonb_agg(v.label order by v.created_at) as list
    from verifications v
    where v.user_id = p.id and v.doc_type = 'competition'
      and v.status = 'approved' and v.label is not null
  ) comps on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'activity', a.slug, 'tier', o.tier, 'price_ntd', o.price_ntd,
      'is_free', o.is_free, 'session_minutes', o.session_minutes
    ) order by o.tier asc) as offerings
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) off on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'weekday', av.weekday, 'start_minute', av.start_minute, 'end_minute', av.end_minute
    ) order by av.weekday, av.start_minute) as slots
    from availability av
    where av.user_id = p.id
  ) av on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'author_name', coalesce(ru.display_name, 'â€”'),
      'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at
    ) order by r.created_at desc) as reviews
    from (
      select r0.id, r0.reviewer_id, r0.rating, r0.comment, r0.created_at
      from reviews r0
      where r0.reviewee_id = p.id
      order by r0.created_at desc
      limit 50
    ) r
    join users ru on ru.id = r.reviewer_id
  ) rv on true
  where p.id = p_id and l.status = 'active';
$$;

-- create_booking: enforce blocks, bound inputs, reject past times, and stop
-- duplicate open requests against the same companion (notification spam).;

-- ---------------------------------------------------------------------------
-- Self-service account deletion
-- Deleting the auth.users row cascades to public.users (FK on delete cascade).
-- SECURITY DEFINER so an authenticated user can remove only their own account.
-- ---------------------------------------------------------------------------
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform assert_account_deletable(auth.uid());
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;

create or replace function update_my_profile(
  p_display_name text,
  p_bio text,
  p_experience_level experience_level,
  p_home_area text,
  p_gender text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_display_name, '')) > 80 then raise exception 'display name too long'; end if;
  if char_length(coalesce(p_bio, '')) > 2000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_home_area, '')) > 120 then raise exception 'home area too long'; end if;
  if char_length(coalesce(p_gender, '')) > 40 then raise exception 'gender too long'; end if;

  update users set
    display_name = coalesce(p_display_name, display_name),
    bio = p_bio,
    experience_level = coalesce(p_experience_level, experience_level),
    home_area = p_home_area,
    gender = coalesce(p_gender, gender)
  where id = auth.uid();
end $$;

-- Photo / banner URLs: must be http(s) and bounded (was arbitrary text).;

create or replace function set_my_photo_url(p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and (char_length(p_url) > 2048 or p_url !~ '^https?://') then
    raise exception 'invalid url';
  end if;
  update users set photo_url = p_url where id = auth.uid();
end $$;

create or replace function get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t) from (
    select display_name, photo_url, banner_url, bio, experience_level, home_area, gender,
           is_companion, onboarding_completed, weekly_target,
           coalesce(is_admin, false) as is_admin
    from users
    where id = auth.uid()
  ) t;
$$;

-- First-run profile setup. Answers go to the fitness profile (user_onboarding);
-- city reuses home_area; level is mirrored onto users.experience_level.
create or replace function save_profile_setup(
  p_primary_activity text,
  p_experience text,
  p_city text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_city, '')) > 120 then raise exception 'city too long'; end if;
  if p_primary_activity is not null and p_primary_activity not in ('gym', 'running', 'hiking', 'other') then
    raise exception 'invalid activity';
  end if;
  if p_experience is not null and p_experience not in ('no_experience', 'beginner', 'intermediate', 'advanced') then
    raise exception 'invalid experience';
  end if;

  insert into user_onboarding (user_id, about_you, training_preferences)
  values (
    auth.uid(),
    jsonb_strip_nulls(jsonb_build_object('primaryActivity', p_primary_activity)),
    jsonb_strip_nulls(jsonb_build_object('experience', p_experience))
  )
  on conflict (user_id) do update set
    about_you = user_onboarding.about_you || jsonb_strip_nulls(jsonb_build_object('primaryActivity', p_primary_activity)),
    training_preferences = user_onboarding.training_preferences || jsonb_strip_nulls(jsonb_build_object('experience', p_experience));

  update users set
    home_area = coalesce(nullif(btrim(p_city), ''), home_area),
    experience_level = coalesce(
      (case p_experience when 'no_experience' then 'beginner' else p_experience end)::experience_level,
      experience_level
    ),
    profile_setup_status = 'completed',
    profile_setup_at = now()
  where id = auth.uid();
end $$;

create or replace function skip_profile_setup() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update users set
    profile_setup_status = 'skipped',
    profile_setup_at = now()
  where id = auth.uid() and profile_setup_status is null;
end $$;

create or replace function my_profile_setup() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'status', u.profile_setup_status,
    'primaryActivity', o.about_you ->> 'primaryActivity',
    'experience', o.training_preferences ->> 'experience',
    'city', u.home_area
  )
  from users u
  left join user_onboarding o on o.user_id = u.id
  where u.id = auth.uid();
$$;

revoke all on function save_profile_setup(text, text, text) from public, anon, authenticated;
revoke all on function skip_profile_setup() from public, anon, authenticated;
revoke all on function my_profile_setup() from public, anon, authenticated;
grant execute on function save_profile_setup(text, text, text) to authenticated;
grant execute on function skip_profile_setup() to authenticated;
grant execute on function my_profile_setup() to authenticated;

create or replace function toggle_saved_companion(p_companion_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_companion_id then raise exception 'cannot save yourself'; end if;

  delete from saved_companions
  where seeker_id = auth.uid() and companion_id = p_companion_id;
  if found then
    return false;
  end if;

  insert into saved_companions (seeker_id, companion_id)
  values (auth.uid(), p_companion_id)
  on conflict do nothing;
  return true;
end $$;

-- get_companion: previously returned ANY user's profile fields to any
-- authenticated caller; now companions with an active listing only.;

-- The caller's saved companion ids, as a JSON array.
create or replace function my_saved_companion_ids()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(companion_id), '[]'::jsonb)
  from saved_companions
  where seeker_id = auth.uid();
$$;



grant execute on function toggle_saved_companion(uuid) to authenticated;
grant execute on function my_saved_companion_ids() to authenticated;
grant execute on function saved_companions_feed() to authenticated;

-- Trainer summaries (same shape as recommended_companions) for the caller's
-- saved companions that still have an active listing.
create or replace function saved_companions_feed()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with headline as (
    select distinct on (o.listing_id)
      o.listing_id, o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ),
  acts as (
    select o.listing_id, array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    group by o.listing_id
  )
  select coalesce(
    jsonb_agg(r.obj order by r.rating_avg desc, r.rating_count desc),
    '[]'::jsonb
  )
  from (
    select
      jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
        'tier', h.tier, 'activities', to_jsonb(acts.activities),
        'home_area', coalesce(p.home_area, l.served_area, ''),
        'price_ntd', h.price_ntd, 'is_free', h.is_free,
        'rating_avg', l.rating_avg, 'rating_count', l.rating_count,
        'experience_level', p.experience_level
      ) as obj,
      l.rating_avg, l.rating_count
    from companion_listings l
    join users p on p.id = l.user_id
    join headline h on h.listing_id = l.id
    join acts on acts.listing_id = l.id
    join saved_companions sc
      on sc.companion_id = l.user_id and sc.seeker_id = auth.uid()
    where l.status = 'active'
    order by l.rating_avg desc, l.rating_count desc
  ) r;
$$;

grant execute on function toggle_saved_companion(uuid) to authenticated;
grant execute on function my_saved_companion_ids() to authenticated;
grant execute on function saved_companions_feed() to authenticated;

create or replace function companion_offerings(p_companion_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lo.id,
        'activity', a.slug,
        'tier', lo.tier,
        'price_ntd', lo.price_ntd,
        'is_free', lo.is_free,
        'session_minutes', lo.session_minutes
      )
      order by lo.tier asc, lo.price_ntd asc
    ),
    '[]'::jsonb
  )
  from listing_offerings lo
  join companion_listings cl on cl.id = lo.listing_id
  join activities a on a.id = lo.activity_id
  where cl.user_id = p_companion_id and cl.status = 'active';
$$;

-- Create a booking request as the signed-in seeker. Denormalizes the
-- activity/tier/price from the offering and names/photos from both users.;

create or replace function create_booking(
  p_companion_id uuid,
  p_offering_id uuid,
  p_scheduled_start timestamptz,
  p_duration_min int,
  p_location_name text,
  p_seeker_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeker uuid := auth.uid();
  v_id uuid;
  o record;
  seeker_u record;
  comp_u record;
  v_constraint text;
begin
  if v_seeker is null then raise exception 'not authenticated'; end if;

  perform ensure_user_profile_row(v_seeker);

  if v_seeker = p_companion_id then raise exception 'cannot book yourself'; end if;
  if char_length(coalesce(p_seeker_note, '')) > 2000 then raise exception 'note too long'; end if;
  if char_length(coalesce(p_location_name, '')) > 200 then raise exception 'location too long'; end if;
  if p_scheduled_start is not null and p_scheduled_start < now() - interval '1 hour' then
    raise exception 'cannot book a time in the past';
  end if;
  if exists (
    select 1 from blocks
    where (blocker_id = v_seeker and blocked_id = p_companion_id)
       or (blocker_id = p_companion_id and blocked_id = v_seeker)
  ) then
    raise exception 'booking not available';
  end if;
  if exists (
    select 1 from bookings
    where seeker_id = v_seeker
      and companion_id = p_companion_id
      and status in ('requested', 'pending_payment', 'payment_processing', 'payment_failed')
  ) then
    raise exception 'you already have an open booking with this companion';
  end if;

  select lo.tier, lo.price_ntd, lo.is_free, lo.session_minutes, a.slug as activity_slug
    into o
  from listing_offerings lo
  join companion_listings cl on cl.id = lo.listing_id
  join activities a on a.id = lo.activity_id
  where lo.id = p_offering_id
    and cl.user_id = p_companion_id
    and cl.status = 'active';
  if not found then raise exception 'offering not available'; end if;

  select display_name, photo_url into seeker_u from users where id = v_seeker;
  select display_name, photo_url into comp_u from users where id = p_companion_id;

  begin
    insert into bookings (
      seeker_id, companion_id, offering_id, activity_slug, tier, status,
      scheduled_start, duration_min, location_name, agreed_price, is_free,
      seeker_note, seeker_name, seeker_photo, companion_name, companion_photo
    ) values (
      v_seeker,
      p_companion_id,
      p_offering_id,
      o.activity_slug,
      o.tier,
      case when o.is_free or o.price_ntd <= 0 then 'requested'::booking_status else 'pending_payment'::booking_status end,
      p_scheduled_start,
      least(greatest(coalesce(p_duration_min, o.session_minutes), 15), 480),
      p_location_name,
      o.price_ntd,
      o.is_free,
      p_seeker_note,
      seeker_u.display_name,
      seeker_u.photo_url,
      comp_u.display_name,
      comp_u.photo_url
    )
    returning id into v_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_one_open_per_pair_idx' then
        raise exception 'you already have an open booking with this companion';
      end if;
      raise;
  end;

  return v_id;
end $$;

-- All bookings the caller is part of (as seeker or companion), newest first.
create or replace function my_bookings()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc), '[]'::jsonb)
  from (
    select id, seeker_id, companion_id, offering_id, activity_slug, tier, status,
           scheduled_start, duration_min, location_name, agreed_price, is_free,
           seeker_note, seeker_name, seeker_photo, companion_name, companion_photo,
           completed_at, created_at
    from bookings
    where seeker_id = auth.uid() or companion_id = auth.uid()
  ) b;
$$;



grant execute on function companion_offerings(uuid) to anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function my_bookings() to authenticated;
grant execute on function booking_detail(uuid) to authenticated;

-- A single booking the caller is part of.
create or replace function booking_detail(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(b)
  from (
    select id, seeker_id, companion_id, offering_id, activity_slug, tier, status,
           scheduled_start, duration_min, location_name, agreed_price, is_free,
           seeker_note, seeker_name, seeker_photo, companion_name, companion_photo,
           completed_at, created_at
    from bookings
    where id = p_id and (seeker_id = auth.uid() or companion_id = auth.uid())
  ) b;
$$;

grant execute on function companion_offerings(uuid) to anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function my_bookings() to authenticated;
grant execute on function booking_detail(uuid) to authenticated;

-- Set the caller's weekly training target (clamped 1â€“21).
create or replace function set_weekly_target(p_target int)
returns void
language sql
security definer
set search_path = public
as $$
  update users
  set weekly_target = greatest(1, least(coalesce(p_target, 5), 21))
  where id = auth.uid();
$$;



grant execute on function set_weekly_target(int) to authenticated;
grant execute on function weekly_progress() to authenticated;

-- The caller's weekly target and how many sessions they've completed this week.
create or replace function weekly_progress()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'target', coalesce((select weekly_target from users where id = auth.uid()), 5),
    'done', (
      select count(*)
      from bookings
      where (seeker_id = auth.uid() or companion_id = auth.uid())
        and status = 'completed'
        and completed_at >= date_trunc('week', now())
    )
  );
$$;

grant execute on function set_weekly_target(int) to authenticated;
grant execute on function weekly_progress() to authenticated;

create or replace function submit_review(
  p_booking_id uuid,
  p_rating int,
  p_comment text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  v_reviewee uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating out of range'; end if;

  select seeker_id, companion_id, status into b
  from bookings where id = p_booking_id;
  if not found then raise exception 'booking not found'; end if;
  if b.status <> 'completed' then raise exception 'booking not completed'; end if;

  if v_uid = b.seeker_id then
    v_reviewee := b.companion_id;
  elsif v_uid = b.companion_id then
    v_reviewee := b.seeker_id;
  else
    raise exception 'not a participant';
  end if;

  insert into reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
  values (p_booking_id, v_uid, v_reviewee, p_rating, nullif(btrim(p_comment), ''))
  on conflict (booking_id, reviewer_id)
  do update set rating = excluded.rating, comment = excluded.comment
  returning id into v_id;

  return v_id;
end;
$$;

-- The caller's own review for a booking (to toggle the review UI), or null.;

create or replace function my_review_for_booking(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(r)
  from (
    select id, rating, comment, created_at
    from reviews
    where booking_id = p_booking_id and reviewer_id = auth.uid()
  ) r;
$$;

-- Recreate companion_profile so the detail page shows real reviews of the
-- companion (reviewer name + rating + comment).;

-- Notifications reads via RPCs. Rows are created by the notify_booking_event
-- trigger (0006); these expose them to the web client.

-- The caller's notifications (newest 50).
create or replace function my_notifications()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
  from (
    select id, type, payload, read_at, created_at
    from notifications
    where user_id = auth.uid()
    order by created_at desc
    limit 50
  ) n;
$$;





grant execute on function my_notifications() to authenticated;
grant execute on function unread_notification_count() to authenticated;
grant execute on function mark_notifications_read() to authenticated;

-- Count of the caller's unread notifications (for the bell badge).
create or replace function unread_notification_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from notifications
  where user_id = auth.uid() and read_at is null;
$$;



grant execute on function my_notifications() to authenticated;
grant execute on function unread_notification_count() to authenticated;
grant execute on function mark_notifications_read() to authenticated;

-- Mark all the caller's notifications read.
create or replace function mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

grant execute on function my_notifications() to authenticated;
grant execute on function unread_notification_count() to authenticated;
grant execute on function mark_notifications_read() to authenticated;

create or replace function has_booking_with(p_other_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from bookings
    where (seeker_id = auth.uid() and companion_id = p_other_id)
       or (seeker_id = p_other_id and companion_id = auth.uid())
  );
$$;

-- Open (or fetch) the conversation with another user. Requires a booking.;

create or replace function start_conversation(p_other_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a uuid;
  b uuid;
  v_id uuid;
  pa record;
  pb record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_uid = p_other_id then raise exception 'cannot message yourself'; end if;
  if not has_booking_with(p_other_id) then
    raise exception 'a booking is required before messaging';
  end if;
  if exists (
    select 1 from blocks
    where (blocker_id = v_uid and blocked_id = p_other_id)
       or (blocker_id = p_other_id and blocked_id = v_uid)
  ) then
    raise exception 'messaging unavailable';
  end if;

  a := least(v_uid, p_other_id);
  b := greatest(v_uid, p_other_id);
  select display_name, photo_url into pa from users where id = a;
  select display_name, photo_url into pb from users where id = b;

  insert into conversations (participant_a, participant_b, a_name, a_photo, b_name, b_photo)
  values (a, b, pa.display_name, pa.photo_url, pb.display_name, pb.photo_url)
  on conflict (participant_a, participant_b)
  do update set last_message_at = conversations.last_message_at
  returning id into v_id;

  return v_id;
end $$;

-- send_message: blocked pairs cannot keep messaging in an existing thread.;

create or replace function my_conversations()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(c.obj order by c.last_message_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', cv.id,
      'other_id', case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end,
      'other_name', case when cv.participant_a = auth.uid() then cv.b_name else cv.a_name end,
      'other_photo', case when cv.participant_a = auth.uid() then cv.b_photo else cv.a_photo end,
      'last_message_at', cv.last_message_at,
      'last_body', (
        select m.body from messages m
        where m.conversation_id = cv.id order by m.created_at desc limit 1
      ),
      'unread', (
        select count(*) from messages m
        where m.conversation_id = cv.id and m.sender_id <> auth.uid() and m.read_at is null
      )
    ) as obj,
    cv.last_message_at
    from conversations cv
    where cv.participant_a = auth.uid() or cv.participant_b = auth.uid()
  ) c;
$$;

-- Header info (the other party) for a single conversation.;

create or replace function conversation_header(p_conversation_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', cv.id,
    'other_id', case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end,
    'other_name', case when cv.participant_a = auth.uid() then cv.b_name else cv.a_name end,
    'other_photo', case when cv.participant_a = auth.uid() then cv.b_photo else cv.a_photo end
  )
  from conversations cv
  where cv.id = p_conversation_id
    and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid());
$$;

-- Messages in a conversation the caller participates in (oldest first).;

-- Messages in a conversation the caller participates in (oldest first).
create or replace function conversation_messages(p_conversation_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender_id', m.sender_id, 'body', m.body, 'created_at', m.created_at
  ) order by m.created_at asc), '[]'::jsonb)
  from messages m
  join conversations cv on cv.id = m.conversation_id
  where m.conversation_id = p_conversation_id
    and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid());
$$;





grant execute on function has_booking_with(uuid) to authenticated;
grant execute on function start_conversation(uuid) to authenticated;
grant execute on function my_conversations() to authenticated;
grant execute on function conversation_header(uuid) to authenticated;
grant execute on function conversation_messages(uuid) to authenticated;
grant execute on function send_message(uuid, text) to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;

create or replace function send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_other uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty message'; end if;
  if char_length(p_body) > 4000 then raise exception 'message too long'; end if;

  select case when participant_a = v_uid then participant_b else participant_a end
    into v_other
  from conversations
  where id = p_conversation_id and (participant_a = v_uid or participant_b = v_uid);
  if v_other is null then raise exception 'not a participant'; end if;

  if exists (
    select 1 from blocks
    where (blocker_id = v_uid and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = v_uid)
  ) then
    raise exception 'messaging unavailable';
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_uid, btrim(p_body))
  returning id into v_id;
  return v_id;
end $$;

-- submit_verification: the document must live in the caller's own storage
-- folder, labels are capped, and duplicate pending/approved submissions for
-- the same (doc_type, activity) are rejected (admin-queue spam guard).;

-- Mark the other party's messages in a conversation as read.
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null
    and exists (
      select 1 from conversations cv
      where cv.id = p_conversation_id
        and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid())
    );
$$;

grant execute on function has_booking_with(uuid) to authenticated;
grant execute on function start_conversation(uuid) to authenticated;
grant execute on function my_conversations() to authenticated;
grant execute on function conversation_header(uuid) to authenticated;
grant execute on function conversation_messages(uuid) to authenticated;
grant execute on function send_message(uuid, text) to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;

create or replace function my_listing()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'is_companion', (select is_companion from users where id = auth.uid()),
    'verifications', (
      select coalesce(
        jsonb_object_agg(v.slug, jsonb_build_object('status', v.status, 'label', v.label)),
        '{}'::jsonb
      )
      from (
        select distinct on (a.slug) a.slug, ver.status, ver.label
        from verifications ver
        join activities a on a.id = ver.activity_id
        where ver.user_id = auth.uid()
          and ver.doc_type = 'certification'
          and ver.activity_id is not null
        order by a.slug,
          case ver.status when 'approved' then 2 when 'pending' then 1 else 0 end desc,
          ver.created_at desc
      ) v
    ),
    'competitions', (
      select coalesce(
        jsonb_object_agg(v.slug, jsonb_build_object('status', v.status, 'label', v.label)),
        '{}'::jsonb
      )
      from (
        select distinct on (a.slug) a.slug, ver.status, ver.label
        from verifications ver
        join activities a on a.id = ver.activity_id
        where ver.user_id = auth.uid()
          and ver.doc_type = 'competition'
          and ver.activity_id is not null
        order by a.slug,
          case ver.status when 'approved' then 2 when 'pending' then 1 else 0 end desc,
          ver.created_at desc
      ) v
    ),
    'listing', (
      select to_jsonb(l) from (
        select id, headline, bio_long, served_area, status, rating_avg, rating_count
        from companion_listings where user_id = auth.uid()
      ) l
    ),
    'offerings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'activity', a.slug, 'tier', o.tier,
        'price_ntd', o.price_ntd, 'is_free', o.is_free,
        'session_minutes', o.session_minutes
      ) order by o.tier, o.price_ntd), '[]'::jsonb)
      from listing_offerings o
      join activities a on a.id = o.activity_id
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = auth.uid()
    ),
    'availability', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', av.id, 'weekday', av.weekday,
        'start_minute', av.start_minute, 'end_minute', av.end_minute
      ) order by av.weekday, av.start_minute), '[]'::jsonb)
      from availability av where av.user_id = auth.uid()
    )
  );
$$;

create or replace function upsert_my_listing(
  p_headline text,
  p_bio_long text,
  p_served_area text,
  p_status text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_status not in ('draft', 'active', 'paused') then
    raise exception 'invalid status';
  end if;
  if char_length(coalesce(p_headline, '')) > 120 then raise exception 'headline too long'; end if;
  if char_length(coalesce(p_bio_long, '')) > 4000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_served_area, '')) > 120 then raise exception 'served area too long'; end if;

  update users set is_companion = true where id = v_uid;

  insert into companion_listings (user_id, headline, bio_long, served_area, status)
  values (v_uid, p_headline, p_bio_long, p_served_area, p_status)
  on conflict (user_id) do update set
    headline = excluded.headline,
    bio_long = excluded.bio_long,
    served_area = excluded.served_area,
    status = excluded.status
  returning id into v_id;

  return v_id;
end $$;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 7. Function ACLs: strip the implicit PUBLIC EXECUTE from every app function,
--    then grant back exactly what each audience needs. (Trigger functions get
--    no grants â€” only their triggers invoke them.)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'set_updated_at', 'handle_new_user', 'notify_booking_event',
        'recompute_listing_rating', 'bump_conversation',
        'nearby_companions', 'get_companion', 'delete_account',
        'recommended_companions', 'companion_profile', 'delete_current_user',
        'update_my_profile', 'set_my_photo_url', 'set_my_banner_url', 'get_my_profile',
        'toggle_saved_companion', 'my_saved_companion_ids', 'saved_companions_feed',
        'companion_offerings', 'create_booking', 'my_bookings', 'booking_detail',
        'accept_booking', 'decline_booking', 'cancel_booking', 'complete_booking',
        'set_weekly_target', 'weekly_progress',
        'submit_review', 'my_review_for_booking',
        'my_notifications', 'unread_notification_count', 'mark_notifications_read',
        'has_booking_with', 'start_conversation', 'my_conversations',
        'conversation_header', 'conversation_messages', 'send_message',
        'mark_conversation_read',
        'my_listing', 'upsert_my_listing', 'add_offering', 'remove_offering',
        'add_availability', 'remove_availability', 'set_my_availability',
        'is_platform_admin', 'am_i_admin',
        'submit_verification', 'list_pending_verifications', 'review_verification',
        'complete_onboarding', 'my_blocked_ids', 'block_user', 'unblock_user',
        'report_user'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Public (anon) surface: read-only web discovery, nothing else.;

-- Pricing rework after market feedback: per-tier FLOORS only, no ceilings.
--   * Tier C at 600â€“800 read as "half a trainer's rate, without the cert" â€”
--     the C floor drops to NT$400 so companionship pricing is honest.
--   * Ceilings are removed across all tiers so high-demand companions can
--     price at a premium; floors still stop intra-tier undercutting.
--       C: 400+   B: 800+   A: 1200+
--   Kept in sync with @pacergo/shared TIER_PRICE_FLOORS.
-- Cert gates are unchanged (B/A need an approved certification for the
-- activity; A additionally needs approved competition experience â€” see 0027).

create or replace function add_offering(
  p_activity_slug text,
  p_tier tier_level,
  p_price_ntd int,
  p_is_free boolean,
  p_session_minutes int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing uuid;
  v_activity uuid;
  v_id uuid;
  v_min int;
  v_price int := coalesce(p_price_ntd, 0);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_listing from companion_listings where user_id = v_uid;
  if not found then raise exception 'create your listing first'; end if;
  select id into v_activity from activities where slug = p_activity_slug;
  if not found then raise exception 'unknown activity'; end if;

  -- 1. Price floor per tier (inclusive, no ceiling). Keep in sync with
  --    TIER_PRICE_FLOORS.
  v_min := case p_tier when 'C' then 400 when 'B' then 800 when 'A' then 1200 end;
  if v_price < v_min then
    raise exception 'price % is below the NT$% floor for tier %',
      v_price, v_min, p_tier;
  end if;

  -- 2. Tier B and A require an approved certification for this activity.
  if p_tier in ('A', 'B') and not exists (
    select 1 from verifications
    where user_id = v_uid and doc_type = 'certification'
      and activity_id = v_activity and status = 'approved'
  ) then
    raise exception 'tier % requires an approved certification for %', p_tier, p_activity_slug;
  end if;

  -- 3. Tier A additionally requires approved competition experience.
  if p_tier = 'A' and not exists (
    select 1 from verifications
    where user_id = v_uid and doc_type = 'competition'
      and activity_id = v_activity and status = 'approved'
  ) then
    raise exception 'tier A requires approved competition experience for %', p_activity_slug;
  end if;

  -- Enforce one offering (one tier) per activity on this listing.
  delete from listing_offerings
  where listing_id = v_listing and activity_id = v_activity;

  insert into listing_offerings (listing_id, activity_id, tier, price_ntd, is_free, session_minutes)
  values (
    v_listing, v_activity, p_tier,
    v_price,
    false, -- no free offerings; the platform floor is NT$400
    coalesce(p_session_minutes, 60)
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;

-- Remove one of the caller's offerings.
create or replace function remove_offering(p_offering_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from listing_offerings o
  using companion_listings cl
  where o.id = p_offering_id
    and o.listing_id = cl.id
    and cl.user_id = auth.uid();
$$;





grant execute on function my_listing() to authenticated;
grant execute on function upsert_my_listing(text, text, text, text) to authenticated;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
grant execute on function remove_offering(uuid) to authenticated;
grant execute on function add_availability(int, int, int) to authenticated;
grant execute on function remove_availability(uuid) to authenticated;

-- Add a weekly availability slot for the caller.
create or replace function add_availability(
  p_weekday int,
  p_start_minute int,
  p_end_minute int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_weekday < 0 or p_weekday > 6 then raise exception 'invalid weekday'; end if;
  if p_end_minute <= p_start_minute then raise exception 'invalid time range'; end if;

  insert into availability (user_id, weekday, start_minute, end_minute)
  values (v_uid, p_weekday, p_start_minute, p_end_minute)
  returning id into v_id;
  return v_id;
end;
$$;



grant execute on function my_listing() to authenticated;
grant execute on function upsert_my_listing(text, text, text, text) to authenticated;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
grant execute on function remove_offering(uuid) to authenticated;
grant execute on function add_availability(int, int, int) to authenticated;
grant execute on function remove_availability(uuid) to authenticated;

-- Remove one of the caller's availability slots.
create or replace function remove_availability(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from availability where id = p_id and user_id = auth.uid();
$$;

grant execute on function my_listing() to authenticated;
grant execute on function upsert_my_listing(text, text, text, text) to authenticated;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
grant execute on function remove_offering(uuid) to authenticated;
grant execute on function add_availability(int, int, int) to authenticated;
grant execute on function remove_availability(uuid) to authenticated;

create or replace function set_my_banner_url(p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and (char_length(p_url) > 2048 or p_url !~ '^https?://') then
    raise exception 'invalid url';
  end if;
  update users set banner_url = p_url where id = auth.uid();
end $$;

-- complete_onboarding: caps.;

create or replace function is_platform_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from users where id = auth.uid()), false);
$$;

create or replace function am_i_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select is_platform_admin();
$$;

-- Admin: paginated member list (admins first) and promote/revoke admin.
drop function if exists list_all_users(int, int);
drop function if exists list_all_users(int, int, text);

create or replace function list_all_users(
  p_limit int default 20,
  p_offset int default 0,
  p_search text default null,
  p_role text default null          -- member | trainer | admin (null = everyone)
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_users jsonb;
  v_total int;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_role is not null and p_role not in ('member', 'trainer', 'admin') then
    raise exception 'invalid_role';
  end if;

  select count(*) into v_total
  from users u
  join auth.users au on au.id = u.id
  where (v_search is null
     or u.display_name ilike '%' || v_search || '%'
     or au.email ilike '%' || v_search || '%')
    and (p_role is null
     or (p_role = 'admin' and u.is_admin)
     or (p_role = 'trainer' and u.is_companion)
     or (p_role = 'member' and not u.is_admin and not u.is_companion));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'display_name', s.display_name,
    'photo_url', s.photo_url,
    'email', s.email,
    'is_companion', s.is_companion,
    'is_admin', s.is_admin,
    'created_at', s.created_at
  ) order by s.is_admin desc, s.created_at desc), '[]'::jsonb) into v_users
  from (
    select u.id, u.display_name, u.photo_url, au.email,
           u.is_companion, u.is_admin, u.created_at
    from users u
    join auth.users au on au.id = u.id
    where (v_search is null
       or u.display_name ilike '%' || v_search || '%'
       or au.email ilike '%' || v_search || '%')
      and (p_role is null
       or (p_role = 'admin' and u.is_admin)
       or (p_role = 'trainer' and u.is_companion)
       or (p_role = 'member' and not u.is_admin and not u.is_companion))
    order by u.is_admin desc, u.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) s;

  return jsonb_build_object('users', v_users, 'total', v_total);
end;
$$;
revoke all on function list_all_users(int, int, text, text) from public, anon;
grant execute on function list_all_users(int, int, text, text) to authenticated;

-- Admin dashboard headline numbers (one cheap aggregate instead of loading rows).
create or replace function admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  return (
    select jsonb_build_object(
      'total_users', count(*),
      'total_trainers', count(*) filter (where is_companion),
      'total_admins', count(*) filter (where is_admin),
      'new_users_30d', count(*) filter (where created_at >= now() - interval '30 days')
    )
    from users
  );
end $$;
revoke all on function admin_dashboard_stats() from public, anon;
grant execute on function admin_dashboard_stats() to authenticated;

-- Admin: everything the user sheet shows for one account. Counts and masked /
-- derived values only — never the push token, exact coordinates, birthdate
-- (age instead), full bank account number, or chat messages.
create or replace function admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u record;
  v_trainer jsonb := null;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select us.*,
         au.email as auth_email,
         au.email_confirmed_at,
         au.last_sign_in_at,
         o.about_you as ob_about_you,
         o.training_preferences as ob_training_preferences,
         o.goal as ob_goal
    into u
  from users us
  join auth.users au on au.id = us.id
  left join user_onboarding o on o.user_id = us.id
  where us.id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;

  if u.is_companion then
    v_trainer := jsonb_build_object(
      'listing', (
        select jsonb_build_object(
          'headline', cl.headline,
          'served_area', cl.served_area,
          'status', cl.status,
          'rating_avg', cl.rating_avg,
          'rating_count', cl.rating_count,
          'offerings', coalesce((
            select jsonb_agg(jsonb_build_object(
              'activity', a.slug,
              'tier', lo.tier::text,
              'price_ntd', lo.price_ntd,
              'is_free', lo.is_free,
              'session_minutes', lo.session_minutes
            ) order by lo.created_at)
            from listing_offerings lo
            join activities a on a.id = lo.activity_id
            where lo.listing_id = cl.id
          ), '[]'::jsonb)
        )
        from companion_listings cl
        where cl.user_id = p_user_id
      ),
      'verifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ver.id,
          'doc_type', ver.doc_type,
          'activity', a.slug,
          'label', ver.label,
          'status', ver.status,
          'created_at', ver.created_at,
          'reviewed_at', ver.reviewed_at
        ) order by ver.created_at desc)
        from verifications ver
        left join activities a on a.id = ver.activity_id
        where ver.user_id = p_user_id
      ), '[]'::jsonb),
      'money', jsonb_build_object(
        'available_balance', trainer_available_balance(p_user_id),
        'open_withdrawals_count', (
          select count(*) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status in ('requested', 'processing')
        ),
        'open_withdrawals_sum', coalesce((
          select sum(w.amount) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status in ('requested', 'processing')
        ), 0),
        'total_paid_out', coalesce((
          select sum(w.amount) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status = 'paid'
        ), 0),
        'completed_orders', (
          select count(*) from bookings b
          where b.companion_id = p_user_id and b.status = 'completed'
        ),
        'bank_code', u.bank_code,
        'bank_name', u.bank_name,
        'branch_name', u.branch_name,
        'bank_account_holder', u.bank_account_holder,
        'bank_account_mask', u.bank_account_mask,
        'has_bank_account', u.bank_account_number is not null
      )
    );
  end if;

  return jsonb_build_object(
    'id', u.id,
    'display_name', u.display_name,
    'photo_url', u.photo_url,
    'email', u.auth_email,
    'email_confirmed', u.email_confirmed_at is not null,
    'is_admin', u.is_admin,
    'is_companion', u.is_companion,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'last_sign_in_at', u.last_sign_in_at,
    'profile', jsonb_build_object(
      'bio', u.bio,
      'gender', u.gender,
      'age', case when u.birthdate is null then null
                  else date_part('year', age(u.birthdate))::int end,
      'home_area', u.home_area,
      'locale', u.locale,
      'experience_level', u.experience_level::text,
      'weekly_target', u.weekly_target
    ),
    'setup', jsonb_build_object(
      'profile_setup_status', u.profile_setup_status,
      'onboarding_completed', u.onboarding_completed
    ),
    'fitness', jsonb_build_object(
      'primary_activity', u.ob_about_you ->> 'primaryActivity',
      'goal', coalesce(u.ob_goal, u.ob_about_you ->> 'goal'),
      'experience', u.ob_training_preferences ->> 'experience'
    ),
    'activity', jsonb_build_object(
      'bookings_made', (select count(*) from bookings b where b.seeker_id = p_user_id),
      'bookings_received', (select count(*) from bookings b where b.companion_id = p_user_id),
      'reviews_given', (select count(*) from reviews r where r.reviewer_id = p_user_id),
      'saved_trainers', (select count(*) from saved_companions s where s.seeker_id = p_user_id)
    ),
    'safety', jsonb_build_object(
      'blocked_by_me', (select count(*) from blocks b where b.blocker_id = p_user_id),
      'blocked_me', (select count(*) from blocks b where b.blocked_id = p_user_id),
      'reports_filed', (select count(*) from reports r where r.reporter_id = p_user_id),
      'reports_received', (select count(*) from reports r where r.reported_id = p_user_id),
      'consents', coalesce((
        select jsonb_agg(jsonb_build_object(
          'document', c.document_slug::text,
          'version', c.version_label,
          'accepted_at', c.accepted_at
        ) order by c.accepted_at desc)
        from consent_records c
        where c.user_id = p_user_id
      ), '[]'::jsonb)
    ),
    'trainer', v_trainer
  );
end $$;
revoke all on function admin_user_detail(uuid) from public, anon;
grant execute on function admin_user_detail(uuid) to authenticated;

create or replace function set_user_admin(
  p_user_id uuid,
  p_is_admin boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot change your own admin status'; end if;
  update users set is_admin = p_is_admin where id = p_user_id;
end;
$$;
revoke all on function set_user_admin(uuid, boolean) from public, anon;
grant execute on function set_user_admin(uuid, boolean) to authenticated;

create or replace function submit_verification(
  p_doc_type text,
  p_document_path text,
  p_label text,
  p_activity_slug text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_activity uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_doc_type not in ('certification', 'competition', 'id') then
    raise exception 'invalid doc type';
  end if;
  if coalesce(p_document_path, '') = '' then raise exception 'missing document'; end if;
  if position(v_uid::text || '/' in p_document_path) <> 1 then
    raise exception 'invalid document path';
  end if;
  if char_length(coalesce(p_label, '')) > 200 then raise exception 'label too long'; end if;

  if p_doc_type in ('certification', 'competition') then
    select id into v_activity from activities where slug = p_activity_slug;
    if not found then raise exception 'unknown activity'; end if;
  end if;

  if exists (
    select 1 from verifications
    where user_id = v_uid
      and doc_type = p_doc_type
      and (v_activity is null or activity_id = v_activity)
      and status in ('pending', 'approved')
  ) then
    raise exception 'a submission for this is already pending or approved';
  end if;

  insert into verifications (user_id, doc_type, document_path, label, activity_id, status)
  values (v_uid, p_doc_type, p_document_path, nullif(p_label, ''), v_activity, 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- review_verification: surface a miss instead of silently succeeding.;

create or replace function list_pending_verifications()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.ord, s.created_at desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'id', ver.id,
      'user_id', ver.user_id,
      'display_name', u.display_name,
      'photo_url', u.photo_url,
      'doc_type', ver.doc_type,
      'activity', a.slug,
      'label', ver.label,
      'document_path', ver.document_path,
      'status', ver.status,
      'notes', ver.notes,
      'created_at', ver.created_at,
      'reviewed_at', ver.reviewed_at
    ) as obj,
    case ver.status when 'pending' then 0 when 'approved' then 1 else 2 end as ord,
    ver.created_at
    from verifications ver
    join users u on u.id = ver.user_id
    left join activities a on a.id = ver.activity_id
    where ver.doc_type in ('certification', 'competition')
  ) s;
  return v;
end;
$$;

create or replace function review_verification(
  p_id uuid,
  p_status text,
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  update verifications set
    status = p_status,
    notes = nullif(p_notes, ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id;
  if not found then raise exception 'verification not found'; end if;
end $$;

-- upsert_my_listing: length caps for the free-text fields.;

create or replace function complete_onboarding(
  p_display_name text,
  p_experience_level experience_level,
  p_home_area text,
  p_activity_ids uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_display_name, '')) > 80 then raise exception 'display name too long'; end if;
  if char_length(coalesce(p_home_area, '')) > 120 then raise exception 'home area too long'; end if;
  if coalesce(array_length(p_activity_ids, 1), 0) > 32 then raise exception 'too many activities'; end if;

  update users set
    display_name = coalesce(nullif(p_display_name, ''), display_name),
    experience_level = coalesce(p_experience_level, experience_level),
    home_area = p_home_area,
    onboarding_completed = true
  where id = v_uid;

  delete from user_activities where user_id = v_uid;
  insert into user_activities (user_id, activity_id)
  select v_uid, unnest(p_activity_ids)
  on conflict do nothing;
end $$;

-- toggle_saved_companion: no self-saves.;

create or replace function set_my_availability(p_slots jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  delete from availability where user_id = v_uid;
  insert into availability (user_id, weekday, start_minute, end_minute)
  select v_uid,
         least(greatest((s->>'weekday')::int, 0), 6),
         greatest((s->>'start_minute')::int, 0),
         least((s->>'end_minute')::int, 1440)
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
  where (s->>'end_minute')::int > (s->>'start_minute')::int;
end;
$$;

create or replace function my_blocked_ids()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(blocked_id), '[]'::jsonb)
  from blocks
  where blocker_id = auth.uid();
$$;

create or replace function block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_user_id then raise exception 'cannot block yourself'; end if;
  insert into blocks (blocker_id, blocked_id)
  values (auth.uid(), p_user_id)
  on conflict do nothing;
end;
$$;
grant execute on function block_user(uuid) to authenticated;


grant execute on function unblock_user(uuid) to authenticated;


grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists get_companion(uuid);
create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;

create or replace function unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
$$;
grant execute on function unblock_user(uuid) to authenticated;


grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists get_companion(uuid);
create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;

create or replace function report_user(
  p_reported_id uuid,
  p_reason text,
  p_details text,
  p_booking_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into reports (reporter_id, reported_id, reason, details, booking_id)
  values (auth.uid(), p_reported_id, p_reason, nullif(p_details, ''), p_booking_id)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists get_companion(uuid);
create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;

create or replace function payment_review(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(b)
  from (
    select id, seeker_id, companion_id, offering_id, activity_slug, tier, status,
           scheduled_start, duration_min, location_name, agreed_price, is_free,
           seeker_name, companion_name, created_at
    from bookings
    where id = p_booking_id and seeker_id = auth.uid()
  ) b;
$$;

create or replace function payment_detail(p_payment_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'merchant_order_no', p.merchant_order_no,
    'provider_trade_no', p.provider_trade_no,
    'amount', p.amount,
    'currency', p.currency,
    'status', p.status,
    'provider_status', p.provider_status,
    'payment_method', p.payment_method,
    'payment_instructions', p.payment_instructions,
    'initiated_at', p.initiated_at,
    'returned_at', p.returned_at,
    'notified_at', p.notified_at,
    'paid_at', p.paid_at,
    'failed_at', p.failed_at,
    'expired_at', p.expired_at,
    'booking', jsonb_build_object(
      'id', b.id,
      'status', b.status,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name
    )
  )
  from payments p
  join bookings b on b.id = p.booking_id
  where p.id = p_payment_id and p.user_id = auth.uid();
$$;

create or replace function create_newebpay_payment_attempt(
  p_booking_id uuid,
  p_merchant_order_no text,
  p_amount int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  existing record;
  inserted payments%rowtype;
  fee record; -- CHANGED: holds compute_order_fee_split() output
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into b
  from bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'payment_booking_not_found'; end if;
  if b.seeker_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if b.is_free or b.agreed_price <= 0 then raise exception 'payment_invalid_amount'; end if;
  if b.agreed_price <> p_amount then raise exception 'payment_amount_mismatch'; end if;
  if b.status in ('cancelled', 'completed', 'expired', 'declined') then
    raise exception 'payment_booking_not_payable';
  end if;
  if exists (
    select 1 from payments
    where booking_id = p_booking_id and status = 'paid'
  ) then
    raise exception 'payment_already_paid';
  end if;

  select * into existing
  from payments
  where booking_id = p_booking_id
    and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at > now() - interval '30 minutes'
  order by created_at desc
  limit 1
  for update;

  if found then raise exception 'payment_attempt_in_progress'; end if;

  select * into fee from compute_order_fee_split(p_amount); -- CHANGED

  insert into payments (
    booking_id, user_id, provider, merchant_order_no, amount, currency, status,
    gross_amount, platform_fee_amount, trainer_payable -- CHANGED
  ) values (
    p_booking_id, v_uid, 'newebpay', p_merchant_order_no, p_amount, 'TWD', 'created',
    p_amount, fee.platform_fee_amount, fee.trainer_payable -- CHANGED
  )
  returning * into inserted;

  update bookings
  set status = 'payment_processing'
  where id = p_booking_id
    and status not in ('cancelled', 'completed', 'expired', 'declined');

  return jsonb_build_object(
    'id', inserted.id,
    'booking_id', inserted.booking_id,
    'merchant_order_no', inserted.merchant_order_no,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'status', inserted.status,
    'booking', jsonb_build_object(
      'id', b.id,
      'seeker_id', b.seeker_id,
      'companion_id', b.companion_id,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. 30-minute unpaid-order expiry (B-1), automated via pg_cron.
--
--    Why pg_cron and not Vercel Cron: confirmed via research (2026-09-15) that
--    pg_cron is available on Supabase's Free plan at no extra cost (just
--    `create extension`), while Vercel's Hobby-plan Cron Jobs are capped at
--    once per day â€” far too coarse for a 30-minute expiry window. Using
--    pg_cron also means the job runs next to the data with no network hop,
--    and needs no new deployment target.
--
--    Why a plain internal function, not a `SECURITY DEFINER` RPC granted to
--    `authenticated`: pg_cron jobs execute as the role that scheduled them
--    (the Postgres superuser/owner role), NOT as a request-scoped user, so
--    `auth.uid()` is NULL inside a cron-invoked function. This function must
--    never be reachable by a normal user session â€” it has no `grant execute`
--    to `anon`/`authenticated` at all, only pg_cron (running as the table
--    owner) can call it.
--
--    What "release the slot" means here: there is no separate time-slot
--    table in this schema (see docs/phase2-work-tracker.md Decisions log).
--    `create_booking` blocks a new booking only if an existing booking with
--    that companion is still in an "open" status. Moving the stale booking to
--    'expired' removes it from that check, which is the entire "release."
-- ---------------------------------------------------------------------------;

create or replace function mark_newebpay_payment_redirected(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
  set status = 'redirected'
  where id = p_payment_id
    and user_id = auth.uid()
    and status = 'created';

  if not found then raise exception 'payment_redirect_not_allowed'; end if;
end $$;

create or replace function observe_newebpay_return(
  p_merchant_order_no text,
  p_provider_trade_no text,
  p_provider_status text,
  p_payment_method text,
  p_response_code text,
  p_response_message text,
  p_instructions jsonb,
  p_observed_status payment_status
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments%rowtype;
begin
  select * into p
  from payments
  where merchant_order_no = p_merchant_order_no
  for update;

  if not found then raise exception 'payment_order_not_found'; end if;

  update payments
  set returned_at = coalesce(returned_at, now()),
      provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
      provider_status = coalesce(nullif(p_provider_status, ''), provider_status),
      payment_method = coalesce(nullif(p_payment_method, ''), payment_method),
      response_code = coalesce(nullif(p_response_code, ''), response_code),
      response_message = left(coalesce(nullif(p_response_message, ''), response_message, ''), 200),
      payment_instructions = case when p_instructions = '{}'::jsonb then payment_instructions else p_instructions end,
      status = case
        when status = 'paid' then status
        when p_observed_status in ('failed', 'cancelled', 'expired') then p_observed_status
        when p_observed_status = 'awaiting_payment' then 'awaiting_payment'
        else 'processing'
      end,
      failed_at = case when p_observed_status in ('failed', 'cancelled') then coalesce(failed_at, now()) else failed_at end,
      expired_at = case when p_observed_status = 'expired' then coalesce(expired_at, now()) else expired_at end
  where id = p.id;

  update bookings
  set status = case
    when status in ('cancelled', 'completed') then status
    when p_observed_status in ('failed', 'cancelled', 'expired') then 'pending_payment'
    else 'payment_processing'
  end
  where id = p.booking_id;

  return p.id;
end $$;

create or replace function apply_newebpay_notification(
  p_merchant_order_no text,
  p_amount int,
  p_provider_trade_no text,
  p_provider_status text,
  p_payment_method text,
  p_response_code text,
  p_response_message text,
  p_instructions jsonb,
  p_next_status payment_status
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments%rowtype;
  b bookings%rowtype;
  v_needs_refund boolean := false;
begin
  -- Booking first, then its payments. cancel_booking uses the same order.
  select bk.* into b
  from bookings bk
  join payments pay on pay.booking_id = bk.id
  where pay.merchant_order_no = p_merchant_order_no
  for update of bk;

  if not found then raise exception 'payment_order_not_found'; end if;

  select * into p
  from payments
  where merchant_order_no = p_merchant_order_no
  for update;

  if not found then raise exception 'payment_order_not_found'; end if;
  if p.amount <> p_amount then raise exception 'payment_amount_mismatch'; end if;

  if p.status = 'paid' then
    update payments
    set notified_at = coalesce(notified_at, now()),
        provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
        provider_status = coalesce(nullif(p_provider_status, ''), provider_status)
    where id = p.id;
    return p.id;
  end if;

  perform 1
  from payments
  where booking_id = b.id
    and id <> p.id
  order by id
  for update;

  v_needs_refund := p_next_status = 'paid' and (
    b.status in ('cancelled', 'declined')
    or exists (
      select 1 from payments other
      where other.booking_id = b.id
        and other.id <> p.id
        and other.status = 'paid'
        and other.refund_status = 'none'
    )
  );

  update payments
  set notified_at = coalesce(notified_at, now()),
      provider_trade_no = coalesce(provider_trade_no, nullif(p_provider_trade_no, '')),
      provider_status = coalesce(nullif(p_provider_status, ''), provider_status),
      payment_method = coalesce(nullif(p_payment_method, ''), payment_method),
      response_code = coalesce(nullif(p_response_code, ''), response_code),
      response_message = left(coalesce(nullif(p_response_message, ''), response_message, ''), 200),
      payment_instructions = case when p_instructions = '{}'::jsonb then payment_instructions else p_instructions end,
      status = p_next_status,
      refund_status = case when v_needs_refund then 'refund_requested' else refund_status end,
      settlement_eligibility_status = case
        when v_needs_refund then 'ineligible'
        else settlement_eligibility_status
      end,
      paid_at = case when p_next_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      failed_at = case when p_next_status in ('failed', 'cancelled') then coalesce(failed_at, now()) else failed_at end,
      expired_at = case when p_next_status = 'expired' then coalesce(expired_at, now()) else expired_at end
  where id = p.id;

  if v_needs_refund then
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, actor_id)
    values (
      p.id,
      case
        when b.status in ('cancelled', 'declined') then 'late_payment_on_closed_booking'
        else 'duplicate_paid_attempt'
      end,
      'none',
      'refund_requested',
      null
    );
  end if;

  update bookings
  set status = case
    when status in ('cancelled', 'completed', 'declined') then status
    when v_needs_refund then status
    when p_next_status = 'paid' then 'accepted'
    when p_next_status in ('failed', 'cancelled', 'expired') then 'pending_payment'
    else 'payment_processing'
  end
  where id = p.booking_id;

  return p.id;
end $$;

create or replace function ensure_user_profile_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, photo_url)
  select
    au.id,
    left(
      coalesce(
        au.raw_user_meta_data ->> 'full_name',
        au.raw_user_meta_data ->> 'name',
        split_part(au.email, '@', 1),
        'User'
      ),
      80
    ),
    au.raw_user_meta_data ->> 'avatar_url'
  from auth.users au
  where au.id = p_user_id
  on conflict (id) do nothing;
end $$;

create or replace function admin_export_users()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select u.created_at, u.id, jsonb_build_object(
      'id', u.id,
      'display_name', u.display_name,
      'home_area', u.home_area,
      'experience_level', u.experience_level,
      'is_companion', u.is_companion,
      'is_admin', u.is_admin,
      'created_at', u.created_at
    ) as obj
    from users u
  ) s;
  return v;
end $$;

-- Trainers export: listed companions only (has an active companion_listing),
-- with their headline tier / price and rating. Email excluded (PII).;

create or replace function admin_export_trainers()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select p.created_at, p.id, jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'home_area', p.home_area,
      'experience_level', p.experience_level,
      'tier', h.tier,
      'price_ntd', h.price_ntd,
      'is_free', h.is_free,
      'rating_avg', coalesce(l.rating_avg, 0),
      'rating_count', coalesce(l.rating_count, 0),
      'is_companion', p.is_companion,
      'created_at', p.created_at
    ) as obj
    from users p
    join companion_listings l on l.user_id = p.id and l.status = 'active'
    left join lateral (
      select o.tier, o.price_ntd, o.is_free
      from listing_offerings o
      where o.listing_id = l.id
      order by o.tier asc, o.price_ntd desc
      limit 1
    ) h on true
  ) s;
  return v;
end $$;

-- Orders / bookings export with fee split + settlement / refund statuses.
-- payments.user_id is the seeker; the trainer is bookings.companion_id.;

create or replace function admin_export_orders()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at asc, s.id), '[]'::jsonb) into v
  from (
    select pay.created_at, pay.id, jsonb_build_object(
      'booking_id', b.id,
      'seeker_id', b.seeker_id,
      'seeker_name', b.seeker_name,
      'companion_id', b.companion_id,
      'companion_name', b.companion_name,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'location_name', b.location_name,
      'agreed_price', b.agreed_price,
      'is_free', b.is_free,
      'payment_id', pay.id,
      'merchant_order_no', pay.merchant_order_no,
      'provider_trade_no', pay.provider_trade_no,
      'provider', pay.provider,
      'provider_type', pay.provider,
      'gross_amount', pay.gross_amount,
      'platform_fee_rate', pay.platform_fee_rate,
      'platform_fee_amount', pay.platform_fee_amount,
      'processing_fee_rate', pay.processing_fee_rate,
      'processing_fee_amount', pay.processing_fee_amount,
      'trainer_payable', pay.trainer_payable,
      'payment_status', pay.status,
      'refund_status', pay.refund_status,
      'service_completed_at', pay.service_completed_at,
      'settlement_hold_until', pay.settlement_hold_until,
      'settlement_eligibility_status', pay.settlement_eligibility_status,
      'settlement_status', pay.settlement_status,
      'paid_at', pay.paid_at,
      'failed_at', pay.failed_at,
      'expired_at', pay.expired_at,
      'created_at', pay.created_at
    ) as obj
    from payments pay
    join bookings b on b.id = pay.booking_id
  ) s;
  return v;
end $$;

-- Withdrawal requests export (masked bank only).;

-- Withdrawal requests export (masked bank only).
create or replace function admin_export_withdrawals()
returns jsonb
language plpgsql
security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.requested_at asc, s.id), '[]'::jsonb) into v
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'trainer_id', w.trainer_id,
      'trainer_name', t.display_name,
      'amount', w.amount,
      'bank_account_mask', w.bank_account_mask,
      'status', w.status,
      'reason_note', w.reason_note,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at,
      'settled_at', w.settled_at
    ) as obj
    from withdrawal_requests w
    join users t on t.id = w.trainer_id
  ) s;
  return v;
end $$;

grant execute on function admin_export_users() to authenticated;
grant execute on function admin_export_trainers() to authenticated;
grant execute on function admin_export_orders() to authenticated;
grant execute on function admin_export_withdrawals() to authenticated;

-- Records one accept. `p_version_label` comes from the client's
-- CONSENT_VERSIONS constant (apps/web/src/lib/consent.ts) â€” trusted because
-- worst case a stale/wrong label just mis-records *which* version text the
-- user saw, it can't grant access to anything, so this doesn't need a
-- server-side lookup table to validate against (there isn't one; see the
-- decision above on why the text itself isn't in the database).
create or replace function accept_consent(
  p_document_slug consent_document_slug,
  p_version_label text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into consent_records (user_id, document_slug, version_label)
  values (auth.uid(), p_document_slug, p_version_label)
  on conflict (user_id, document_slug, version_label) do nothing;
end $$;

grant execute on function accept_consent(consent_document_slug, text) to authenticated;

-- ---------------------------------------------------------------------------
-

create or replace function compute_order_fee_split(
  p_gross_amount int,
  p_platform_fee_rate numeric default 0.05  -- named constant, not a magic number
) returns table (platform_fee_amount int, trainer_payable int)
language sql
immutable
set search_path = public
as $$
  select
    round(p_gross_amount * p_platform_fee_rate)::int as platform_fee_amount,
    p_gross_amount - round(p_gross_amount * p_platform_fee_rate)::int as trainer_payable;
$$;

create or replace function expire_stale_payment_attempts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Payments left in a non-terminal state past the 30-minute window
  -- (`create_newebpay_payment_attempt` already uses the same 30-minute
  -- constant for its in-progress lockout check, so this reuses that number
  -- rather than inventing a second one).
  update payments
  set status = 'expired',
      expired_at = coalesce(expired_at, now())
  where status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at <= now() - interval '30 minutes';

  -- Release the paired booking (see comment block above) â€” only bookings
  -- still sitting in a pre-payment/processing state; never touch a booking
  -- that already succeeded, was cancelled, or completed through another path.
  update bookings b
  set status = 'expired'
  from payments p
  where p.booking_id = b.id
    and p.status = 'expired'
    and p.expired_at >= now() - interval '1 minute' -- only rows this run just touched
    and b.status in ('pending_payment', 'payment_processing');
end $$;

comment on function expire_stale_payment_attempts() is
  'Called only by pg_cron (see cron.schedule below). Not granted to anon/authenticated â€” auth.uid() is NULL in a cron context, so this must stay unreachable from a user session.';

-- Every 5 minutes: frequent enough that a 30-minute window is enforced within
-- a tight margin, infrequent enough to be a trivial load on a free-tier DB.
-- `cron.schedule()` upserts by job name (confirmed against Supabase's docs,
-- 2026-09-15: calling it again with the same name replaces the existing job
-- rather than erroring or duplicating it), so this is safe to re-run as-is â€”
-- no existence check needed.
select cron.schedule(
  'expire-stale-payment-attempts',
  '*/5 * * * *',
  $$select expire_stale_payment_attempts()$$
);

create or replace function mark_service_completed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select pay.id
    from payments pay
    join bookings b on b.id = pay.booking_id
    where pay.status = 'paid'
      and pay.service_completed_at is null
      and b.scheduled_start is not null
      and b.scheduled_start + make_interval(mins => b.duration_min) <= now()
    order by pay.id
    for update of pay skip locked
  loop
    update payments
    set service_completed_at = now(),
        settlement_hold_until = now() + interval '24 hours'
    where id = r.id
      and service_completed_at is null;
    if not found then continue; end if;

    insert into payment_status_events (payment_id, event_type, to_value, actor_id)
    values (r.id, 'service_completed_auto', now()::text, null);
  end loop;
end $$;

create or replace function admin_correct_service_completed(
  p_payment_id uuid,
  p_completed boolean,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reason_required';
  end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if p_completed then
    if pay.service_completed_at is not null then
      raise exception 'already_service_completed';
    end if;
    update payments
    set service_completed_at = now(),
        settlement_hold_until = now() + interval '24 hours'
    where id = p_payment_id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'service_completed_admin_correction', 'null', now()::text, p_reason, v_uid);
  else
    if pay.settlement_status = 'paid' then
      raise exception 'cannot_revert_settled_payment';
    end if;
    update payments
    set service_completed_at = null,
        settlement_hold_until = null,
        settlement_eligibility_status = 'ineligible'
    where id = p_payment_id;
    insert into payment_status_events
      (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'service_completed_admin_reverted', pay.service_completed_at::text, 'null', p_reason, v_uid);
  end if;
end $$;

create or replace function evaluate_settlement_eligibility()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Grant eligibility: hold has passed, paid, not cancelled/refunded, no hold.
  update payments
  set settlement_eligibility_status = 'eligible'
  where settlement_eligibility_status = 'ineligible'
    and settlement_status = 'unsettled'
    and status = 'paid'
    and refund_status = 'none'
    and admin_hold = false
    and service_completed_at is not null
    and settlement_hold_until is not null
    and settlement_hold_until <= now();

  -- Revoke eligibility: something changed after the row was already marked
  -- eligible but before it was settled (refund/hold applied out of band).
  update payments
  set settlement_eligibility_status = 'ineligible'
  where settlement_eligibility_status = 'eligible'
    and settlement_status = 'unsettled'
    and (status <> 'paid' or refund_status <> 'none' or admin_hold = true);
end $$;

create or replace function run_settlement_cycle()
returns void
language sql
security definer
set search_path = public
as $$
  select mark_service_completed();
  select evaluate_settlement_eligibility();
$$;

select cron.schedule(
  'run-settlement-cycle',
  '*/15 * * * *',
  $$select run_settlement_cycle()$$
);

-- ---------------------------------------------------------------------------
-- 6. Admin hold (dispute flag). Setting it revokes eligibility immediately
--    if the row was already eligible-unsettled; clearing it re-checks the
--    same row inline instead of waiting for the next cron tick.
-- ---------------------------------------------------------------------------;

create or replace function admin_set_payment_hold(
  p_payment_id uuid,
  p_hold boolean,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reason_required';
  end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.settlement_status = 'paid' and p_hold then
    raise exception 'cannot_hold_settled_payment';
  end if;

  update payments
  set admin_hold = p_hold,
      admin_hold_reason = p_reason,
      admin_hold_by = v_uid,
      admin_hold_at = now(),
      settlement_eligibility_status = case
        when p_hold then 'ineligible'
        else settlement_eligibility_status
      end
  where id = p_payment_id;

  insert into payment_status_events
    (payment_id, event_type, from_value, to_value, reason_note, actor_id)
  values (
    p_payment_id,
    case when p_hold then 'admin_hold_set' else 'admin_hold_cleared' end,
    pay.admin_hold::text, p_hold::text, p_reason, v_uid
  );

  if not p_hold then
    -- Re-check this single row now rather than waiting up to 15 minutes.
    update payments
    set settlement_eligibility_status = 'eligible'
    where id = p_payment_id
      and settlement_eligibility_status = 'ineligible'
      and settlement_status = 'unsettled'
      and status = 'paid'
      and refund_status = 'none'
      and admin_hold = false
      and service_completed_at is not null
      and settlement_hold_until is not null
      and settlement_hold_until <= now();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Trainer available balance = sum of eligible, unsettled orders.
-- ---------------------------------------------------------------------------

create or replace function trainer_balance(p_trainer_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(pay.trainer_payable), 0)::int
  from payments pay
  join bookings b on b.id = pay.booking_id
  where b.companion_id = p_trainer_id
    and pay.settlement_eligibility_status = 'eligible'
    and pay.settlement_status = 'unsettled';
$$;

-- Eligible unsettled earnings, less withdrawals still requested or processing.
create or replace function trainer_available_balance(p_trainer_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select greatest(
    trainer_balance(p_trainer_id) - coalesce((
      select sum(w.amount)
      from withdrawal_requests w
      where w.trainer_id = p_trainer_id
        and w.status in ('requested', 'processing')
    ), 0),
    0
  )::int;
$$;

revoke all on function trainer_available_balance(uuid) from public, anon, authenticated;

-- The balance shown in the app is what can actually be withdrawn.
create or replace function my_trainer_balance()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select trainer_available_balance(auth.uid());
$$;
grant execute on function my_trainer_balance() to authenticated;

create or replace function request_withdrawal(p_amount int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_available int;
  v_mask text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'withdrawal_unauthenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;

  -- Serialise this trainer's requests against each other.
  select bank_account_mask into v_mask from users where id = v_uid for update;
  if not found then raise exception 'withdrawal_unauthenticated'; end if;

  v_available := trainer_available_balance(v_uid);
  if p_amount > v_available then raise exception 'insufficient_balance'; end if;

  if v_mask is null then raise exception 'bank_details_missing'; end if;

  insert into withdrawal_requests (trainer_id, amount, bank_account_mask, status)
  values (v_uid, p_amount, v_mask, 'requested')
  returning id into v_id;

  insert into withdrawal_status_events (withdrawal_request_id, from_status, to_status, actor_id)
  values (v_id, null, 'requested', v_uid);

  return v_id;
end $$;

create or replace function admin_set_payment_status(
  p_payment_id uuid,
  p_action text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('cancel', 'refund_requested', 'refunded') then
    raise exception 'invalid_action';
  end if;
  if p_reason is null or trim(p_reason) = '' then raise exception 'reason_required'; end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.settlement_status = 'paid' then
    raise exception 'cannot_modify_settled_payment';
  end if;

  if p_action = 'cancel' then
    update payments set status = 'cancelled' where id = p_payment_id;
    insert into payment_status_events (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'admin_cancelled', pay.status::text, 'cancelled', p_reason, v_uid);
  else
    update payments set refund_status = p_action::payment_refund_status where id = p_payment_id;
    insert into payment_status_events (payment_id, event_type, from_value, to_value, reason_note, actor_id)
    values (p_payment_id, 'admin_refund_status_changed', pay.refund_status::text, p_action, p_reason, v_uid);
  end if;

  -- Immediate downgrade if this row was already eligible-unsettled; the
  -- run_settlement_cycle cron would also catch it, but no reason to wait.
  update payments
  set settlement_eligibility_status = 'ineligible'
  where id = p_payment_id
    and settlement_eligibility_status = 'eligible'
    and settlement_status = 'unsettled';
end $$;

create or replace function trainer_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then raise exception 'trainer_orders_unauthenticated'; end if;
  select coalesce(jsonb_agg(s.obj order by s.created_at desc, s.id), '[]'::jsonb) into v
  from (
    select pay.created_at, pay.id, jsonb_build_object(
      'payment_id', pay.id,
      'booking_id', b.id,
      'seeker_name', b.seeker_name,
      'activity_slug', b.activity_slug,
      'tier', b.tier,
      'scheduled_start', b.scheduled_start,
      'duration_min', b.duration_min,
      'trainer_payable', pay.trainer_payable,
      'payment_status', pay.status,
      'refund_status', pay.refund_status,
      'service_completed_at', pay.service_completed_at,
      'settlement_eligibility_status', pay.settlement_eligibility_status,
      'settlement_status', pay.settlement_status,
      'created_at', pay.created_at
    ) as obj
    from payments pay
    join bookings b on b.id = pay.booking_id
    where b.companion_id = v_uid
  ) s;
  return v;
end $$;

create or replace function my_withdrawal_requests()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then raise exception 'withdrawals_unauthenticated'; end if;
  select coalesce(jsonb_agg(s.obj order by s.requested_at desc, s.id), '[]'::jsonb) into v
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'amount', w.amount,
      'status', w.status,
      'bank_account_mask', w.bank_account_mask,
      'reason_note', w.reason_note,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at,
      'settled_at', w.settled_at
    ) as obj
    from withdrawal_requests w
    where w.trainer_id = v_uid
  ) s;
  return v;
end $$;

create or replace function apply_withdrawal_settlement(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w withdrawal_requests%rowtype;
  v_trainer_id uuid;
  remaining int;
  r record;
begin
  select * into w from withdrawal_requests where id = p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  v_trainer_id := w.trainer_id;
  remaining := w.amount;

  for r in
    select pay.id, pay.trainer_payable
    from payments pay
    join bookings b on b.id = pay.booking_id
    where b.companion_id = v_trainer_id
      and pay.settlement_eligibility_status = 'eligible'
      and pay.settlement_status = 'unsettled'
    order by pay.service_completed_at asc, pay.id
    for update of pay
  loop
    exit when remaining <= 0;
    update payments
    set settlement_status = 'paid', settled_at = now()
    where id = r.id;
    insert into withdrawal_settlements (withdrawal_request_id, payment_id, amount_applied)
    values (p_withdrawal_id, r.id, r.trainer_payable);
    remaining := remaining - r.trainer_payable;
  end loop;

  update withdrawal_requests set settled_at = now() where id = p_withdrawal_id;
end $$;

create or replace function undo_withdrawal_settlement(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
  set settlement_status = 'unsettled', settled_at = null
  where id in (
    select payment_id from withdrawal_settlements where withdrawal_request_id = p_withdrawal_id
  );
  delete from withdrawal_settlements where withdrawal_request_id = p_withdrawal_id;
  update withdrawal_requests set settled_at = null where id = p_withdrawal_id;
end $$;

-- ---------------------------------------------------------------------------
-- 6. B-7 Â· Admin payout list (filterable, with header totals).
-- ---------------------------------------------------------------------------;

create or replace function admin_list_withdrawal_requests(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_rows jsonb;
  v_totals jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status is not null and p_status not in
     ('requested', 'processing', 'paid', 'rejected', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select coalesce(jsonb_agg(s.obj order by s.requested_at desc, s.id), '[]'::jsonb) into v_rows
  from (
    select w.requested_at, w.id, jsonb_build_object(
      'id', w.id,
      'trainer_id', w.trainer_id,
      'trainer_name', t.display_name,
      'amount', w.amount,
      'bank_account_mask', w.bank_account_mask,
      'status', w.status,
      'requested_at', w.requested_at,
      'updated_at', w.updated_at
    ) as obj
    from withdrawal_requests w
    join users t on t.id = w.trainer_id
    where p_status is null or w.status = p_status
  ) s;

  select jsonb_build_object(
    'requested_count', count(*) filter (where status = 'requested'),
    'requested_sum', coalesce(sum(amount) filter (where status = 'requested'), 0),
    'processing_count', count(*) filter (where status = 'processing'),
    'processing_sum', coalesce(sum(amount) filter (where status = 'processing'), 0)
  ) into v_totals
  from withdrawal_requests;

  return jsonb_build_object('rows', v_rows, 'totals', v_totals);
end $$;

create or replace function admin_withdrawal_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v jsonb;
  v_history jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'id', w.id,
    'trainer_id', w.trainer_id,
    'trainer_name', t.display_name,
    'amount', w.amount,
    'status', w.status,
    'reason_note', w.reason_note,
    'requested_at', w.requested_at,
    'updated_at', w.updated_at,
    'settled_at', w.settled_at,
    'bank_code', t.bank_code,
    'bank_name', t.bank_name,
    'branch_name', t.branch_name,
    'bank_account_number', t.bank_account_number,
    'bank_account_holder', t.bank_account_holder
  ) into v
  from withdrawal_requests w
  join users t on t.id = w.trainer_id
  where w.id = p_id;

  if v is null then raise exception 'withdrawal_not_found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'from_status', e.from_status,
    'to_status', e.to_status,
    'reason_note', e.reason_note,
    'actor_id', e.actor_id,
    'actor_name', a.display_name,
    'created_at', e.created_at
  ) order by e.created_at asc), '[]'::jsonb) into v_history
  from withdrawal_status_events e
  left join users a on a.id = e.actor_id
  where e.withdrawal_request_id = p_id;

  return v || jsonb_build_object('history', v_history);
end $$;

-- ---------------------------------------------------------------------------
-- 8. B-8 Â· Status workflow + corrections. Forward steps (requested->
--    processing, processing->paid) don't require a reason; every other
--    transition (rejected/cancelled, or any backward "undo") does.
-- ---------------------------------------------------------------------------

create or replace function admin_set_withdrawal_status(
  p_id uuid,
  p_status text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  w withdrawal_requests%rowtype;
  v_forward boolean;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('requested', 'processing', 'paid', 'rejected', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select * into w from withdrawal_requests where id = p_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if w.status = p_status then raise exception 'no_change'; end if;

  v_forward :=
    (w.status = 'requested' and p_status = 'processing') or
    (w.status = 'processing' and p_status = 'paid');

  if not v_forward and (p_reason is null or trim(p_reason) = '') then
    raise exception 'reason_required';
  end if;

  -- Reversing away from 'paid' un-settles the specific orders this
  -- withdrawal covered (see assumption note at top of file).
  if w.status = 'paid' and p_status <> 'paid' then
    perform undo_withdrawal_settlement(p_id);
  end if;

  update withdrawal_requests
  set status = p_status,
      reason_note = case when p_reason is not null and trim(p_reason) <> ''
                          then p_reason else reason_note end
  where id = p_id;

  insert into withdrawal_status_events (withdrawal_request_id, from_status, to_status, reason_note, actor_id)
  values (p_id, w.status, p_status, p_reason, v_uid);

  if p_status = 'paid' then
    perform apply_withdrawal_settlement(p_id);
  end if;
end $$;
grant execute on function admin_set_withdrawal_status(uuid, text, text) to authenticated;

create or replace function create_simulated_payment_attempt(
  p_booking_id uuid,
  p_merchant_order_no text,
  p_amount int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  existing record;
  inserted payments%rowtype;
  fee record;
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'payment_booking_not_found'; end if;
  if b.seeker_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if b.is_free or b.agreed_price <= 0 then raise exception 'payment_invalid_amount'; end if;
  if b.agreed_price <> p_amount then raise exception 'payment_amount_mismatch'; end if;
  if b.status in ('cancelled', 'completed', 'expired', 'declined') then
    raise exception 'payment_booking_not_payable';
  end if;
  if exists (select 1 from payments where booking_id = p_booking_id and status = 'paid') then
    raise exception 'payment_already_paid';
  end if;

  select * into existing
  from payments
  where booking_id = p_booking_id
    and status in ('created', 'redirected', 'processing', 'awaiting_payment')
    and created_at > now() - interval '30 minutes'
  order by created_at desc limit 1 for update;
  if found then raise exception 'payment_attempt_in_progress'; end if;

  select * into fee from compute_order_fee_split(p_amount);

  insert into payments (
    booking_id, user_id, provider, merchant_order_no, amount, currency, status,
    gross_amount, platform_fee_amount, trainer_payable,
    processing_fee_rate, processing_fee_amount
  ) values (
    p_booking_id, v_uid, 'simulated', p_merchant_order_no, p_amount, 'TWD', 'created',
    p_amount, fee.platform_fee_amount, fee.trainer_payable,
    0, 0
  )
  returning * into inserted;

  update bookings
  set status = 'payment_processing'
  where id = p_booking_id and status not in ('cancelled', 'completed', 'expired', 'declined');

  return jsonb_build_object(
    'id', inserted.id,
    'booking_id', inserted.booking_id,
    'merchant_order_no', inserted.merchant_order_no,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'status', inserted.status
  );
end $$;

create or replace function confirm_simulated_payment(
  p_payment_id uuid,
  p_approve boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pay payments%rowtype;
begin
  if v_uid is null then raise exception 'payment_unauthenticated'; end if;

  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'payment_order_not_found'; end if;
  if pay.user_id <> v_uid then raise exception 'payment_booking_not_owned'; end if;
  if pay.provider <> 'simulated' then raise exception 'payment_not_simulated'; end if;
  if pay.status not in ('created', 'redirected', 'processing') then
    raise exception 'payment_not_pending';
  end if;

  perform apply_newebpay_notification(
    pay.merchant_order_no,
    pay.amount,
    'SIM-' || left(pay.id::text, 8),
    case when p_approve then 'SUCCESS' else 'DECLINED' end,
    'SIMULATED',
    case when p_approve then '0000' else 'SIM_DECLINE' end,
    case when p_approve then 'Simulated approval (Phase 1 test payment)'
         else 'Simulated decline (Phase 1 test payment)' end,
    '{}'::jsonb,
    case when p_approve then 'paid'::payment_status else 'failed'::payment_status end
  );
end $$;
grant execute on function confirm_simulated_payment(uuid, boolean) to authenticated;

-- The simulated review/result screens reuse the existing payment_detail()
-- RPC (0033) â€” already owner-gated (p.user_id = auth.uid()) and already
-- returns everything the UI needs (status, amount, booking). No new getter
-- needed; payment_detail's `booking` join doesn't reference "newebpay"
-- either, so it's already provider-agnostic.;

-- A JSON field that must be absent/null or a number inside [lo, hi].
create or replace function assert_json_number_in_range(
  p_doc jsonb, p_key text, p_lo numeric, p_hi numeric
) returns void
language plpgsql immutable set search_path = public as $$
declare v jsonb := p_doc -> p_key;
begin
  if v is null or jsonb_typeof(v) = 'null' then return; end if;
  if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < p_lo or (v #>> '{}')::numeric > p_hi then
    raise exception 'invalid % (expected a number between % and %)', p_key, p_lo, p_hi
      using errcode = '22023';
  end if;
end $$;

create or replace function validate_fitness_profile(
  p_about_you jsonb,
  p_training_preferences jsonb,
  p_gym_equipment jsonb,
  p_nutrition jsonb
) returns void
language plpgsql immutable set search_path = public as $$
declare
  v_doc jsonb;
begin
  foreach v_doc in array array[p_about_you, p_training_preferences, p_gym_equipment, p_nutrition] loop
    if v_doc is not null and jsonb_typeof(v_doc) <> 'object' then
      raise exception 'invalid profile data' using errcode = '22023';
    end if;
    if v_doc is not null and octet_length(v_doc::text) > 20000 then
      raise exception 'profile data too large' using errcode = '22023';
    end if;
  end loop;

  if p_about_you is not null then
    perform assert_json_number_in_range(p_about_you, 'age', 13, 100);
    perform assert_json_number_in_range(p_about_you, 'heightCm', 90, 275);
    perform assert_json_number_in_range(p_about_you, 'weightKg', 25, 250);
  end if;

  if p_training_preferences is not null then
    perform assert_json_number_in_range(p_training_preferences, 'durationMin', 15, 90);
    perform assert_json_number_in_range(p_training_preferences, 'restTimerMinSec', 10, 300);
    perform assert_json_number_in_range(p_training_preferences, 'restTimerMaxSec', 10, 300);
  end if;

  if p_nutrition is not null then
    perform assert_json_number_in_range(p_nutrition, 'bmrKcal', 300, 6000);
    perform assert_json_number_in_range(p_nutrition, 'maintenanceKcal', 300, 12000);
    perform assert_json_number_in_range(p_nutrition, 'dailyCalories', 300, 12000);
    perform assert_json_number_in_range(p_nutrition, 'proteinGrams', 10, 800);
    perform assert_json_number_in_range(p_nutrition, 'proteinGPerKg', 0.5, 4);
  end if;
end $$;

revoke all on function assert_json_number_in_range(jsonb, text, numeric, numeric) from public, anon, authenticated;
revoke all on function validate_fitness_profile(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;

create or replace function save_onboarding_answers(
  p_goal text,
  p_gym_type text,
  p_about_you jsonb,
  p_training_preferences jsonb,
  p_gym_equipment jsonb,
  p_nutrition jsonb default null,
  p_nutrition_status text default null
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_updated_at timestamptz;
  v_gender text := p_about_you ->> 'gender';
  v_experience text := p_training_preferences ->> 'experience';
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_nutrition is not null and jsonb_typeof(p_nutrition) <> 'object' then
    raise exception 'invalid nutrition';
  end if;
  if p_nutrition_status is not null and p_nutrition_status not in ('built', 'skipped') then
    raise exception 'invalid nutrition status';
  end if;
  perform validate_fitness_profile(p_about_you, p_training_preferences, p_gym_equipment, p_nutrition);

  insert into user_onboarding (
    user_id, goal, gym_type, about_you, training_preferences, gym_equipment,
    nutrition, nutrition_status
  )
  values (
    auth.uid(), p_goal, p_gym_type, coalesce(p_about_you, '{}'::jsonb),
    coalesce(p_training_preferences, '{}'::jsonb), coalesce(p_gym_equipment, '{}'::jsonb),
    case when p_nutrition_status = 'built' then p_nutrition end,
    p_nutrition_status
  )
  on conflict (user_id) do update set
    goal = excluded.goal,
    gym_type = excluded.gym_type,
    about_you = jsonb_strip_nulls(
      jsonb_build_object('primaryActivity', user_onboarding.about_you -> 'primaryActivity')
    ) || excluded.about_you,
    training_preferences = excluded.training_preferences,
    gym_equipment = excluded.gym_equipment,
    nutrition_status = coalesce(p_nutrition_status, user_onboarding.nutrition_status),
    nutrition = case
      when coalesce(p_nutrition_status, user_onboarding.nutrition_status) = 'built' then p_nutrition
      else user_onboarding.nutrition
    end
  returning updated_at into v_updated_at;

  if v_gender in ('male', 'female') then
    update users set gender = v_gender
    where id = auth.uid() and (gender is null or gender in ('male', 'female'))
      and gender is distinct from v_gender;
  end if;

  if v_experience in ('no_experience', 'beginner', 'intermediate', 'advanced') then
    update users set
      experience_level = (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level
    where id = auth.uid()
      and experience_level is distinct from
        (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level;
  end if;

  return v_updated_at;
end $$;

create or replace function skip_nutrition_plan() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  insert into user_onboarding (user_id, nutrition_status)
  values (auth.uid(), 'skipped')
  on conflict (user_id) do update set
    nutrition_status = coalesce(user_onboarding.nutrition_status, 'skipped');
end $$;

create or replace function save_training_plan(
  p_label text,
  p_plan jsonb,
  p_onboarding_snapshot jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_label, '')) = 0 or char_length(p_label) > 120 then
    raise exception 'invalid label';
  end if;
  if p_plan is null then raise exception 'missing plan'; end if;
  if octet_length(p_plan::text) > 262144
     or octet_length(coalesce(p_onboarding_snapshot, '{}'::jsonb)::text) > 262144 then
    raise exception 'plan too large';
  end if;

  perform 1 from users where id = auth.uid() for update;
  if (select count(*) from user_training_plans where user_id = auth.uid()) >= 100 then
    raise exception 'too many plans';
  end if;

  insert into user_training_plans (user_id, label, plan, onboarding_snapshot, goal)
  values (
    auth.uid(), p_label, p_plan, coalesce(p_onboarding_snapshot, '{}'::jsonb),
    p_onboarding_snapshot -> 'answers' ->> 'goal'
  )
  returning id into v_id;

  insert into user_onboarding (user_id, active_plan_id)
  values (auth.uid(), v_id)
  on conflict (user_id) do update set active_plan_id = excluded.active_plan_id;

  return v_id;
end $$;


revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;
grant execute on function my_training_plans() to authenticated;
grant execute on function training_plan_detail(uuid) to authenticated;
grant execute on function delete_training_plan(uuid) to authenticated;

create or replace function my_training_plans()
returns table (id uuid, label text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id, p.label, p.created_at
  from user_training_plans p
  where p.user_id = auth.uid()
  order by p.created_at desc;
$$;


revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;
grant execute on function my_training_plans() to authenticated;
grant execute on function training_plan_detail(uuid) to authenticated;
grant execute on function delete_training_plan(uuid) to authenticated;

create or replace function training_plan_detail(p_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  select p.plan from user_training_plans p
  where p.id = p_id and p.user_id = auth.uid();
$$;


revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;
grant execute on function my_training_plans() to authenticated;
grant execute on function training_plan_detail(uuid) to authenticated;
grant execute on function delete_training_plan(uuid) to authenticated;

create or replace function delete_training_plan(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from user_training_plans where id = p_id and user_id = auth.uid();
  if not found then raise exception 'plan not found'; end if;
end $$;

revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;
grant execute on function my_training_plans() to authenticated;
grant execute on function training_plan_detail(uuid) to authenticated;
grant execute on function delete_training_plan(uuid) to authenticated;

-- "Update Preferences" on a saved plan needs to edit that plan in place
-- (not just insert a new one or delete it) â€” add the missing RPC, following
-- the same SECURITY DEFINER + explicit-grant pattern as 0045_ai_plan_rpcs.sql.

create or replace function update_training_plan(
  p_id uuid,
  p_label text,
  p_plan jsonb,
  p_onboarding_snapshot jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_label, '')) = 0 or char_length(p_label) > 120 then
    raise exception 'invalid label';
  end if;
  if p_plan is null then raise exception 'missing plan'; end if;
  if octet_length(p_plan::text) > 262144
     or octet_length(coalesce(p_onboarding_snapshot, '{}'::jsonb)::text) > 262144 then
    raise exception 'plan too large';
  end if;

  update user_training_plans set
    label = p_label,
    plan = p_plan,
    onboarding_snapshot = coalesce(p_onboarding_snapshot, '{}'::jsonb),
    goal = p_onboarding_snapshot -> 'answers' ->> 'goal'
  where id = p_id and user_id = auth.uid();

  if not found then raise exception 'plan not found'; end if;
end $$;

revoke all on function update_training_plan(uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function update_training_plan(uuid, text, jsonb, jsonb) to authenticated;

grant execute on function nearby_companions to authenticated;

grant execute on function get_companion to authenticated;

grant execute on function accept_booking(uuid) to authenticated;

grant execute on function decline_booking(uuid) to authenticated;

grant execute on function cancel_booking(uuid) to authenticated;

grant execute on function complete_booking(uuid) to authenticated;

-- Notify the relevant party on booking insert/status change. recipient and
-- payload are derived server-side only (no attacker-controlled routing).;

grant execute on function accept_booking(uuid) to authenticated;

grant execute on function decline_booking(uuid) to authenticated;

grant execute on function cancel_booking(uuid) to authenticated;

grant execute on function complete_booking(uuid) to authenticated;

grant execute on function delete_account to authenticated;

grant execute on function recommended_companions to anon, authenticated;

-- Full public profile for the trainer detail page.
-- Returns a JSON object shaped like @pacergo/shared TrainerProfile, or null.
-- Fields with no column in this schema (certifications, gym memberships,
-- manager, bidding) come back empty so the UI degrades gracefully.;

grant execute on function companion_profile to anon, authenticated;

grant execute on function recommended_companions to anon, authenticated;

grant execute on function companion_profile to anon, authenticated;

revoke all on function public.delete_current_user() from public, anon;

grant execute on function public.delete_current_user() to authenticated;

grant execute on function update_my_profile(text, text, experience_level, text, text) to authenticated;

grant execute on function set_my_photo_url(text) to authenticated;

grant execute on function get_my_profile() to authenticated;

grant execute on function toggle_saved_companion(uuid) to authenticated;

grant execute on function my_saved_companion_ids() to authenticated;

grant execute on function saved_companions_feed() to authenticated;

grant execute on function toggle_saved_companion(uuid) to authenticated;

grant execute on function my_saved_companion_ids() to authenticated;

grant execute on function saved_companions_feed() to authenticated;

grant execute on function companion_offerings(uuid) to anon, authenticated;

grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;

grant execute on function my_bookings() to authenticated;

grant execute on function booking_detail(uuid) to authenticated;

grant execute on function companion_offerings(uuid) to anon, authenticated;

grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;

grant execute on function my_bookings() to authenticated;

grant execute on function booking_detail(uuid) to authenticated;

grant execute on function set_weekly_target(int) to authenticated;

grant execute on function weekly_progress() to authenticated;

grant execute on function submit_review(uuid, int, text) to authenticated;

grant execute on function my_review_for_booking(uuid) to authenticated;

grant execute on function submit_review(uuid, int, text) to authenticated;

grant execute on function my_review_for_booking(uuid) to authenticated;

grant execute on function my_notifications() to authenticated;

grant execute on function unread_notification_count() to authenticated;

grant execute on function mark_notifications_read() to authenticated;

grant execute on function has_booking_with(uuid) to authenticated;

grant execute on function start_conversation(uuid) to authenticated;

grant execute on function my_conversations() to authenticated;

grant execute on function conversation_header(uuid) to authenticated;

grant execute on function conversation_messages(uuid) to authenticated;

grant execute on function send_message(uuid, text) to authenticated;

grant execute on function mark_conversation_read(uuid) to authenticated;

grant execute on function has_booking_with(uuid) to authenticated;

grant execute on function start_conversation(uuid) to authenticated;

grant execute on function my_conversations() to authenticated;

grant execute on function conversation_header(uuid) to authenticated;

grant execute on function conversation_messages(uuid) to authenticated;

grant execute on function send_message(uuid, text) to authenticated;

grant execute on function mark_conversation_read(uuid) to authenticated;

grant execute on function my_listing() to authenticated;

grant execute on function upsert_my_listing(text, text, text, text) to authenticated;

grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;

grant execute on function remove_offering(uuid) to authenticated;

grant execute on function add_availability(int, int, int) to authenticated;

grant execute on function remove_availability(uuid) to authenticated;

grant execute on function my_listing() to authenticated;

grant execute on function upsert_my_listing(text, text, text, text) to authenticated;

grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;

grant execute on function remove_offering(uuid) to authenticated;

grant execute on function add_availability(int, int, int) to authenticated;

grant execute on function remove_availability(uuid) to authenticated;

grant execute on function set_my_banner_url(text) to authenticated;

-- Surface banner_url in the caller's own profile read.;

grant execute on function get_my_profile() to authenticated;

-- Surface banner_url on the public profile (anon). Restated in full per the
-- repo convention; certifications stay empty here and are wired in 0024.;

grant execute on function set_my_banner_url(text) to authenticated;

grant execute on function is_platform_admin() to authenticated;

-- Thin wrapper for the client (nav gating).;

grant execute on function am_i_admin() to authenticated;

-- Admins can read every verification row + the documents in the private bucket.;

grant execute on function submit_verification(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list every certification request (pending first), with applicant info.
-- ---------------------------------------------------------------------------;

grant execute on function list_pending_verifications() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: approve or reject a verification.
-- ---------------------------------------------------------------------------;

grant execute on function review_verification(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Studio bundle: include the caller's certification verification status so the
-- offerings editor can lock/unlock Tier A.
-- ---------------------------------------------------------------------------;

grant execute on function my_listing() to authenticated;

-- ---------------------------------------------------------------------------
-- Public profile: surface approved certification labels + banner_url.
-- ---------------------------------------------------------------------------;

grant execute on function is_platform_admin() to authenticated;

grant execute on function am_i_admin() to authenticated;

grant execute on function submit_verification(text, text, text) to authenticated;

grant execute on function list_pending_verifications() to authenticated;

grant execute on function review_verification(uuid, text, text) to authenticated;

grant execute on function submit_verification(text, text, text, text) to authenticated;

-- Studio bundle: per-activity certification status, keyed by activity slug.;

grant execute on function my_listing() to authenticated;

-- Admin queue: include the activity each certification is for.;

grant execute on function list_pending_verifications() to authenticated;

-- Discovery feed: include banner_url so cards can show a cover photo.;

grant execute on function recommended_companions to anon, authenticated;

grant execute on function submit_verification(text, text, text, text) to authenticated;

grant execute on function submit_verification(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- add_offering: Tier A now also requires approved competition experience for
-- the activity (in addition to the price band + certification from 0026).
-- ---------------------------------------------------------------------------;

grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Studio bundle: add a per-activity `competitions` status map alongside the
-- existing `verifications` (certifications) map, so the editor can gate Tier A
-- on both.
-- ---------------------------------------------------------------------------;

grant execute on function my_listing() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin queue: include competition submissions too (doc_type carries the kind).
-- ---------------------------------------------------------------------------;

grant execute on function list_pending_verifications() to authenticated;

-- ---------------------------------------------------------------------------
-- Public profile: surface approved competition labels (a Tier A selling point)
-- alongside the existing certifications.
-- ---------------------------------------------------------------------------;

grant execute on function get_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- complete_onboarding: profile basics + chosen activities in one call
-- (replaces mobile's users UPDATE + raw user_activities INSERT).
-- ---------------------------------------------------------------------------;

grant execute on function complete_onboarding(text, experience_level, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- set_my_availability: replace-all semantics (mobile edits the whole set).
-- p_slots: [{"weekday":1,"start_minute":1080,"end_minute":1200}, â€¦]
-- ---------------------------------------------------------------------------;

grant execute on function set_my_availability(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Safety: blocks + reports via RPCs.
-- ---------------------------------------------------------------------------;

grant execute on function my_blocked_ids() to authenticated;

grant execute on function block_user(uuid) to authenticated;

grant execute on function unblock_user(uuid) to authenticated;

grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------;

grant execute on function get_companion to authenticated;

grant execute on function complete_onboarding(text, experience_level, text, uuid[]) to authenticated;

grant execute on function set_my_availability(jsonb) to authenticated;

grant execute on function my_blocked_ids() to authenticated;

grant execute on function block_user(uuid) to authenticated;

grant execute on function unblock_user(uuid) to authenticated;

grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- Security + performance hardening sweep (full audit of 0001â€“0029).
--
-- 1. RPC-only writes, enforced at the GRANT level: anon/authenticated lose all
--    table write privileges (and anon loses reads). Every write path already
--    goes through a SECURITY DEFINER RPC, so client write policies are dropped.
--    This closes real holes: any user could UPDATE their own users row and set
--    is_admin = true, and listing owners could write rating_avg/rating_count or
--    insert offerings that bypass the tier/price gates in add_offering.
-- 2. SECURITY DEFINER functions get explicit ACLs (Postgres grants EXECUTE to
--    PUBLIC by default, so anon could call every RPC).
-- 3. Anon-facing profile RPCs no longer leak non-companion users' data.
-- 4. Blocks are enforced in booking + messaging; verification uploads must
--    point into the caller's own storage folder; input sizes are capped.
-- 5. Remaining RLS policies wrap auth.uid() in a scalar subquery (evaluated
--    once per statement, not per row); missing FK/partial/GIST indexes added;
--    storage buckets get size + MIME limits.
-- 6. Bug fixes: review upserts now recompute listing ratings; public-profile
--    reviews (lost in 0022's restatement) are restored, capped at 50.

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. Table privileges: clients read where policies allow, never write.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

revoke all on table
  users, activities, user_activities, companion_listings, listing_offerings,
  saved_companions, bookings, reviews, notifications, availability,
  availability_blocks, verifications, conversations, messages, blocks, reports
from anon;

revoke insert, update, delete, truncate, references, trigger on table
  users, activities, user_activities, companion_listings, listing_offerings,
  saved_companions, bookings, reviews, notifications, availability,
  availability_blocks, verifications, conversations, messages, blocks, reports
from authenticated;

-- Future tables created by migrations follow the same rule.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;

-- Future functions are opt-in per role, never PUBLIC.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

grant execute on function recommended_companions(text, int) to anon, authenticated;

grant execute on function companion_profile(uuid) to anon, authenticated;

grant execute on function companion_offerings(uuid) to anon, authenticated;

-- Signed-in surface.;

grant execute on function nearby_companions(double precision, double precision, double precision, text, tier_level, int) to authenticated;

grant execute on function get_companion(uuid) to authenticated;

grant execute on function delete_account() to authenticated;

grant execute on function delete_current_user() to authenticated;

grant execute on function update_my_profile(text, text, experience_level, text, text) to authenticated;

grant execute on function set_my_photo_url(text) to authenticated;

grant execute on function set_my_banner_url(text) to authenticated;

grant execute on function get_my_profile() to authenticated;

grant execute on function complete_booking(uuid) to authenticated;

grant execute on function set_weekly_target(int) to authenticated;

grant execute on function weekly_progress() to authenticated;

grant execute on function my_notifications() to authenticated;

grant execute on function unread_notification_count() to authenticated;

grant execute on function mark_notifications_read() to authenticated;

grant execute on function set_my_availability(jsonb) to authenticated;

grant execute on function is_platform_admin() to authenticated;

grant execute on function am_i_admin() to authenticated;

grant execute on function submit_verification(text, text, text, text) to authenticated;

grant execute on function list_pending_verifications() to authenticated;

grant execute on function review_verification(uuid, text, text) to authenticated;

grant execute on function complete_onboarding(text, experience_level, text, uuid[]) to authenticated;

grant execute on function report_user(uuid, text, text, uuid) to authenticated;

-- Public (anon) surface: read-only web discovery, nothing else.
grant execute on function recommended_companions(text, int) to anon, authenticated;

grant execute on function companion_profile(uuid) to anon, authenticated;

-- Signed-in surface.
grant execute on function nearby_companions(double precision, double precision, double precision, text, tier_level, int) to authenticated;

grant execute on function get_companion(uuid) to authenticated;

grant execute on function delete_account() to authenticated;

grant execute on function delete_current_user() to authenticated;

grant execute on function payment_review(uuid) to authenticated;

grant execute on function payment_detail(uuid) to authenticated;

grant execute on function create_newebpay_payment_attempt(uuid, text, int) to authenticated;

grant execute on function mark_newebpay_payment_redirected(uuid) to authenticated;

grant execute on function observe_newebpay_return(text, text, text, text, text, text, jsonb, payment_status) to service_role;

grant execute on function apply_newebpay_notification(text, int, text, text, text, text, text, jsonb, payment_status) to service_role;

grant execute on function payment_review(uuid) to authenticated;

grant execute on function payment_detail(uuid) to authenticated;

grant execute on function create_newebpay_payment_attempt(uuid, text, int) to authenticated;

grant execute on function mark_newebpay_payment_redirected(uuid) to authenticated;

grant execute on function observe_newebpay_return(text, text, text, text, text, text, jsonb, payment_status) to service_role;

grant execute on function apply_newebpay_notification(text, int, text, text, text, text, text, jsonb, payment_status) to service_role;

grant execute on function admin_export_users() to authenticated;

grant execute on function admin_export_trainers() to authenticated;

grant execute on function admin_export_orders() to authenticated;

grant execute on function admin_export_withdrawals() to authenticated;

grant execute on function admin_export_users() to authenticated;

grant execute on function admin_export_trainers() to authenticated;

grant execute on function admin_export_orders() to authenticated;

grant execute on function admin_export_withdrawals() to authenticated;

grant execute on function accept_consent(consent_document_slug, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up consent: extend handle_new_user() (0001/0010/0030) to also write
-- consent_records from auth.signUp()'s options.data metadata. The web client
-- passes:
--   { consent_terms_of_service: "2026-09-15",
--     consent_privacy_policy: "2026-09-15",
--     consent_risk_disclosure: "2026-09-15" }
-- (the CONSENT_VERSIONS labels from apps/web/src/lib/consent.ts, only
-- included when the sign-up checkbox was checked â€” the client blocks
-- submission otherwise, so their presence here is the record of consent).
-- Re-declaring the full function (`create or replace` needs the whole body);
-- the only change from 0030's version is the loop at the end.
-- ---------------------------------------------------------------------------;

grant execute on function accept_consent(consent_document_slug, text) to authenticated;

grant execute on function admin_correct_service_completed(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Eligibility â€” automatic (cron), re-evaluated every cycle in both
--    directions so admin_hold / refund changes made between cron runs are
--    reconciled even if the RPCs below didn't already flip the flag inline.
-- ---------------------------------------------------------------------------;

grant execute on function admin_set_payment_hold(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Trainer available balance = sum of eligible, unsettled orders.
-- ---------------------------------------------------------------------------;

grant execute on function my_trainer_balance() to authenticated;

grant execute on function admin_correct_service_completed(uuid, boolean, text) to authenticated;

grant execute on function my_trainer_balance() to authenticated;

);

grant execute on function admin_set_payment_hold(uuid, boolean, text) to authenticated;

grant execute on function my_trainer_balance() to authenticated;

grant execute on function request_withdrawal(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. B-5 Â· Cancellation & refund status recording (admin action only).
--    p_action: 'cancel' (payments.status -> cancelled),
--              'refund_requested' | 'refunded' (payments.refund_status).
--    Excludes the order from settlement eligibility immediately if it was
--    already eligible-unsettled (mirrors admin_set_payment_hold's pattern).
-- ---------------------------------------------------------------------------;

grant execute on function admin_set_payment_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. B-4 Â· Trainer's own orders (read-only). Replaces a direct client-side
--    table query (Â§6.3) with a SECURITY DEFINER RPC scoped to auth.uid().
-- ---------------------------------------------------------------------------;

grant execute on function trainer_orders() to authenticated;

-- Trainer's own withdrawal requests (for the same earnings page).;

grant execute on function my_withdrawal_requests() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Settlement application / reversal helpers (used by the B-8 workflow
--    RPC below). Internal only â€” not granted to authenticated/anon.
-- ---------------------------------------------------------------------------;

grant execute on function admin_list_withdrawal_requests(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. B-8 Â· Admin payout detail (full bank reveal, admin-only) + full history.
-- ---------------------------------------------------------------------------;

grant execute on function admin_withdrawal_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. B-8 Â· Status workflow + corrections. Forward steps (requested->
--    processing, processing->paid) don't require a reason; every other
--    transition (rejected/cancelled, or any backward "undo") does.
-- ---------------------------------------------------------------------------;

grant execute on function admin_set_withdrawal_status(uuid, text, text) to authenticated;

grant execute on function request_withdrawal(int) to authenticated;

grant execute on function admin_set_payment_status(uuid, text, text) to authenticated;

grant execute on function trainer_orders() to authenticated;

grant execute on function my_withdrawal_requests() to authenticated;

grant execute on function admin_list_withdrawal_requests(text) to authenticated;

grant execute on function admin_withdrawal_detail(uuid) to authenticated;

grant execute on function admin_set_withdrawal_status(uuid, text, text) to authenticated;

grant execute on function create_simulated_payment_attempt(uuid, text, int) to authenticated;

-- Trainee-callable "gateway" for the simulated provider â€” an explicit
-- approve/decline in place of NewebPay's hosted page + real NotifyURL.
-- Clearly test-only: only ever touches rows this same user owns and with
-- provider='simulated', so it can never be used to fake a live payment.;

grant execute on function confirm_simulated_payment(uuid, boolean) to authenticated;

-- The simulated review/result screens reuse the existing payment_detail()
-- RPC (0033) â€” already owner-gated (p.user_id = auth.uid()) and already
-- returns everything the UI needs (status, amount, booking). No new getter
-- needed; payment_detail's `booking` join doesn't reference "newebpay"
-- either, so it's already provider-agnostic.;

grant execute on function create_simulated_payment_attempt(uuid, text, int) to authenticated;

grant execute on function confirm_simulated_payment(uuid, boolean) to authenticated;

-- Match 0030 RPC-only write model for new tables.
revoke all on table exercises, user_onboarding, user_training_plans from anon;

revoke insert, update, delete, truncate, references, trigger on table
  exercises, user_onboarding, user_training_plans
from authenticated;

revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;

revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;

revoke all on function my_training_plans() from public, anon, authenticated;

revoke all on function training_plan_detail(uuid) from public, anon, authenticated;

revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;

grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;

grant execute on function my_training_plans() to authenticated;

grant execute on function training_plan_detail(uuid) to authenticated;

grant execute on function delete_training_plan(uuid) to authenticated;

revoke all on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;

revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;

revoke all on function my_training_plans() from public, anon, authenticated;

revoke all on function training_plan_detail(uuid) from public, anon, authenticated;

revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text) to authenticated;

grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;

grant execute on function my_training_plans() to authenticated;

grant execute on function training_plan_detail(uuid) to authenticated;

grant execute on function delete_training_plan(uuid) to authenticated;

revoke all on function update_training_plan(uuid, text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function update_training_plan(uuid, text, jsonb, jsonb) to authenticated;

comment on function compute_order_fee_split(int, numeric) is
  'TODO(pending client confirmation): rounding mode (round-half-up via Postgres round()) is a placeholder. Change here only â€” every caller reads the result, none re-implement the formula.';

-- ---------------------------------------------------------------------------
-- 2. Populate the fee split at order-creation time, not just at export time.
--    `create_newebpay_payment_attempt` (0033) inserts the payments row with
--    only `amount` set; extend it to also set gross_amount/platform_fee_*/
--    trainer_payable using the function above. Re-declaring the whole
--    function (not just patching) because `create or replace` needs the
--    complete body â€” this is a copy of 0033's version with one insert
--    changed; see the "-- CHANGED" markers.
-- ---------------------------------------------------------------------------;

comment on function expire_stale_payment_attempts() is
  'Called only by pg_cron (see cron.schedule below). Not granted to anon/authenticated â€” auth.uid() is NULL in a cron context, so this must stay unreachable from a user session.';

-- Every 5 minutes: frequent enough that a 30-minute window is enforced within
-- a tight margin, infrequent enough to be a trivial load on a free-tier DB.
-- `cron.schedule()` upserts by job name (confirmed against Supabase's docs,
-- 2026-09-15: calling it again with the same name replaces the existing job
-- rather than erroring or duplicating it), so this is safe to re-run as-is â€”
-- no existence check needed.
select cron.schedule(
  'expire-stale-payment-attempts',
  '*/5 * * * *',
  $$select expire_stale_payment_attempts()$$
);

comment on function compute_order_fee_split(int, numeric) is
  'TODO(pending client confirmation): rounding mode (round-half-up via Postgres round()) is a placeholder. Change here only â€” every caller reads the result, none re-implement the formula.';

comment on function expire_stale_payment_attempts() is
  'Called only by pg_cron (see cron.schedule below). Not granted to anon/authenticated â€” auth.uid() is NULL in a cron context, so this must stay unreachable from a user session.';

comment on column users.bank_account_number is
  'Raw bank account number. Admin-detail-only (B-8); never appears in exports, listings, or logs. Format per P-6, best-guess default until client confirms.';

comment on column users.bank_account_mask is
  'Auto-derived from bank_account_number via users_bank_account_mask trigger. Safe for exports/listings (B-9, B-7).';

comment on function mark_service_completed() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

-- Admin-callable correction (no-show, reschedule error). Required reason,
-- logged. p_completed=false only allowed before settlement (never unwind a
-- paid-out order from here â€” that is a payout-workflow correction, B-8).;

comment on function evaluate_settlement_eligibility() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

comment on function mark_service_completed() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

comment on function evaluate_settlement_eligibility() is
  'Called only by pg_cron (see run_settlement_cycle below). Not granted to anon/authenticated.';

-- updated_at helper;

-- â”€â”€ Guarded transitions (SECURITY DEFINER; enforce role + FSM) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€;

-- Realtime stream for messages.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;

-- Public, read-only discovery for the web app.
--
-- The base tables are authenticated-only (RLS), and the existing discovery RPCs
-- require a logged-in user + geolocation. The web app browses trainers publicly
-- (login is only needed to book), so these SECURITY DEFINER functions expose a
-- SAFE, curated subset (no raw coordinates, no contact info, no PII beyond the
-- public profile fields) and are granted to `anon`. The base tables stay locked.

-- Recommended trainers feed (rating-ordered, no geolocation needed).
-- Returns a JSON array shaped exactly like @pacergo/shared TrainerSummary.;

-- Favorites (saved companions) via RPCs.

-- Toggle a companion in the caller's saved list. Returns true if now saved.;

-- Booking creation + reads via RPCs (web). The FSM transitions
-- (accept/decline/cancel/complete) already exist from 0004.

-- Offerings for a companion (with ids) so the booking form can pick one.;

-- Create a booking request as the signed-in seeker. Denormalizes the
-- activity/tier/price from the offering and names/photos from both users.;

-- Two-way reviews via RPCs + surface reviews on the public profile.

-- Submit (or update) the caller's review for a completed booking. Either party
-- may review the other once. Returns the review id.;

-- The caller's own review for a booking (to toggle the review UI), or null.;

-- Messaging via RPCs, gated on an existing booking between the two users
-- (ä¸‹å–®ä¹‹å‰ä¸èƒ½æ‰“è¨Šæ¯ â€” no messaging before a booking exists).

-- Whether the caller has any booking with another user (gates the chat entry).;

-- Open (or fetch) the conversation with another user. Requires a booking.;

-- The caller's conversations, newest activity first, with a preview + unread.;

-- Header info (the other party) for a single conversation.;

-- Trainer backend (é™ªç·´å¸«å¾Œå°): manage your own listing, offerings, availability.

-- The caller's listing bundle (listing + offerings + availability + flag).;

-- Create or update the caller's listing (marks them a companion).;

-- Add an offering to the caller's listing.;

-- Set or clear the caller's banner URL (null clears it).;

-- Restrict PDF uploads via the object name convention `<uid>/cert-*.pdf`; size
-- is validated client-side. Files are private (signed URLs only).

-- ---------------------------------------------------------------------------
-- Admin role helper (security definer â†’ safe to call from RLS policies).
-- ---------------------------------------------------------------------------;

-- Thin wrapper for the client (nav gating).;

-- ---------------------------------------------------------------------------
-- Submit a verification document (trainer). Returns the new row id.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- Admin: list every certification request (pending first), with applicant info.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- Admin: approve or reject a verification.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- Studio bundle: include the caller's certification verification status so the
-- offerings editor can lock/unlock Tier A.
-- ---------------------------------------------------------------------------;

-- submit_verification gains the activity (required for certifications). Replace
-- the 3-arg version from 0024.
drop function if exists submit_verification(text, text, text);

-- Studio bundle: per-activity certification status, keyed by activity slug.;

-- Admin queue: include the activity each certification is for.;

-- Tier A = certification + competition experience. On top of the certified-tier
-- rule from 0026, Tier A additionally requires *approved competition experience*
-- for that activity: a separate document the trainer submits and an admin
-- reviews alongside the certification. Modelled as a new per-activity
-- verification doc_type = 'competition', reusing the whole submitâ†’reviewâ†’gate
-- pipeline.

-- ---------------------------------------------------------------------------
-- submit_verification: accept the new 'competition' doc type (per-activity,
-- like 'certification'). Replaces the 4-arg version from 0025.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- add_offering: Tier A now also requires approved competition experience for
-- the activity (in addition to the price band + certification from 0026).
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- Studio bundle: add a per-activity `competitions` status map alongside the
-- existing `verifications` (certifications) map, so the editor can gate Tier A
-- on both.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- Admin queue: include competition submissions too (doc_type carries the kind).
-- ---------------------------------------------------------------------------;

-- Mobile â‡„ web alignment: close the RPC gaps so the Expo app can drop its
-- remaining direct table reads/writes (RPC-only data access, same as web).

-- ---------------------------------------------------------------------------
-- get_my_profile: add the fields mobile needs for routing/home (onboarding
-- flag, weekly target, admin flag). Restated in full per repo convention.
-- ---------------------------------------------------------------------------;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- complete_onboarding: profile basics + chosen activities in one call
-- (replaces mobile's users UPDATE + raw user_activities INSERT).
-- ---------------------------------------------------------------------------;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- set_my_availability: replace-all semantics (mobile edits the whole set).
-- p_slots: [{"weekday":1,"start_minute":1080,"end_minute":1200}, â€¦]
-- ---------------------------------------------------------------------------;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Safety: blocks + reports via RPCs.
-- ---------------------------------------------------------------------------;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- get_companion: surface banner_url on the mobile detail screen. The return
-- type changes, so drop + recreate.
-- ---------------------------------------------------------------------------
drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  left join companion_listings l on l.user_id = p.id
  where p.id = p_id;
$$;
grant execute on function get_companion to authenticated;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 5. Trigger hygiene + rating-recompute bug fix.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Pin search_path (mutable-search-path advisor finding).;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- Cap the display name copied from OAuth metadata.;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 6. RPC fixes: data leaks, block enforcement, input caps, abuse guards.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- update_my_profile: length caps (columns were unbounded text).;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- Photo / banner URLs: must be http(s) and bounded (was arbitrary text).;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- complete_onboarding: caps.;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- toggle_saved_companion: no self-saves.;

drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- get_companion: previously returned ANY user's profile fields to any
-- authenticated caller; now companions with an active listing only.
drop function if exists get_companion(uuid);

create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- nearby_companions: clamp the radius (was unbounded), mark stable.;

-- recommended_companions: clamp p_limit (anon could request unbounded rows).;

-- companion_profile: previously `(l.status = 'active' or l.id is null)` leaked
-- non-companion users' profiles to anon; now active listings only. Also
-- restores the reviews list (dropped by 0022's restatement), capped at 50.;

-- create_booking: enforce blocks, bound inputs, reject past times, and stop
-- duplicate open requests against the same companion (notification spam).;

-- start_conversation: blocked pairs cannot open a chat.;

-- send_message: blocked pairs cannot keep messaging in an existing thread.;

-- submit_verification: the document must live in the caller's own storage
-- folder, labels are capped, and duplicate pending/approved submissions for
-- the same (doc_type, activity) are rejected (admin-queue spam guard).;

-- review_verification: surface a miss instead of silently succeeding.;

-- upsert_my_listing: length caps for the free-text fields.;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 7. Function ACLs: strip the implicit PUBLIC EXECUTE from every app function,
--    then grant back exactly what each audience needs. (Trigger functions get
--    no grants â€” only their triggers invoke them.)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'set_updated_at', 'handle_new_user', 'notify_booking_event',
        'recompute_listing_rating', 'bump_conversation',
        'nearby_companions', 'get_companion', 'delete_account',
        'recommended_companions', 'companion_profile', 'delete_current_user',
        'update_my_profile', 'set_my_photo_url', 'set_my_banner_url', 'get_my_profile',
        'toggle_saved_companion', 'my_saved_companion_ids', 'saved_companions_feed',
        'companion_offerings', 'create_booking', 'my_bookings', 'booking_detail',
        'accept_booking', 'decline_booking', 'cancel_booking', 'complete_booking',
        'set_weekly_target', 'weekly_progress',
        'submit_review', 'my_review_for_booking',
        'my_notifications', 'unread_notification_count', 'mark_notifications_read',
        'has_booking_with', 'start_conversation', 'my_conversations',
        'conversation_header', 'conversation_messages', 'send_message',
        'mark_conversation_read',
        'my_listing', 'upsert_my_listing', 'add_offering', 'remove_offering',
        'add_availability', 'remove_availability', 'set_my_availability',
        'is_platform_admin', 'am_i_admin',
        'submit_verification', 'list_pending_verifications', 'review_verification',
        'complete_onboarding', 'my_blocked_ids', 'block_user', 'unblock_user',
        'report_user'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Public (anon) surface: read-only web discovery, nothing else.;

-- ---------------------------------------------------------------------------
-- 4. Admin export RPCs (B-9). SECURITY DEFINER; admin-gated via
--    is_platform_admin(); return jsonb arrays so the TS layer projects the exact
--    B-9 column sets without clients querying tables directly (A-8).
--    Each inner subquery exposes the ordering columns as bare columns so the
--    outer jsonb_agg can ORDER BY them.
-- ---------------------------------------------------------------------------

-- Users export (safe profile columns only; email lives in auth.users and
-- is intentionally excluded â€” PII, cross-schema). `bank_account` / `push_token`
-- must NEVER appear in a bulk export.;

-- Trainers export: listed companions only (has an active companion_listing),
-- with their headline tier / price and rating. Email excluded (PII).;

-- Orders / bookings export with fee split + settlement / refund statuses.
-- payments.user_id is the seeker; the trainer is bookings.companion_id.;

-- Phase 2 Scope B gap-fix: the fee split (B-1) and 30-min order expiry (B-1)
-- were added as *columns* in 0035 but nothing ever wrote or scheduled them.
-- This migration wires the write path. It does NOT touch B-2 (provider
-- abstraction), B-6/B-7/B-8 (settlement state machine / payout admin) â€” those
-- are separate, larger pieces sequenced after this one in
-- docs/phase2-execution-order.md Stage 3/4. Keeping this migration narrowly
-- scoped to "make the columns that already exist actually correct" avoids
-- building settlement/payout logic against a fee split that isn't real yet.

-- ---------------------------------------------------------------------------
-- 1. Fee-split formula, isolated in one function.
--
--    TODO(pending client confirmation â€” see docs/phase2-work-tracker.md
--    Decisions log, "Fee rounding rule"): the rounding MODE below (round half
--    up) is a placeholder, not a confirmed business rule. It is written as a
--    single small function with one clearly-named constant so changing the
--    rate or the rounding mode later is a one-line edit here, not a hunt
--    through every place that computes a fee.
--
--    Formula: platform_fee_amount = round_half_up(gross_amount * rate)
--             trainer_payable      = gross_amount - platform_fee_amount
--    (Processing fee is recorded separately where the provider exposes it â€”
--    Â§5.1: "not deducted from trainer 95%" â€” so it never enters this split.)
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 2. Populate the fee split at order-creation time, not just at export time.
--    `create_newebpay_payment_attempt` (0033) inserts the payments row with
--    only `amount` set; extend it to also set gross_amount/platform_fee_*/
--    trainer_payable using the function above. Re-declaring the whole
--    function (not just patching) because `create or replace` needs the
--    complete body â€” this is a copy of 0033's version with one insert
--    changed; see the "-- CHANGED" markers.
-- ---------------------------------------------------------------------------;

-- Every 5 minutes: frequent enough that a 30-minute window is enforced within
-- a tight margin, infrequent enough to be a trivial load on a free-tier DB.
-- `cron.schedule()` upserts by job name (confirmed against Supabase's docs,
-- 2026-09-15: calling it again with the same name replaces the existing job
-- rather than erroring or duplicating it), so this is safe to re-run as-is â€”
-- no existence check needed.
select cron.schedule(
  'expire-stale-payment-attempts',
  '*/5 * * * *',
  $$select expire_stale_payment_attempts()$$
);

);

-- ---------------------------------------------------------------------------
-- 4. Service Completed â€” automatic (cron) + admin correction.
-- ---------------------------------------------------------------------------;

-- Admin-callable correction (no-show, reschedule error). Required reason,
-- logged. p_completed=false only allowed before settlement (never unwind a
-- paid-out order from here â€” that is a payout-workflow correction, B-8).;

-- ---------------------------------------------------------------------------
-- 5. Eligibility â€” automatic (cron), re-evaluated every cycle in both
--    directions so admin_hold / refund changes made between cron runs are
--    reconciled even if the RPCs below didn't already flip the flag inline.
-- ---------------------------------------------------------------------------;

select cron.schedule(
  'run-settlement-cycle',
  '*/15 * * * *',
  $$select run_settlement_cycle()$$
);

-- ---------------------------------------------------------------------------
-- 6. Admin hold (dispute flag). Setting it revokes eligibility immediately
--    if the row was already eligible-unsettled; clearing it re-checks the
--    same row inline instead of waiting for the next cron tick.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 6. Admin hold (dispute flag). Setting it revokes eligibility immediately
--    if the row was already eligible-unsettled; clearing it re-checks the
--    same row inline instead of waiting for the next cron tick.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 2. Withdrawal request (trainer-callable).
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 3. B-5 Â· Cancellation & refund status recording (admin action only).
--    p_action: 'cancel' (payments.status -> cancelled),
--              'refund_requested' | 'refunded' (payments.refund_status).
--    Excludes the order from settlement eligibility immediately if it was
--    already eligible-unsettled (mirrors admin_set_payment_hold's pattern).
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 4. B-4 Â· Trainer's own orders (read-only). Replaces a direct client-side
--    table query (Â§6.3) with a SECURITY DEFINER RPC scoped to auth.uid().
-- ---------------------------------------------------------------------------;

-- Trainer's own withdrawal requests (for the same earnings page).;

-- ---------------------------------------------------------------------------
-- 5. Settlement application / reversal helpers (used by the B-8 workflow
--    RPC below). Internal only â€” not granted to authenticated/anon.
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 6. B-7 Â· Admin payout list (filterable, with header totals).
-- ---------------------------------------------------------------------------;

-- ---------------------------------------------------------------------------
-- 7. B-8 Â· Admin payout detail (full bank reveal, admin-only) + full history.
-- ---------------------------------------------------------------------------;

-- Phase 2 Stage 4 (docs/phase2-execution-order.md): B-2 payment-provider
-- abstraction, database side. Mirrors create_newebpay_payment_attempt (0033)
-- with provider='simulated' instead of 'newebpay' â€” kept as a separate
-- function rather than parameterizing the existing one, since the existing
-- function is already relied on by the live NewebPay route and duplicating a
-- ~40-line function is lower-risk than changing it (Â§8.4 "live cutover is
-- config-only" implies the live path shouldn't need to change for this).
--
-- Confirmation reuses apply_newebpay_notification (0033) as-is: that
-- function is already provider-agnostic (it matches by merchant_order_no
-- and never references "newebpay" in its body), so no new confirmation
-- logic is needed â€” only a trainee-callable RPC that supplies simulated
-- values in place of a real gateway signature.;

-- The simulated review/result screens reuse the existing payment_detail()
-- RPC (0033) â€” already owner-gated (p.user_id = auth.uid()) and already
-- returns everything the UI needs (status, amount, booking). No new getter
-- needed; payment_detail's `booking` join doesn't reference "newebpay"
-- either, so it's already provider-agnostic.;


update payments
set processing_fee_rate = 0,
    processing_fee_amount = 0
where provider = 'simulated'
  and processing_fee_amount is null;

-- ---------------------------------------------------------------------------
-- Trainer bank account. The mask trigger fills bank_account_mask.
-- ---------------------------------------------------------------------------

create or replace function save_bank_account(
  p_bank_code text,
  p_bank_name text,
  p_branch_name text,
  p_account_number text,
  p_account_holder text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := trim(coalesce(p_bank_code, ''));
  v_name text := trim(coalesce(p_bank_name, ''));
  v_branch text := trim(coalesce(p_branch_name, ''));
  v_number text := trim(coalesce(p_account_number, ''));
  v_holder text := trim(coalesce(p_account_holder, ''));
begin
  if v_uid is null then raise exception 'bank_unauthenticated'; end if;
  if v_code !~ '^[0-9]{3,7}$' then raise exception 'bank_details_invalid'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'bank_details_invalid';
  end if;
  if char_length(v_branch) < 1 or char_length(v_branch) > 80 then
    raise exception 'bank_details_invalid';
  end if;
  if v_number !~ '^[0-9]{8,16}$' then raise exception 'bank_details_invalid'; end if;
  if char_length(v_holder) < 1 or char_length(v_holder) > 80 then
    raise exception 'bank_details_invalid';
  end if;

  update users
  set bank_code = v_code,
      bank_name = v_name,
      branch_name = v_branch,
      bank_account_number = v_number,
      bank_account_holder = v_holder
  where id = v_uid;
  if not found then raise exception 'bank_unauthenticated'; end if;
end $$;

create or replace function my_bank_account()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'bank_code', bank_code,
    'bank_name', bank_name,
    'branch_name', branch_name,
    'bank_account_number', bank_account_number,
    'bank_account_holder', bank_account_holder,
    'bank_account_mask', bank_account_mask
  )
  from users
  where id = auth.uid();
$$;

-- Bank account numbers are encrypted by the web server (AES-GCM, key in the
-- server's ENCRYPTION_KEY, owner id as AAD — see apps/web/src/lib/crypto) before
-- they reach the database. This stores the ciphertext and the mask the server
-- computed; the plaintext never touches Postgres. Legacy plaintext is encrypted
-- by backend/scripts/encrypt-bank-accounts.mjs.
create or replace function save_bank_account_encrypted(
  p_bank_code text,
  p_bank_name text,
  p_branch_name text,
  p_account_cipher text,
  p_account_mask text,
  p_account_holder text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := trim(coalesce(p_bank_code, ''));
  v_name text := trim(coalesce(p_bank_name, ''));
  v_branch text := trim(coalesce(p_branch_name, ''));
  v_holder text := trim(coalesce(p_account_holder, ''));
begin
  if v_uid is null then raise exception 'bank_unauthenticated'; end if;
  if v_code !~ '^[0-9]{3,7}$' then raise exception 'bank_details_invalid'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'bank_details_invalid';
  end if;
  if char_length(v_branch) < 1 or char_length(v_branch) > 80 then
    raise exception 'bank_details_invalid';
  end if;
  if char_length(v_holder) < 1 or char_length(v_holder) > 80 then
    raise exception 'bank_details_invalid';
  end if;
  -- Only ciphertext in the expected shape, and a mask that looks like one.
  -- Postgres rejects a regex bound above 255, so the 40–400 base64 length
  -- (same window the app tests) is checked with length() instead.
  if p_account_cipher is null
     or length(p_account_cipher) < 47
     or length(p_account_cipher) > 407
     or p_account_cipher !~ '^enc:v1:[A-Za-z0-9+/=]+$' then
    raise exception 'bank_details_invalid';
  end if;
  if p_account_mask is null or p_account_mask !~ '^[*]{0,12}[0-9]{1,4}$|^[*]{1,4}$' then
    raise exception 'bank_details_invalid';
  end if;

  update users
  set bank_code = v_code,
      bank_name = v_name,
      branch_name = v_branch,
      bank_account_number = p_account_cipher,
      bank_account_mask = p_account_mask,
      bank_account_holder = v_holder
  where id = v_uid;
  if not found then raise exception 'bank_unauthenticated'; end if;
end $$;

-- Admin: the stored (encrypted) account number of one user, for the web server to
-- decrypt when an admin asks to reveal it. Never returns the plaintext itself.
create or replace function admin_user_bank_secret(p_user_id uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select bank_account_number into v from users where id = p_user_id;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Admin order list + detail, so refund / hold / service-completed are usable.
-- ---------------------------------------------------------------------------

create or replace function admin_list_payments(p_filter text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_rows jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_filter is not null and p_filter not in (
    'paid', 'pending', 'failed', 'cancelled', 'refund_requested', 'on_hold'
  ) then
    raise exception 'invalid_filter';
  end if;

  select coalesce(jsonb_agg(s.obj order by s.created_at desc, s.id), '[]'::jsonb)
  into v_rows
  from (
    select pay.created_at, pay.id, jsonb_build_object(
      'id', pay.id,
      'booking_id', b.id,
      'seeker_name', b.seeker_name,
      'companion_name', b.companion_name,
      'amount', pay.amount,
      'provider', pay.provider,
      'status', pay.status,
      'refund_status', pay.refund_status,
      'settlement_status', pay.settlement_status,
      'admin_hold', pay.admin_hold,
      'created_at', pay.created_at
    ) as obj
    from payments pay
    join bookings b on b.id = pay.booking_id
    where case
      when p_filter is null then true
      when p_filter = 'pending' then pay.status in (
        'created', 'redirected', 'processing', 'awaiting_payment'
      )
      when p_filter = 'failed' then pay.status = 'failed'
      when p_filter = 'cancelled' then pay.status = 'cancelled'
      when p_filter = 'paid' then pay.status = 'paid' and pay.refund_status = 'none'
      when p_filter = 'refund_requested' then pay.refund_status = 'refund_requested'
      when p_filter = 'on_hold' then pay.admin_hold = true
      else false
    end
  ) s;

  return v_rows;
end $$;

create or replace function admin_payment_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v jsonb;
  v_history jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'id', pay.id,
    'booking_id', b.id,
    'seeker_name', b.seeker_name,
    'companion_name', b.companion_name,
    'activity_slug', b.activity_slug,
    'scheduled_start', b.scheduled_start,
    'amount', pay.amount,
    'currency', pay.currency,
    'provider', pay.provider,
    'merchant_order_no', pay.merchant_order_no,
    'status', pay.status,
    'refund_status', pay.refund_status,
    'platform_fee_amount', pay.platform_fee_amount,
    'processing_fee_amount', pay.processing_fee_amount,
    'trainer_payable', pay.trainer_payable,
    'service_completed_at', pay.service_completed_at,
    'settlement_hold_until', pay.settlement_hold_until,
    'settlement_eligibility_status', pay.settlement_eligibility_status,
    'settlement_status', pay.settlement_status,
    'admin_hold', pay.admin_hold,
    'admin_hold_reason', pay.admin_hold_reason,
    'created_at', pay.created_at
  ) into v
  from payments pay
  join bookings b on b.id = pay.booking_id
  where pay.id = p_id;

  if v is null then raise exception 'payment_not_found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'event_type', e.event_type,
    'from_value', e.from_value,
    'to_value', e.to_value,
    'reason_note', e.reason_note,
    'actor_name', a.display_name,
    'created_at', e.created_at
  ) order by e.created_at asc), '[]'::jsonb) into v_history
  from payment_status_events e
  left join users a on a.id = e.actor_id
  where e.payment_id = p_id;

  return v || jsonb_build_object('history', v_history);
end $$;

revoke all on function save_bank_account(text, text, text, text, text) from public, anon;
revoke all on function my_bank_account() from public, anon;
revoke all on function admin_list_payments(text) from public, anon;
revoke all on function admin_payment_detail(uuid) from public, anon;
grant execute on function save_bank_account(text, text, text, text, text) to authenticated;
-- The plaintext save is retired: accounts are saved through the web server, which
-- encrypts them first (save_bank_account_encrypted).
revoke execute on function save_bank_account(text, text, text, text, text) from authenticated;
revoke all on function save_bank_account_encrypted(text, text, text, text, text, text) from public, anon;
grant execute on function save_bank_account_encrypted(text, text, text, text, text, text) to authenticated;
revoke all on function admin_user_bank_secret(uuid) from public, anon;
grant execute on function admin_user_bank_secret(uuid) to authenticated;
grant execute on function my_bank_account() to authenticated;
grant execute on function admin_list_payments(text) to authenticated;
grant execute on function admin_payment_detail(uuid) to authenticated;

-- Active plan, workout logs, and Home progress. "Today" is Asia/Taipei.
create or replace function app_today() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Taipei')::date;
$$;

create or replace function active_training_plan_id()
returns uuid
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select o.active_plan_id
       from user_onboarding o
       join user_training_plans p on p.id = o.active_plan_id
      where o.user_id = auth.uid()),
    (select p.id from user_training_plans p
      where p.user_id = auth.uid()
      order by p.created_at desc
      limit 1)
  );
$$;

create or replace function set_active_training_plan(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;

  insert into user_onboarding (user_id, active_plan_id)
  values (auth.uid(), p_id)
  on conflict (user_id) do update set active_plan_id = excluded.active_plan_id;
end $$;

create or replace function log_exercise_sets(
  p_plan_id uuid,
  p_week int,
  p_day_index int,
  p_slug text,
  p_sets jsonb,
  p_effort text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_set jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) > 12 then
    raise exception 'invalid sets';
  end if;
  for v_set in select * from jsonb_array_elements(p_sets) loop
    if jsonb_typeof(v_set) <> 'object'
      or coalesce((v_set ->> 'weightKg')::numeric, 0) not between 0 and 1000
      or coalesce((v_set ->> 'reps')::int, 0) not between 0 and 500 then
      raise exception 'invalid set';
    end if;
  end loop;
  if p_effort is not null and p_effort not in ('too_light', 'just_right', 'too_heavy') then
    raise exception 'invalid effort';
  end if;

  insert into workout_exercise_logs (user_id, plan_id, week, day_index, exercise_slug, performed_on, sets, effort)
  values (auth.uid(), p_plan_id, p_week, p_day_index, p_slug, app_today(), p_sets, p_effort)
  on conflict (user_id, plan_id, week, day_index, exercise_slug, performed_on) do update set
    sets = excluded.sets,
    effort = excluded.effort,
    updated_at = now();
end $$;

create or replace function workout_day_logs(p_plan_id uuid, p_week int, p_day_index int)
returns table (exercise_slug text, sets jsonb, effort text)
language sql security definer set search_path = public stable as $$
  select l.exercise_slug, l.sets, l.effort
  from workout_exercise_logs l
  where l.user_id = auth.uid()
    and l.plan_id = p_plan_id and l.week = p_week and l.day_index = p_day_index
    and l.performed_on = app_today();
$$;

create or replace function exercise_history(p_slug text, p_limit int default 3)
returns table (performed_on date, sets jsonb, effort text)
language sql security definer set search_path = public stable as $$
  select l.performed_on, l.sets, l.effort
  from workout_exercise_logs l
  where l.user_id = auth.uid() and l.exercise_slug = p_slug and l.performed_on < app_today()
    and jsonb_array_length(l.sets) > 0
  order by l.performed_on desc, l.updated_at desc
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
$$;

create or replace function complete_workout(p_plan_id uuid, p_week int, p_day_index int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_training_plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;
  insert into workout_sessions (user_id, plan_id, week, day_index, performed_on)
  values (auth.uid(), p_plan_id, p_week, p_day_index, app_today())
  on conflict (user_id, plan_id, week, day_index, performed_on) do nothing;
end $$;

-- With an active plan: target is that plan's training days, done is this week's
-- finished workouts (Mon–Sun, Asia/Taipei). Otherwise the manual target.
create or replace function weekly_progress()
returns jsonb
language sql security definer set search_path = public stable as $$
  with active as (
    select p.id, p.plan
    from user_training_plans p
    where p.id = active_training_plan_id()
  )
  select case
    when exists (select 1 from active) then (
      select jsonb_build_object(
        'source', 'plan',
        'planId', a.id,
        'target', (
          select count(*)
          from jsonb_array_elements(a.plan -> 'weeks' -> 0 -> 'days') d
          where coalesce((d ->> 'isRestDay')::boolean, false) = false
        ),
        'done', (
          select count(*)
          from workout_sessions s
          where s.user_id = auth.uid() and s.plan_id = a.id
            and s.performed_on >= date_trunc('week', app_today())::date
        )
      )
      from active a
    )
    else jsonb_build_object(
      'source', 'manual',
      'target', coalesce((select weekly_target from users where id = auth.uid()), 5),
      'done', (
        select count(*)
        from bookings
        where (seeker_id = auth.uid() or companion_id = auth.uid())
          and status = 'completed'
          and completed_at >= date_trunc('week', now())
      )
    )
  end;
$$;

revoke all on function app_today() from public, anon;
grant execute on function app_today() to authenticated;

-- Security hardening (final state): FK covering indexes + RPC ACL matrix.
-- Idempotent with the live apply_migration timestamps 20260921051016 / 026.
-- ---------------------------------------------------------------------------

create index if not exists payment_status_events_actor_id_idx
  on public.payment_status_events (actor_id);
create index if not exists payments_admin_hold_by_idx
  on public.payments (admin_hold_by);
create index if not exists verifications_activity_id_idx
  on public.verifications (activity_id);
create index if not exists withdrawal_requests_payment_id_idx
  on public.withdrawal_requests (payment_id);
create index if not exists withdrawal_settlements_payment_id_idx
  on public.withdrawal_settlements (payment_id);
create index if not exists withdrawal_status_events_actor_id_idx
  on public.withdrawal_status_events (actor_id);
create index if not exists user_onboarding_active_plan_idx on user_onboarding (active_plan_id);
create index if not exists workout_sessions_plan_idx on workout_sessions (plan_id);
create index if not exists workout_exercise_logs_plan_idx on workout_exercise_logs (plan_id);
create index if not exists notifications_booking_idx on notifications (booking_id);

-- Final ACL: revoke PUBLIC/anon/authenticated from every SECURITY DEFINER
-- function, then grant by audience. Payment/cron/internal stay service_role
-- (or trigger-only). Anon only gets public discovery RPCs.
do $$
declare
  r record;
  service_only text[] := array[
    'apply_newebpay_notification',
    'observe_newebpay_return',
    'apply_withdrawal_settlement',
    'undo_withdrawal_settlement',
    'expire_stale_payment_attempts',
    'mark_service_completed',
    'evaluate_settlement_eligibility',
    'run_settlement_cycle',
    'ensure_user_profile_row',
    'trainer_balance',
    'trainer_available_balance',
    'assert_account_deletable',
    'save_bank_account',
    'rls_auto_enable',
    'handle_new_user',
    'notify_booking_event',
    'recompute_listing_rating',
    'bump_conversation',
    'st_estimatedextent'
  ];
  anon_ok text[] := array[
    'recommended_companions',
    'companion_profile',
    'companion_offerings'
  ];
  trigger_only text[] := array[
    'handle_new_user',
    'notify_booking_event',
    'recompute_listing_rating',
    'bump_conversation',
    'rls_auto_enable',
    'st_estimatedextent'
  ];
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    if r.proname = any (service_only) or r.proname like 'st_%' then
      if r.proname = any (service_only) and not (r.proname = any (trigger_only)) then
        execute format('grant execute on function %s to service_role', r.sig);
      end if;
    else
      execute format('grant execute on function %s to authenticated', r.sig);
      if r.proname = any (anon_ok) then
        execute format('grant execute on function %s to anon', r.sig);
      end if;
    end if;
  end loop;
end $$;

-- PostGIS st_estimatedextent is owned by the extension owner. Best-effort
-- revoke; insufficient privilege is ignored. Reinstalling PostGIS into the
-- extensions schema is tracked separately.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'st_estimatedextent'
  loop
    begin
      execute format('revoke execute on function %s from public, anon', f);
    exception when insufficient_privilege then
      raise notice 'could not revoke anon execute on % (owned by the extension owner)', f;
    end;
  end loop;
end $$;
