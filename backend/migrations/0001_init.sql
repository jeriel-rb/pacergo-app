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

-- 健走 sits with the bookable activities. The rest of the catalog is
-- backend/seeds/01_activities.sql, which upserts this row again on reset.
insert into activities (slug, name_en, name_zh, icon, is_active) values
  ('walking', 'Walking', '健走', 'person-standing', true)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  icon = excluded.icon,
  is_active = excluded.is_active;

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
  doc_type text not null check (doc_type in ('certification', 'competition', 'id', 'application')),
  document_path text,
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

-- user_onboarding: the fitness profile, one row per user. Goal lives in
-- about_you, gym type in gym_equipment. A plan's own copy is
-- user_training_plans.onboarding_snapshot.
create table if not exists user_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
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

-- Set while a plan is being generated (begin_plan_generation), cleared when it
-- is saved (save_training_plan) — lets /ai-plan resume a build that a closed
-- tab interrupted instead of treating the user as having no plan.
alter table user_onboarding
  add column if not exists plan_generation_started_at timestamptz;

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
    home_area = coalesce(nullif(regexp_replace(btrim(p_city), '\s+', ' ', 'g'), ''), home_area),
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
    ),
    'application', (
      select jsonb_build_object('status', ver.status, 'notes', ver.notes)
      from verifications ver
      where ver.user_id = auth.uid() and ver.doc_type = 'application'
      order by ver.created_at desc
      limit 1
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
  v_status text := p_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_status not in ('draft', 'active', 'paused') then
    raise exception 'invalid status';
  end if;
  if char_length(coalesce(p_headline, '')) > 120 then raise exception 'headline too long'; end if;
  if char_length(coalesce(p_bio_long, '')) > 4000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_served_area, '')) > 120 then raise exception 'served area too long'; end if;

  -- Going live needs a price plan (any tier, including C). The home feed
  -- joins offerings, so an active listing with no plan never appears.
  -- A member is not a trainer until an admin approves the application
  -- (or a certification). Until then the listing cannot go live.
  if v_status = 'active' and not exists (
    select 1 from users where id = v_uid and is_companion
  ) then
    v_status := 'draft';
  end if;

  if v_status = 'active' and not exists (
    select 1 from listing_offerings o
    join companion_listings cl on cl.id = o.listing_id
    where cl.user_id = v_uid
  ) then
    raise exception 'setup_required';
  end if;

  insert into companion_listings (user_id, headline, bio_long, served_area, status)
  values (v_uid, p_headline, p_bio_long, p_served_area, v_status)
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
         o.training_preferences as ob_training_preferences
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
      'goal', u.ob_about_you ->> 'goal',
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

-- What an applicant filled in when asking to become a trainer: listing text,
-- price plans, and weekly slots. Admins read this from the trainer-request sheet.
create or replace function admin_trainer_application(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  return jsonb_build_object(
    'listing', (
      select jsonb_build_object(
        'headline', cl.headline,
        'bio_long', cl.bio_long,
        'served_area', cl.served_area,
        'status', cl.status
      )
      from companion_listings cl
      where cl.user_id = p_user_id
    ),
    'offerings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity', a.slug,
        'tier', lo.tier::text,
        'price_ntd', lo.price_ntd,
        'is_free', lo.is_free,
        'session_minutes', lo.session_minutes
      ) order by lo.created_at)
      from listing_offerings lo
      join companion_listings cl on cl.id = lo.listing_id
      join activities a on a.id = lo.activity_id
      where cl.user_id = p_user_id
    ), '[]'::jsonb),
    'availability', coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday', av.weekday,
        'start_minute', av.start_minute,
        'end_minute', av.end_minute
      ) order by av.weekday, av.start_minute)
      from availability av
      where av.user_id = p_user_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function admin_trainer_application(uuid) from public, anon;
grant execute on function admin_trainer_application(uuid) to authenticated;

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
  if p_doc_type in ('certification', 'competition') and btrim(coalesce(p_label, '')) = '' then
    raise exception 'certification name required';
  end if;

  if p_doc_type in ('certification', 'competition') then
    select id into v_activity from activities where slug = p_activity_slug;
    if not found then raise exception 'unknown activity'; end if;

    -- Submit for review is the only write into the trainer-request queue.
    -- A price plan and a bookable slot have to exist before that write.
    if not exists (
      select 1 from listing_offerings o
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = v_uid
    ) or not exists (
      select 1 from availability av where av.user_id = v_uid
    ) then
      raise exception 'setup_required';
    end if;
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
      'reviewed_at', ver.reviewed_at,
      'reviewer_name', reviewer.display_name
    ) as obj,
    case ver.status when 'pending' then 0 when 'approved' then 1 else 2 end as ord,
    ver.created_at
    from verifications ver
    join users u on u.id = ver.user_id
    left join activities a on a.id = ver.activity_id
    left join users reviewer on reviewer.id = ver.reviewed_by
    where ver.doc_type in ('certification', 'competition', 'application')

    union all

    -- Trainers added directly (trainer role) who never submitted a request.
    -- They are already trainers, so the queue shows them as approved rather
    -- than as a missing request. No verification row is inserted: an approved
    -- certification would unlock tier B/A offerings.
    select jsonb_build_object(
      'id', u.id,
      'user_id', u.id,
      'display_name', u.display_name,
      'photo_url', u.photo_url,
      'doc_type', null,
      'activity', null,
      'label', null,
      'document_path', null,
      'status', 'approved',
      'notes', null,
      'created_at', u.created_at,
      'reviewed_at', null,
      'reviewer_name', null
    ) as obj,
    1 as ord,
    u.created_at
    from users u
    where u.is_companion
      and not exists (
        select 1 from verifications ver
        where ver.user_id = u.id
          and ver.doc_type in ('certification', 'competition', 'application')
      )
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
declare
  v_ver verifications%rowtype;
  v_activity text;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  update verifications set
    status = p_status,
    notes = nullif(p_notes, ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id
  returning * into v_ver;
  if not found then raise exception 'verification not found'; end if;

  -- Approving a first trainer application, or a certification for someone who
  -- is not a trainer yet, is what grants the trainer role.
  if p_status = 'approved' and v_ver.doc_type in ('application', 'certification') then
    if not exists (select 1 from users where id = v_ver.user_id and is_companion) then
      update companion_listings
      set status = 'active'
      where user_id = v_ver.user_id and status = 'draft';
    end if;
    update users set is_companion = true where id = v_ver.user_id;
  end if;

  -- The home card reads the plan's tier. Approving a certification promotes
  -- that activity from C to B; approving competition proof promotes it to A.
  -- A price under the new floor is raised to the floor.
  if p_status = 'approved' and v_ver.doc_type = 'certification' and v_ver.activity_id is not null then
    update listing_offerings o
    set tier = 'B',
        price_ntd = greatest(o.price_ntd, 800)
    from companion_listings cl
    where o.listing_id = cl.id
      and cl.user_id = v_ver.user_id
      and o.activity_id = v_ver.activity_id
      and o.tier = 'C';
  end if;

  if p_status = 'approved' and v_ver.doc_type = 'competition' and v_ver.activity_id is not null then
    update listing_offerings o
    set tier = 'A',
        price_ntd = greatest(o.price_ntd, 1200)
    from companion_listings cl
    where o.listing_id = cl.id
      and cl.user_id = v_ver.user_id
      and o.activity_id = v_ver.activity_id
      and o.tier in ('B', 'C')
      and exists (
        select 1 from verifications cert
        where cert.user_id = v_ver.user_id
          and cert.activity_id = v_ver.activity_id
          and cert.doc_type = 'certification'
          and cert.status = 'approved'
      );
  end if;

  -- Tell the applicant. The payload carries the reviewer's reason so the
  -- notifications page can show why a request was rejected.
  select slug into v_activity from activities where id = v_ver.activity_id;
  insert into notifications (user_id, type, payload)
  values (
    v_ver.user_id,
    'verification_' || p_status,
    jsonb_build_object(
      'verification_id', v_ver.id,
      'status', p_status,
      'doc_type', v_ver.doc_type,
      'activity', v_activity,
      'label', v_ver.label,
      'notes', v_ver.notes
    )
  );
end $$;

-- upsert_my_listing: length caps for the free-text fields.;

create or replace function submit_trainer_application()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from listing_offerings o
    join companion_listings cl on cl.id = o.listing_id
    where cl.user_id = v_uid
  ) or not exists (
    select 1 from availability av where av.user_id = v_uid
  ) then
    raise exception 'setup_required';
  end if;
  if exists (
    select 1 from verifications
    where user_id = v_uid
      and doc_type = 'application'
      and status in ('pending', 'approved')
  ) then
    raise exception 'a submission for this is already pending or approved';
  end if;

  insert into verifications (user_id, doc_type, document_path, label, activity_id, status)
  values (v_uid, 'application', null, null, null, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

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
      'primary_activity', o.about_you ->> 'primaryActivity',
      'profile_level', o.training_preferences ->> 'experience',
      'profile_setup_status', u.profile_setup_status,
      'profile_setup_at', u.profile_setup_at,
      'signup_source', au.raw_user_meta_data ->> 'utm_medium',
      'is_companion', u.is_companion,
      'is_admin', u.is_admin,
      'created_at', u.created_at
    ) as obj
    from users u
    left join user_onboarding o on o.user_id = u.id
    left join auth.users au on au.id = u.id
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
    'processing_sum', coalesce(sum(amount) filter (where status = 'processing'), 0),
    'paid_count', count(*) filter (where status = 'paid'),
    'paid_sum', coalesce(sum(amount) filter (where status = 'paid'), 0)
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
    user_id, about_you, training_preferences, gym_equipment,
    nutrition, nutrition_status
  )
  values (
    auth.uid(), coalesce(p_about_you, '{}'::jsonb),
    coalesce(p_training_preferences, '{}'::jsonb), coalesce(p_gym_equipment, '{}'::jsonb),
    case when p_nutrition_status = 'built' then p_nutrition end,
    p_nutrition_status
  )
  on conflict (user_id) do update set
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
  on conflict (user_id) do update set
    active_plan_id = excluded.active_plan_id,
    plan_generation_started_at = null;

  return v_id;
end $$;


revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;
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


revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;
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


revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;
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
  -- An abandoned "new plan" build must not resurface after a deliberate delete.
  update user_onboarding set plan_generation_started_at = null where user_id = auth.uid();
end $$;

revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function my_training_plans() from public, anon, authenticated;
revoke all on function training_plan_detail(uuid) from public, anon, authenticated;
revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;
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

revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;

revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;

revoke all on function my_training_plans() from public, anon, authenticated;

revoke all on function training_plan_detail(uuid) from public, anon, authenticated;

revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;

grant execute on function save_training_plan(text, jsonb, jsonb) to authenticated;

grant execute on function my_training_plans() to authenticated;

grant execute on function training_plan_detail(uuid) to authenticated;

grant execute on function delete_training_plan(uuid) to authenticated;

revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;

revoke all on function save_training_plan(text, jsonb, jsonb) from public, anon, authenticated;

revoke all on function my_training_plans() from public, anon, authenticated;

revoke all on function training_plan_detail(uuid) from public, anon, authenticated;

revoke all on function delete_training_plan(uuid) from public, anon, authenticated;

grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;

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

-- Plan generation marker: begin_plan_generation() is called once the profile is
-- saved and just before the plan is built; save_training_plan clears it. If the
-- tab closes in between, plan_generation_in_progress() stays true for 10 minutes
-- so /ai-plan can resume the build; after that it's treated as abandoned.
create or replace function begin_plan_generation()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  insert into user_onboarding (user_id, plan_generation_started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set plan_generation_started_at = now();
end $$;

create or replace function plan_generation_in_progress()
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select o.plan_generation_started_at > now() - interval '10 minutes'
       from user_onboarding o
      where o.user_id = auth.uid()),
    false
  );
$$;

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

-- AI plan exercise catalog. Regenerated in place by generate-exercises-seed.mjs.
-- BEGIN ai_plan_exercises
-- AI Plan exercise library — GENERATED, do not edit by hand.
-- Regenerate with:  node apps/web/scripts/generate-exercises-seed.mjs
-- This block is the catalog load. It lives at the end of 0001_init.sql.
--
-- One row per illustrated exercise (295), keyed by the catalog slug (kebab-case),
-- built from:
--   apps/web/src/shared/assets/exercise-catalog.json   name, equipment, muscles
--   apps/web/src/shared/assets/exercise-names.zh.json  Traditional Chinese names
--   apps/web/src/shared/assets/exercise-content.json   steps + tips (295 of 295 written so far)
-- and the equipment rules in features/ai-plan/onboarding/equipment-exercises.ts.
--
-- Columns:
--   muscle_groups       the plan generator's muscle vocabulary (push/pull/legs pools)
--   equipment           onboarding equipment / cardio ids — ANY ONE unlocks the
--                       exercise; empty = needs no equipment
--   equipment_settings  gym types (large/small/garage/bodyweight) that can do it
--
-- Idempotent and replacing: it upserts every catalog row and DELETES any other
-- row (the old snake_case list), so running it on a live database swaps the old
-- exercise list for this one. Saved plans keep working — they store their own
-- copy of each exercise's name, and old slugs are resolved by the app.

insert into exercises
  (slug, name_en, name_zh, muscle_groups, equipment, equipment_settings,
   instructions_en, instructions_zh, tips_en, tips_zh)
values
('bench-press', 'Bench Press', '槓鈴臥推', array['chest', 'triceps', 'shoulders'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench, grip the bar slightly wider than shoulders.', 'Lower the bar to your mid-chest with control.', 'Press the bar back up to full arm extension.'], array['躺在訓練椅上，握距略寬於肩。', '控制節奏將槓下放至胸口中段。', '推回至手臂完全伸直。'], array['Keep your feet flat on the floor for a stable base.'], array['雙腳平踩地面以維持穩定支撐。']),
('incline-bench-press', 'Incline Bench Press', '槓鈴上斜臥推', array['upper_chest', 'shoulders', 'triceps'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Set the bench to a 30-45 degree incline.', 'Lower the bar to your upper chest.', 'Press back up to full extension.'], array['將訓練椅調整至30-45度上斜。', '將槓下放至上胸。', '推回至完全伸直。'], array['A steeper incline shifts more work to the shoulders.'], array['角度越大，肩膀參與的比例越高。']),
('incline-dumbbell-press', 'Incline Dumbbell Press', '啞鈴上斜臥推', array['upper_chest', 'shoulders', 'triceps'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Set the bench to a 30-45 degree incline.', 'Press the dumbbells up from chest level until arms extend.', 'Lower back down with control.'], array['將訓練椅調整至30-45度上斜。', '將啞鈴從胸口高度推起至手臂伸直。', '控制放下。'], array['Keep your shoulder blades pinned to the bench.'], array['肩胛骨全程貼緊椅面。']),
('dumbbell-bench-press', 'Dumbbell Bench Press', '啞鈴臥推', array['chest', 'triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench holding a dumbbell in each hand at chest level.', 'Press the dumbbells up until arms are extended.', 'Lower back down with control.'], array['躺在訓練椅上，雙手各持啞鈴於胸口高度。', '將啞鈴推至手臂伸直。', '控制放下。'], array['Keep a slight arc rather than a straight vertical path.'], array['推起路徑保持些微弧線，而非完全垂直。']),
('decline-bench-press', 'Decline Bench Press', '下斜槓鈴臥推', array['lower_chest', 'triceps', 'shoulders'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a decline bench, feet locked in, grip the bar just wider than shoulders.', 'Lower the bar to your lower chest with control.', 'Press the bar back up until your arms are straight.'], array['躺在下斜訓練椅上，雙腳固定，握距略寬於肩。', '控制節奏將槓下放至下胸。', '推回至手臂完全伸直。'], array['Use a spotter or safety arms — the bar path is harder to bail from.'], array['建議有人保護或使用安全架，因為下斜角度較難中途放棄。']),
('machine-chest-press', 'Machine Chest Press', '坐姿胸推機', array['chest', 'triceps', 'shoulders'], array['chest_press_machine'], array['large_gym'], array['Sit in the machine, grips at chest height.', 'Press the handles forward until arms extend.', 'Return with control back to the start.'], array['坐在機台上，把手位於胸口高度。', '將把手向前推至手臂伸直。', '控制回到起始位置。'], array['Keep your back flat against the pad throughout.'], array['背部全程貼緊椅背。']),
('pec-deck', 'Pec Deck', '蝴蝶機夾胸', array['chest', 'shoulders'], array['pec_deck'], array['large_gym'], array['Sit in the machine, forearms against the pads.', 'Bring the pads together in front of your chest.', 'Return with control to the start.'], array['坐在機台上，前臂靠在滾墊上。', '將滾墊在胸前夾攏。', '控制回到起始位置。'], array['Avoid slamming the pads together — control the squeeze.'], array['避免用力甩動夾合，控制夾胸力道。']),
('cable-fly', 'Cable Fly', '滑輪夾胸', array['chest', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Set both pulleys at chest height and stand centered with a slight forward lean.', 'With soft elbows, bring the handles together in front of your chest in a wide arc.', 'Return slowly until you feel a stretch across your chest.'], array['將兩側滑輪調至胸口高度，站在中間並微微前傾。', '手肘微彎，以大弧線將把手在胸前合攏。', '緩慢放回，直到胸部有伸展感。'], array['Keep the same elbow bend the whole set — this is a fly, not a press.'], array['全程維持相同的手肘彎曲角度，這是夾胸而不是推舉。']),
('push-up', 'Push-up', '伏地挺身', array['chest', 'triceps', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank, hands under shoulders.', 'Lower your chest toward the floor, elbows near 45 degrees.', 'Press back up without locking your elbows hard.'], array['雙手撐地與肩同寬，呈高棒式。', '手肘約呈45度，將胸口下壓靠近地面。', '推回起始位置，手肘不要完全鎖死。'], array['Keep a straight line from head to heels throughout.'], array['全程保持頭到腳跟呈一直線。']),
('weighted-push-up', 'Weighted Push-up', '負重伏地挺身', array['chest', 'triceps', 'core'], array['plates'], array['large_gym', 'small_gym', 'garage_gym'], array['Start in a high plank with a weight plate or vest secured on your upper back.', 'Lower your chest toward the floor, elbows near 45 degrees.', 'Press back up to full arm extension.'], array['呈高棒式，將槓片或負重背心穩固地放在上背。', '手肘約呈45度，將胸口下壓靠近地面。', '推回至手臂完全伸直。'], array['Only add weight once you can do 15 clean bodyweight push-ups.'], array['能標準完成15下徒手伏地挺身後，再增加負重。']),
('overhead-press', 'Overhead Press', '槓鈴肩推', array['shoulders', 'triceps'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold the bar at shoulder height, hands just outside shoulders.', 'Press the bar straight overhead until arms are locked out.', 'Lower back to shoulder height with control.'], array['將槓置於肩膀高度，握距略寬於肩。', '將槓直直推至頭頂上方伸直。', '控制放下回到肩膀高度。'], array['Brace your core to avoid over-arching your lower back.'], array['繃緊核心，避免下背過度後仰。']),
('seated-dumbbell-press', 'Dumbbell Seated Shoulder Press', '啞鈴肩推', array['shoulders', 'triceps'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand at shoulder height.', 'Press both dumbbells overhead until arms are extended.', 'Lower back to shoulder height with control.'], array['雙手各持啞鈴於肩膀高度。', '將啞鈴向上推至手臂伸直。', '控制放下回到肩膀高度。'], array['Avoid arching your lower back to press the weight up.'], array['避免用下背過度後仰來推起重量。']),
('arnold-press', 'Arnold Press', '阿諾肩推', array['shoulders', 'triceps'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold dumbbells at chest height with palms facing you.', 'Press up while rotating your palms to face forward.', 'Reverse the rotation as you lower back to the start.'], array['雙手持啞鈴於胸前，掌心朝向自己。', '向上推的同時將掌心轉為朝前。', '下放時反向旋轉，回到起始位置。'], array['Use lighter weights than a regular shoulder press — the rotation adds range.'], array['重量比一般肩推輕一些，因為旋轉增加了動作範圍。']),
('lateral-raise', 'Lateral Raise', '啞鈴側平舉', array['shoulders', 'upper_back'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand at your sides.', 'Raise both arms out to the sides until shoulder height.', 'Lower back down with control.'], array['雙手各持啞鈴放在身體兩側。', '將雙臂向外側抬起至肩膀高度。', '控制放下。'], array['Use a light weight — this is a shoulder isolation move.'], array['使用較輕的重量，這是肩部孤立訓練動作。']),
('cable-lateral-raise', 'Cable Lateral Raise', '滑輪側平舉', array['shoulders', 'upper_back'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand between two low pulleys with a handle in each hand, arms at your sides.', 'Raise both arms out to the sides to shoulder height.', 'Lower back down with control.'], array['站在兩個低位滑輪之間，雙手各握一個把手，手臂放在身體兩側。', '將雙臂向外側抬起至肩膀高度。', '控制放下。'], array['The cable keeps tension on your shoulder throughout the range.'], array['滑輪能讓肩部全程維持張力。']),
('front-raise', 'Front Raise', '前平舉', array['shoulders', 'chest'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand tall holding dumbbells in front of your thighs.', 'Raise both arms straight forward to shoulder height.', 'Lower slowly back to the start.'], array['站直，雙手持啞鈴放於大腿前方。', '將雙臂向前平舉至肩膀高度。', '緩慢放回起始位置。'], array['Don''t swing your torso — keep your core braced.'], array['避免身體甩動借力，核心保持繃緊。']),
('rear-delt-fly', 'Rear Delt Fly', '後三角飛鳥', array['rear_delts', 'upper_back'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hinge forward at the hips with a flat back, dumbbells hanging below your chest.', 'Raise both arms out to the sides with a slight elbow bend.', 'Lower with control.'], array['髖部前傾、背部打平，啞鈴垂在胸口下方。', '手肘微彎，將雙臂向兩側抬起。', '控制放下。'], array['Pinch your shoulder blades lightly at the top — don''t shrug.'], array['頂端輕輕夾緊肩胛，但不要聳肩。']),
('reverse-pec-deck', 'Reverse Pec Deck', '蝴蝶機反向飛鳥', array['rear_delts', 'upper_back'], array['pec_deck'], array['large_gym'], array['Sit facing the pad, chest supported, grips at shoulder height.', 'Pull the handles back and out until your arms are in line with your shoulders.', 'Return slowly without letting the weights touch.'], array['面向椅墊坐好，胸口靠住，把手位於肩膀高度。', '向後向外拉開把手，直到手臂與肩同高。', '緩慢放回，重量片不要碰撞。'], array['Lead with your elbows, not your hands.'], array['以手肘帶動，而不是用手掌拉。']),
('face-pull', 'Face Pull', '滑輪臉拉', array['upper_back', 'rear_delts', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Set a rope attachment at upper-chest height.', 'Pull the rope toward your face, elbows flaring out wide.', 'Return with control to the start.'], array['將繩索把手設置於上胸高度。', '將繩索拉向臉部，手肘向外展開。', '控制放回起始位置。'], array['Great for shoulder health and posture.'], array['對肩關節健康與體態有良好幫助。']),
('upright-row', 'Upright Row', '直立划船', array['shoulders', 'upper_back', 'biceps'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a bar with a shoulder-width grip in front of your thighs.', 'Pull the bar up along your body to lower-chest height, elbows leading.', 'Lower with control.'], array['以與肩同寬的握距持槓於大腿前方。', '沿身體將槓拉至下胸高度，手肘帶領。', '控制放下。'], array['Stop at chest height — pulling higher can irritate the shoulders.'], array['拉到胸口高度即可，拉更高可能刺激肩關節。']),
('deadlift', 'Deadlift', '槓鈴硬舉', array['hamstrings', 'glutes', 'lower_back', 'back', 'forearms'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with the bar over mid-foot, grip just outside your legs.', 'Hinge at the hips, keeping your back flat, and lift the bar close to your body.', 'Stand tall, then lower the bar back down with control.'], array['站在槓鈴前，槓在腳掌中段上方，雙手握在腿外側。', '髖部後推，背部打平，將槓貼近身體拉起。', '站直後控制放下槓鈴。'], array['Keep the bar in contact with your legs throughout the lift.'], array['全程讓槓鈴貼近腿部移動。']),
('romanian-deadlift', 'Romanian Deadlift', '羅馬尼亞硬舉', array['hamstrings', 'glutes', 'lower_back'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold the bar at hip height, knees slightly bent.', 'Hinge at the hips, sliding the bar down your legs.', 'Feel a stretch in your hamstrings, then drive hips forward to stand.'], array['雙手握槓於髖部高度，膝蓋微彎。', '髖部後推，讓槓貼腿下滑。', '感受到腿後側伸展後，推髖站直。'], array['Keep the bar close to your legs the entire time.'], array['槓鈴全程貼近腿部移動。']),
('barbell-row', 'Barbell Row', '槓鈴俯身划船', array['back', 'biceps', 'rear_delts'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hinge forward at the hips holding the bar, back flat.', 'Pull the bar toward your lower ribs.', 'Lower with control back to the start.'], array['髖部前傾握槓，背部打平。', '將槓拉向下肋骨處。', '控制放下回到起始位置。'], array['Avoid using momentum — pull with your back, not a swing.'], array['避免借力擺盪，靠背部肌肉發力拉起。']),
('t-bar-row', 'T-Bar Row', 'T 槓划船', array['back', 'biceps', 'rear_delts'], array['row_machine'], array['large_gym'], array['Stand over the bar with knees bent, back flat, chest supported if the machine allows.', 'Pull the handle toward your lower chest, squeezing your shoulder blades.', 'Lower slowly to a full stretch.'], array['站在槓上方，膝蓋微彎、背部打平，若機台有胸墊則靠住。', '將把手拉向下胸，夾緊肩胛。', '緩慢放下至完全伸展。'], array['Keep your neck neutral — look at the floor, not forward.'], array['頸部保持中立，視線看向地面而非正前方。']),
('dumbbell-bent-over-row', 'Dumbbell Bent Over Row', '啞鈴俯身划船', array['back', 'biceps', 'rear_delts'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hinge at the hips with a flat back, a dumbbell in each hand hanging straight down.', 'Row both dumbbells toward your lower ribs.', 'Lower with control.'], array['髖部後推、背部打平，雙手各持一顆啞鈴自然下垂。', '將兩顆啞鈴同時拉向下肋骨。', '控制放下。'], array['Keep your torso still — if it rises, the weight is too heavy.'], array['軀幹保持固定，若身體被帶起代表重量太重。']),
('one-arm-dumbbell-row', 'One-Arm Dumbbell Row', '啞鈴划船', array['back', 'biceps'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Place one knee and hand on a bench, other foot on the floor.', 'Pull the dumbbell toward your hip, elbow close to your body.', 'Lower with control, then repeat, and switch sides.'], array['一膝一手撐在訓練椅上，另一腳踩地。', '將啞鈴拉向髖部，手肘貼近身體。', '控制放下，重複後換邊。'], array['Keep your back flat rather than rounding it.'], array['背部保持打平，避免拱背。']),
('chest-supported-row', 'Chest Supported Row', '胸靠式划船', array['back', 'biceps', 'rear_delts'], array['chest_supported_row_machine'], array['large_gym'], array['Lie or sit with your chest against the pad and grip the handles.', 'Pull your elbows back, squeezing your shoulder blades together.', 'Return slowly to a full stretch.'], array['胸口貼緊椅墊，雙手握住把手。', '將手肘向後拉，夾緊肩胛。', '緩慢放回至完全伸展。'], array['The pad removes momentum — keep your chest on it the whole set.'], array['胸墊能避免借力，全程胸口不要離開。']),
('seated-row', 'Seated Cable Row', '坐姿滑輪划船', array['back', 'biceps', 'rear_delts'], array['cable_machine'], array['large_gym', 'small_gym'], array['Sit at the cable row station, knees slightly bent, grip the handle.', 'Pull the handle toward your torso, squeezing your shoulder blades.', 'Extend your arms back out with control.'], array['坐在划船機前，膝蓋微彎，握住把手。', '將把手拉向軀幹，夾緊肩胛骨。', '控制伸直手臂放回。'], array['Keep your torso upright rather than rocking back and forth.'], array['軀幹保持直立，避免前後晃動借力。']),
('machine-row', 'Machine Row', '器械划船', array['back', 'biceps'], array['row_machine'], array['large_gym'], array['Sit with your chest against the pad and grip the handles.', 'Pull the handles toward your torso, elbows close to your body.', 'Extend your arms back with control.'], array['坐好，胸口貼緊椅墊，雙手握住把手。', '將把手拉向軀幹，手肘貼近身體。', '控制伸直手臂放回。'], array['Think about pulling with your back, not your hands.'], array['意識上用背部發力，而不是手。']),
('lat-pulldown', 'Lat Pulldown', '滑輪下拉', array['lats', 'biceps'], array['lat_pulldown'], array['large_gym', 'small_gym'], array['Sit at the machine, grip the bar wider than shoulders.', 'Pull the bar down to your upper chest, elbows driving down.', 'Let the bar rise back up with control.'], array['坐在機台上，握距寬於肩。', '將把手下拉至上胸，手肘向下發力。', '控制讓把手回升。'], array['Avoid leaning back excessively to move more weight.'], array['避免過度後仰以拉起更重的重量。']),
('close-grip-lat-pulldown', 'Close-Grip Lat Pulldown', '窄握滑輪下拉', array['lats', 'biceps'], array['lat_pulldown'], array['large_gym', 'small_gym'], array['Sit at the pulldown station and grip the close-grip handle with palms facing each other.', 'Pull the handle to your upper chest, driving your elbows down.', 'Let it rise slowly until your arms are straight.'], array['坐在下拉機前，雙手掌心相對握住窄握把手。', '將把手拉至上胸，手肘向下發力。', '緩慢讓把手回升至手臂伸直。'], array['Lean back only slightly — don''t turn it into a row.'], array['身體只需微微後仰，避免變成划船動作。']),
('straight-arm-pulldown', 'Straight-Arm Pulldown', '直臂下拉', array['lats', 'core'], array['lat_pulldown'], array['large_gym', 'small_gym'], array['Stand facing a high pulley, grip the bar with straight arms and hinge slightly forward.', 'Sweep the bar down to your thighs, keeping your arms almost straight.', 'Return slowly until you feel the lats stretch.'], array['面向高位滑輪站立，手臂伸直握住把手，身體微微前傾。', '手臂保持接近伸直，將把手向下劃至大腿。', '緩慢放回，直到背闊肌有伸展感。'], array['This isolates the lats — use a lighter weight than a pulldown.'], array['這是背闊肌的孤立動作，重量要比下拉輕。']),
('pull-up', 'Pull-up', '引體向上', array['lats', 'biceps', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a pull-up bar, hands wider than shoulders, palms facing away.', 'Pull yourself up until your chin clears the bar.', 'Lower back down with control to a full hang.'], array['雙手掌心朝外，握距寬於肩，懸掛於單槓上。', '將身體拉起，直到下巴超過單槓。', '控制放下回到完全懸掛。'], array['Use a resistance band or assisted machine if you can''t yet do a full rep.'], array['若尚無法完整完成，可用彈力帶或輔助機輔助。']),
('assisted-pull-up', 'Assisted Pull-up', '輔助引體向上', array['lats', 'biceps'], array['assisted_machine'], array['large_gym'], array['Kneel or stand on the platform, choose the assistance weight, and grip the bars.', 'Pull yourself up until your chin clears the bar.', 'Lower with control to straight arms.'], array['跪或站在踏板上，設定輔助重量並握住把手。', '將身體拉起，直到下巴超過橫桿。', '控制放下至手臂伸直。'], array['Reduce the assistance over time until you can do it unassisted.'], array['逐漸減少輔助重量，直到能獨立完成。']),
('weighted-pull-up', 'Weighted Pull-up', '負重引體向上', array['lats', 'biceps'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Attach weight to a belt, hang from the bar with hands wider than shoulders.', 'Pull up until your chin clears the bar.', 'Lower with control to a full hang.'], array['以腰帶掛上負重，雙手寬於肩懸掛在單槓上。', '拉起身體，直到下巴超過單槓。', '控制放下回到完全懸掛。'], array['Only add weight once you can do 10 strict bodyweight pull-ups.'], array['能標準完成10下徒手引體向上後再加重。']),
('chin-up', 'Chin-up', '反手引體向上', array['biceps', 'lats'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a bar, palms facing you, hands shoulder-width.', 'Pull yourself up until your chin clears the bar.', 'Lower back down with control.'], array['雙手掌心朝自己，與肩同寬，懸掛於單槓上。', '將身體拉起，直到下巴超過單槓。', '控制放下。'], array['Emphasizes biceps more than a standard pull-up.'], array['比一般引體向上更加強化二頭肌。']),
('shrug', 'Barbell Shrug', '槓鈴聳肩', array['upper_back', 'forearms'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a barbell in front of your thighs, arms straight.', 'Lift your shoulders straight up toward your ears.', 'Pause, then lower slowly.'], array['雙手持槓於大腿前方，手臂伸直。', '將肩膀直直向上聳向耳朵。', '停頓後緩慢放下。'], array['Move straight up and down — don''t roll your shoulders.'], array['上下垂直移動，不要轉動肩膀。']),
('squat', 'Squat', '槓鈴後蹲舉', array['quads', 'glutes', 'core'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Set the bar across your upper back, feet shoulder-width.', 'Bend your knees and hips to squat until thighs are parallel.', 'Drive through your heels to stand back up.'], array['將槓鈴置於上背，雙腳與肩同寬。', '屈膝屈髖蹲下，直到大腿與地面平行。', '用腳跟發力站起。'], array['Brace your core hard before descending.'], array['下蹲前先繃緊核心。']),
('front-squat', 'Front Squat', '槓鈴前蹲舉', array['quads', 'core', 'glutes'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Rest the bar across the front of your shoulders, elbows high.', 'Squat down keeping your torso upright.', 'Drive up through your heels to standing.'], array['將槓鈴置於前肩，手肘抬高。', '蹲下同時保持軀幹直立。', '用腳跟發力站起。'], array['A more upright torso protects your lower back.'], array['軀幹越直立，越能保護下背部。']),
('hack-squat', 'Hack Squat', '哈克深蹲', array['quads', 'glutes'], array['hack_squat_machine'], array['large_gym'], array['Place your back on the pad and feet shoulder-width on the platform.', 'Lower until your thighs are parallel or lower.', 'Press through your whole foot to stand back up.'], array['背靠椅墊，雙腳與肩同寬踩在踏板上。', '下蹲至大腿與地面平行或更低。', '用整個腳掌發力站起。'], array['Feet lower on the platform emphasize the quads more.'], array['雙腳踩得越低，股四頭肌參與越多。']),
('leg-press', 'Leg Press', '腿推機', array['quads', 'glutes', 'hamstrings'], array['leg_press'], array['large_gym', 'small_gym'], array['Sit in the machine, feet shoulder-width on the platform.', 'Lower the platform by bending your knees toward your chest.', 'Press back up without locking your knees hard.'], array['坐在機台上，雙腳與肩同寬踩在踏板上。', '屈膝讓踏板下降靠近胸口。', '推回，膝蓋不完全鎖死。'], array['Keep your lower back flat against the pad.'], array['下背全程貼緊椅背。']),
('bulgarian-split-squat', 'Bulgarian Split Squat', '保加利亞分腿蹲', array['quads', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Rest your back foot on a bench behind you, dumbbells at your sides.', 'Lower straight down until your front thigh is parallel to the floor.', 'Drive through the front heel to stand, then switch legs.'], array['後腳放在身後的訓練椅上，雙手持啞鈴垂於身側。', '垂直下蹲，直到前腿大腿與地面平行。', '用前腳腳跟發力站起，之後換腳。'], array['Step far enough forward that your front knee stays over your ankle.'], array['前腳跨遠一些，讓膝蓋保持在腳踝上方。']),
('walking-lunge', 'Walking Lunge', '走動式弓箭步', array['quads', 'glutes', 'hamstrings'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Step forward into a lunge, back knee toward the floor.', 'Push through the front heel to stand and step the back foot forward.', 'Repeat, alternating legs as you move forward.'], array['向前跨步蹲下，後膝接近地面。', '用前腳跟發力站起，將後腳向前跨出。', '重複動作，左右腳交替向前移動。'], array['Keep your torso upright rather than leaning forward.'], array['軀幹保持直立，避免向前傾。']),
('step-up', 'Step-Up', '啞鈴登階', array['quads', 'glutes'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand, stand facing a bench.', 'Step one foot fully onto the bench and drive up to standing.', 'Step back down with control, then repeat, alternating legs.'], array['雙手各持啞鈴，面對訓練椅站立。', '單腳完全踏上椅面並發力站起。', '控制退回，重複並交替雙腳。'], array['Choose a bench height where your knee stays behind your toes.'], array['選擇讓膝蓋不超過腳尖的椅面高度。']),
('leg-extension', 'Leg Extension', '腿部伸展機', array['quads'], array['leg_extension_machine'], array['large_gym'], array['Sit in the machine, shins behind the pad.', 'Extend your legs until straight, squeezing your quads.', 'Lower back down with control.'], array['坐在機台上，小腿放在滾墊後方。', '將雙腿伸直，用力夾緊股四頭肌。', '控制放下。'], array['Avoid swinging the weight — control the full range.'], array['避免借力甩動，全程控制動作範圍。']),
('leg-curl', 'Leg Curl', '腿部彎舉機', array['hamstrings', 'calves'], array['leg_curl_machine'], array['large_gym'], array['Lie or sit in the machine, pad behind your ankles.', 'Curl your legs toward your glutes.', 'Extend back out with control.'], array['躺姿或坐姿於機台上，滾墊置於腳踝後方。', '將雙腳彎舉靠向臀部。', '控制伸直放回。'], array['Squeeze at the top of the movement briefly.'], array['在動作最高點稍作停留夾緊。']),
('seated-leg-curl', 'Seated Leg Curl', '坐姿腿彎舉', array['hamstrings', 'calves'], array['leg_curl_machine'], array['large_gym'], array['Sit with the pad above your heels and the lap pad snug on your thighs.', 'Curl your legs down and back as far as you can.', 'Return slowly.'], array['坐好，滾墊位於腳跟上方，大腿壓墊固定。', '盡量將雙腿向下向後彎舉。', '緩慢放回。'], array['Keep your hips pressed into the seat.'], array['髖部全程貼緊座椅。']),
('hip-thrust', 'Hip Thrust', '槓鈴臀推', array['glutes', 'hamstrings'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit with upper back against a bench, bar over your hips.', 'Drive your hips up until your body forms a straight line.', 'Lower back down with control.'], array['上背靠在訓練椅上，槓鈴置於髖部上方。', '將髖部往上推，直到身體呈一直線。', '控制放下。'], array['Squeeze your glutes hard at the top of each rep.'], array['每一下在最高點用力夾緊臀部。']),
('glute-bridge', 'Glute Bridge', '臀橋', array['glutes', 'hamstrings'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back, knees bent, feet flat on the floor.', 'Squeeze your glutes and lift your hips toward the ceiling.', 'Lower back down with control.'], array['仰躺，屈膝，雙腳平放地面。', '夾緊臀部，將髖部向上抬起。', '控制節奏放下。'], array['Pause and squeeze at the top for a full second.'], array['在最高點停頓並夾緊臀部一秒。']),
('good-morning', 'Good Morning', '早安體前屈', array['hamstrings', 'glutes', 'lower_back'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Place a bar across your upper back, feet shoulder-width, knees slightly bent.', 'Hinge at the hips, pushing them back until your torso is near parallel to the floor.', 'Drive your hips forward to stand tall.'], array['將槓置於上背，雙腳與肩同寬，膝蓋微彎。', '髖部向後推，讓上身接近與地面平行。', '推髖向前，站直。'], array['Keep your back flat and use a light weight until the hinge feels natural.'], array['背部保持打平，在熟悉髖鉸鏈前使用較輕重量。']),
('standing-calf-raise', 'Standing Calf Raise', '站姿提踵機', array['calves'], array['calf_machine'], array['large_gym'], array['Stand in the machine, shoulders under the pads.', 'Rise onto the balls of your feet as high as possible.', 'Lower back down slowly for a full stretch.'], array['站在機台上，肩膀頂住肩墊。', '盡量踮起腳尖向上抬高。', '緩慢放下至充分伸展。'], array['Keep your knees nearly straight throughout.'], array['全程膝蓋保持接近伸直。']),
('seated-calf-raise', 'Seated Calf Raise', '坐姿提踵機', array['calves'], array['calf_machine'], array['large_gym'], array['Sit in the machine, pads on your lower thighs.', 'Rise onto the balls of your feet as high as possible.', 'Lower back down slowly for a full stretch.'], array['坐在機台上，滾墊壓在大腿下段。', '盡量踮起腳尖向上抬高。', '緩慢放下至充分伸展。'], array['Pause briefly at the top for a stronger contraction.'], array['在最高點稍作停留以加強收縮。']),
('bicep-curl', 'Bicep Curl', '啞鈴二頭彎舉', array['biceps', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand, arms extended, palms forward.', 'Curl the dumbbells up toward your shoulders.', 'Lower back down with control.'], array['雙手各持啞鈴，手臂伸直，掌心朝前。', '將啞鈴彎舉至肩膀方向。', '控制放下。'], array['Keep your elbows pinned to your sides throughout.'], array['全程手肘貼緊身體兩側。']),
('hammer-curl', 'Hammer Curl', '啞鈴槌式彎舉', array['biceps', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand, palms facing each other.', 'Curl the dumbbells up keeping palms facing inward.', 'Lower back down with control.'], array['雙手各持啞鈴，掌心相對。', '彎舉時掌心持續朝內。', '控制放下。'], array['Great variation for building forearm strength too.'], array['也是強化前臂力量的良好變化動作。']),
('preacher-curl', 'Preacher Curl', '牧師椅彎舉', array['biceps', 'forearms'], array['preacher_bench'], array['large_gym'], array['Sit with your upper arms flat on the pad and grip the bar underhand.', 'Curl the bar up toward your shoulders.', 'Lower slowly until your arms are almost straight.'], array['坐好，上臂平放在牧師椅墊上，反手握槓。', '將槓彎舉至肩膀方向。', '緩慢放下至手臂接近伸直。'], array['Don''t fully lock your elbows at the bottom.'], array['底部時手肘不要完全鎖死。']),
('cable-curl', 'Cable Curl', '滑輪二頭彎舉', array['biceps', 'forearms'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand facing the low pulley, grip the bar underhand.', 'Curl the bar up toward your shoulders.', 'Lower back down with control.'], array['面對低位滑輪站立，反手握把手。', '將把手彎舉至肩膀方向。', '控制放下。'], array['The cable keeps tension on your biceps throughout.'], array['滑輪能讓二頭肌全程維持張力。']),
('reverse-curl', 'Reverse Curl', '反握彎舉', array['forearms', 'biceps'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a bar with an overhand grip, arms extended in front of your thighs.', 'Curl the bar up toward your shoulders keeping your wrists straight.', 'Lower slowly.'], array['正手握槓，手臂在大腿前伸直。', '保持手腕平直，將槓彎舉至肩膀方向。', '緩慢放下。'], array['Use a lighter weight than a normal curl — the forearms fatigue first.'], array['重量比一般彎舉輕，因為前臂會先疲勞。']),
('wrist-curl', 'Wrist Curl', '腕彎舉', array['forearms'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit with your forearms on your thighs, palms up, holding a bar with your wrists past your knees.', 'Curl your hands up by bending only your wrists.', 'Lower slowly to a full stretch.'], array['坐好，前臂放在大腿上、掌心向上，手腕伸出膝蓋外握槓。', '只用手腕彎曲將手向上捲起。', '緩慢放下至完全伸展。'], array['Use light weight and higher reps to protect your wrists.'], array['使用輕重量與較高次數以保護手腕。']),
('tricep-pushdown', 'Tricep Pushdown', '滑輪三頭下壓', array['triceps', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand at the cable station, grip the bar with elbows at your sides.', 'Push the bar down until your arms are fully extended.', 'Let the bar rise back up with control.'], array['站在滑輪機前，握住把手，手肘貼於身側。', '將把手下壓至手臂完全伸直。', '控制讓把手回升。'], array['Keep your elbows pinned — only your forearms move.'], array['手肘固定不動，僅前臂移動。']),
('overhead-tricep-extension', 'Overhead Tricep Extension', '繩索頭上三頭伸展', array['triceps', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand facing away from a low pulley with a rope, arms overhead.', 'Extend your arms forward and up until straight.', 'Bend back with control to the start.'], array['背對低位滑輪站立，握繩索，雙臂舉過頭頂。', '將雙臂向前上方伸直。', '控制彎回起始位置。'], array['Keep your elbows close to your head throughout.'], array['手肘全程貼近頭部兩側。']),
('skull-crusher', 'Skull Crusher', '仰臥臂屈伸', array['triceps', 'shoulders'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench holding a bar over your chest with straight arms.', 'Bend only your elbows to lower the bar toward your forehead.', 'Extend your arms back up.'], array['躺在訓練椅上，手臂伸直將槓舉在胸口上方。', '只彎曲手肘，將槓下放向額頭。', '伸直手臂推回。'], array['Keep your upper arms still and elbows pointing to the ceiling.'], array['上臂保持不動，手肘朝向天花板。']),
('close-grip-bench-press', 'Close-Grip Bench Press', '窄握臥推', array['triceps', 'chest', 'shoulders'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench, grip the bar shoulder-width or slightly narrower.', 'Lower the bar to your lower chest, elbows close to your body.', 'Press back up to full extension.'], array['躺在訓練椅上，握距與肩同寬或略窄。', '將槓下放至下胸，手肘貼近身體。', '推回至完全伸直。'], array['Focuses more triceps work than a standard bench press.'], array['比一般臥推更加強化三頭肌。']),
('dip', 'Dip', '雙槓撐體', array['triceps', 'chest', 'shoulders'], array['dip_station'], array['large_gym', 'small_gym', 'garage_gym'], array['Support yourself on parallel bars with straight arms, torso upright.', 'Lower your body by bending your elbows until your upper arms are parallel to the floor.', 'Press back up to straight arms.'], array['雙手撐在雙槓上，手臂伸直，身體直立。', '屈肘下降，直到上臂與地面平行。', '推回至手臂伸直。'], array['Stay upright for triceps; lean forward to shift work to the chest.'], array['身體直立偏重三頭肌，前傾則偏重胸肌。']),
('assisted-dip', 'Assisted Dip', '輔助撐體機', array['triceps', 'chest'], array['assisted_machine'], array['large_gym'], array['Kneel on the platform, grip the handles at your sides.', 'Lower your body by bending your elbows.', 'Press back up until arms extend.'], array['跪在輔助踏板上，雙手握住把手。', '屈肘下降身體。', '推回至手臂伸直。'], array['Increase the counterweight for more assistance as needed.'], array['可依需求增加配重以獲得更多輔助。']),
('plank', 'Plank', '棒式', array['abs', 'core', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Support your body on forearms and toes.', 'Keep your body in a straight line from head to heels.', 'Hold, breathing steadily, without letting hips sag.'], array['以前臂與腳尖支撐身體。', '保持頭到腳跟呈一直線。', '穩定呼吸並維持，避免髖部下垂。'], array['Squeeze your glutes and abs to keep the line straight.'], array['夾緊臀部與腹部以維持身體直線。']),
('side-plank', 'Side Plank', '側棒式', array['obliques', 'core', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your side, prop up on one forearm.', 'Lift your hips so your body forms a straight line.', 'Hold, then repeat on the other side.'], array['側躺，用一側前臂撐起。', '抬起髖部，讓身體呈一直線。', '維持後換邊重複。'], array['Stack your feet or stagger them for more stability.'], array['雙腳可疊放或前後錯開以增加穩定度。']),
('hanging-leg-raise', 'Hanging Leg Raise', '懸吊抬腿', array['lower_abs', 'core', 'forearms'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a bar with a firm grip and your body still.', 'Raise your legs until they are parallel to the floor or higher.', 'Lower slowly without swinging.'], array['穩固握住單槓懸吊，身體保持不動。', '將雙腿抬至與地面平行或更高。', '緩慢放下，避免擺盪。'], array['Bend your knees to make it easier.'], array['彎曲膝蓋可降低難度。']),
('cable-crunch', 'Cable Crunch', '滑輪捲腹', array['abs', 'core'], array['cable_machine'], array['large_gym', 'small_gym'], array['Kneel facing a high pulley holding the rope beside your head.', 'Curl your ribs toward your hips, rounding your spine.', 'Return slowly.'], array['面向高位滑輪跪好，雙手握繩放在頭部兩側。', '捲動脊椎，讓肋骨靠向髖部。', '緩慢放回。'], array['Move with your abs, not by pulling with your arms or sitting back.'], array['用腹肌發力，不要用手臂拉或往後坐。']),
('ab-wheel', 'Ab Wheel Rollout', '健腹輪捲腹', array['abs', 'core', 'shoulders'], array['ab_wheel'], array['large_gym', 'garage_gym'], array['Kneel holding the wheel under your shoulders.', 'Roll forward slowly, keeping your core tight and back flat.', 'Roll back to the start using your abs.'], array['跪姿，雙手握住位於肩膀下方的健腹輪。', '緩慢向前滾出，核心繃緊、背部保持平直。', '用腹肌將輪子滾回起始位置。'], array['Only roll out as far as you can without your lower back sagging.'], array['只滾到下背不會下塌的距離。']),
('running', 'Running', '跑步機慢跑', array['cardio'], array['treadmill'], array['large_gym', 'small_gym'], array['Start walking to warm up, then increase the speed to a jog.', 'Maintain a steady pace you can sustain for the full duration.', 'Cool down with a slower walk for the last few minutes.'], array['先以走路熱身，再逐漸加速至慢跑。', '維持能撐完全程的穩定配速。', '最後幾分鐘放慢走路收操。'], array['Land midfoot rather than heavily on your heel.'], array['以中足著地為主，避免過度用腳跟重踩。']),
('walking', 'Walking', '健走', array['cardio'], array['treadmill'], array['large_gym', 'small_gym'], array['Stand tall and start at an easy pace.', 'Swing your arms naturally and take steady, comfortable steps.', 'Keep a pace where you can still hold a conversation.'], array['站直，以輕鬆的速度開始。', '手臂自然擺動，步伐穩定舒適。', '維持仍能正常對話的配速。'], array['Land on your heel and roll through to your toes.'], array['腳跟先著地，再滾動至腳尖。']),
('cycling', 'Cycling', '室內飛輪', array['cardio'], array['cycling_stationary', 'cycling'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Adjust the seat height so your knee is slightly bent at full extension.', 'Pedal at a steady, moderate resistance to warm up.', 'Maintain a consistent cadence for the full session.'], array['調整座椅高度，使膝蓋在腿伸直時微彎。', '以中等阻力穩定踩踏熱身。', '全程維持穩定的踩踏節奏。'], array['Keep your hips still — avoid rocking side to side.'], array['髖部保持穩定，避免左右晃動。']),
('rowing', 'Rowing', '划船機', array['cardio'], array['rowing'], array['large_gym', 'small_gym', 'garage_gym'], array['Drive with your legs first, then lean back and pull the handle to your ribs.', 'Extend your arms, lean forward, and bend your knees to return.', 'Repeat in a smooth, continuous rhythm.'], array['先用腿部發力推動，再後仰並將把手拉向肋骨。', '伸直手臂，身體前傾，屈膝回到起始位置。', '以流暢連續的節奏重複。'], array['The power sequence is legs, then back, then arms — and reverse to return.'], array['發力順序為腿、背、手臂，回程則相反。']),
('stair-climber', 'Stair Climber', '登階機', array['cardio'], array['stair_climber'], array['large_gym'], array['Step onto the machine and hold the rails lightly for balance.', 'Start at a slow pace, then raise the speed until your breathing is steady but challenging.', 'Keep a steady rhythm for the full session, then slow down to cool off.'], array['踏上登階機，雙手輕扶扶手維持平衡。', '先以慢速開始，再逐步加快至呼吸穩定但有挑戰性。', '全程維持穩定節奏，最後放慢速度收操。'], array['Stand tall and avoid leaning heavily on the rails.'], array['保持身體挺直，避免整個人重壓在扶手上。']),
('dumbbell-fly', 'Dumbbell Fly', '啞鈴飛鳥', array['chest', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench holding dumbbells above your chest, palms in.', 'Lower your arms out to the sides in a wide arc.', 'Bring the dumbbells back together above your chest.'], array['躺在訓練椅上，雙手持啞鈴於胸口上方，掌心相對。', '雙臂向外側呈弧形下放。', '將啞鈴收回至胸口上方。'], array['Keep a slight bend in your elbows throughout.'], array['手肘全程保持微彎。']),
('incline-cable-fly', 'Incline Cable Fly', '上斜滑輪夾胸', array['upper_chest', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Set an incline bench between low pulleys and lie back holding the handles above your chest.', 'Lower your arms out to the sides in a wide arc, elbows slightly bent.', 'Bring the handles back together above your upper chest.'], array['將上斜椅放在低位滑輪之間，躺下並將把手舉在胸口上方。', '手肘微彎，將雙臂以大弧線向外下放。', '把手在上胸上方合攏。'], array['Keep a constant elbow angle throughout.'], array['全程維持固定的手肘角度。']),
('decline-dumbbell-press', 'Decline Dumbbell Press', '下斜啞鈴臥推', array['lower_chest', 'triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a decline bench with dumbbells at chest level.', 'Press them up until your arms are straight.', 'Lower with control to the sides of your lower chest.'], array['躺在下斜訓練椅上，啞鈴置於胸口高度。', '將啞鈴推至手臂伸直。', '控制放下至下胸兩側。'], array['Get the dumbbells into position with your knees, not your back.'], array['用膝蓋協助把啞鈴帶到位，不要靠背部硬拉。']),
('smith-machine-bench-press', 'Smith Machine Bench Press', '史密斯機臥推', array['chest', 'triceps', 'shoulders'], array['smith_machine'], array['large_gym', 'small_gym'], array['Set a flat bench under the bar and lie back with the bar over your chest.', 'Unrack and lower the bar to your mid-chest.', 'Press up and rack the bar when finished.'], array['將平椅置於槓下，躺下讓槓位於胸口上方。', '解開掛鉤，將槓下放至胸口中段。', '推起，完成後將槓掛回。'], array['Adjust the bench so the bar comes down over your mid-chest.'], array['調整椅子位置，讓槓下放在胸口中段上方。']),
('landmine-press', 'Landmine Press', '地雷管推舉', array['shoulders', 'chest', 'triceps'], array['landmine'], array['large_gym', 'garage_gym'], array['Stand holding the end of an angled barbell at your shoulder.', 'Press it up and forward until your arm is straight.', 'Lower with control.'], array['站立，單手握住斜放槓鈴的末端於肩膀處。', '向上向前推至手臂伸直。', '控制放下。'], array['A shoulder-friendly press — keep your ribs down.'], array['對肩膀較友善的推舉，保持肋骨向下收緊。']),
('weighted-dip', 'Weighted Dip', '負重雙槓撐體', array['triceps', 'chest', 'shoulders'], array['dip_station'], array['large_gym', 'small_gym', 'garage_gym'], array['Attach weight to a dip belt and support yourself on parallel bars.', 'Lower until your upper arms are parallel to the floor.', 'Press back up to straight arms.'], array['以負重腰帶掛上重量，雙手撐在雙槓上。', '下降至上臂與地面平行。', '推回至手臂伸直。'], array['Master bodyweight dips for 12+ reps before adding weight.'], array['先能完成12下以上徒手雙槓撐體再加重。']),
('machine-shoulder-press', 'Machine Shoulder Press', '坐姿肩推機', array['shoulders', 'triceps'], array['shoulder_press_machine'], array['large_gym'], array['Sit in the machine, grips at shoulder height.', 'Press the handles up until arms extend.', 'Lower back down with control.'], array['坐在機台上，把手位於肩膀高度。', '將把手向上推至手臂伸直。', '控制放下。'], array['Keep your back against the pad throughout.'], array['背部全程貼緊椅背。']),
('standing-dumbbell-press', 'Standing Dumbbell Press', '站姿啞鈴肩推', array['shoulders', 'triceps', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand tall holding dumbbells at shoulder height.', 'Press both overhead until your arms are straight.', 'Lower back to your shoulders.'], array['站直，雙手持啞鈴於肩膀高度。', '將雙手同時推過頭頂至手臂伸直。', '放回肩膀高度。'], array['Squeeze your glutes to avoid leaning back.'], array['夾緊臀部，避免身體後仰。']),
('push-press', 'Push Press', '推舉', array['shoulders', 'triceps', 'quads'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a bar at shoulder height, feet shoulder-width.', 'Dip slightly at the knees, then drive up explosively.', 'Use that momentum to press the bar overhead and lower it back.'], array['將槓置於肩膀高度，雙腳與肩同寬。', '膝蓋微蹲後爆發向上。', '借助這股力量將槓推過頭頂，再放回。'], array['The power comes from your legs — keep the dip short and quick.'], array['力量來自雙腿，下蹲幅度要短而快。']),
('machine-lateral-raise', 'Machine Lateral Raise', '器械側平舉', array['shoulders', 'upper_back'], array['lateral_raise_machine'], array['large_gym'], array['Sit with your arms against the pads and your elbows just below shoulder height.', 'Raise your arms out to the sides until they reach shoulder height.', 'Lower slowly.'], array['坐好，手臂靠住護墊，手肘略低於肩膀高度。', '向兩側抬起手臂至肩膀高度。', '緩慢放下。'], array['Push through your elbows, not your hands.'], array['用手肘推動，而不是手掌。']),
('cable-front-raise', 'Cable Front Raise', '滑輪前平舉', array['shoulders', 'chest'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand facing away from a low pulley, handle in one hand between your legs.', 'Raise your arm straight forward to shoulder height.', 'Lower slowly.'], array['背對低位滑輪站立，一手握著從雙腿間穿過的把手。', '將手臂向前平舉至肩膀高度。', '緩慢放下。'], array['Keep your torso still and your arm nearly straight.'], array['軀幹保持不動，手臂接近伸直。']),
('plate-front-raise', 'Plate Front Raise', '槓片前平舉', array['shoulders', 'chest'], array['plates'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a weight plate at the sides with both hands, arms straight.', 'Raise the plate forward to eye level.', 'Lower slowly.'], array['雙手握住槓片兩側，手臂伸直。', '將槓片向前抬至眼睛高度。', '緩慢放下。'], array['Don''t lean back to lift it — use a lighter plate if you do.'], array['不要靠後仰借力，若會後仰請換較輕的槓片。']),
('bent-over-rear-delt-raise', 'Bent-Over Rear Delt Raise', '俯身後三角側平舉', array['rear_delts', 'upper_back'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hinge forward with a flat back holding light dumbbells under your chest.', 'Raise your arms out to the sides, elbows slightly bent.', 'Lower with control.'], array['身體前傾、背部打平，雙手持輕啞鈴垂在胸口下方。', '手肘微彎，將雙臂向兩側抬起。', '控制放下。'], array['Light weights work best for the small rear delts.'], array['後三角肌較小，使用輕重量效果最好。']),
('cable-rear-delt-fly', 'Cable Rear Delt Fly', '滑輪後三角飛鳥', array['rear_delts', 'upper_back'], array['cable_machine'], array['large_gym', 'small_gym'], array['Set both pulleys at shoulder height and cross the cables, gripping opposite handles.', 'Pull your arms apart and back until they are in line with your shoulders.', 'Return slowly.'], array['將兩側滑輪調至肩膀高度，交叉握住對側把手。', '向兩側向後拉開，直到手臂與肩同高。', '緩慢放回。'], array['Keep your arms nearly straight and your chest up.'], array['手臂接近伸直，胸口挺起。']),
('pendlay-row', 'Pendlay Row', '潘德勒划船', array['back', 'biceps', 'rear_delts'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Bend forward with a flat back, torso parallel to the floor, bar on the ground.', 'Explosively pull the bar to your lower chest.', 'Lower it back to the floor and reset each rep.'], array['身體前傾、背部打平，上身與地面平行，槓放在地上。', '爆發式將槓拉向下胸。', '放回地面，每下重新開始。'], array['Each rep starts from a dead stop — no bouncing.'], array['每一下都從靜止開始，不要彈跳借力。']),
('inverted-row', 'Inverted Row', '反向划船', array['back', 'biceps', 'core'], array['squat_rack'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie under a low bar, grip it wider than shoulders, body straight from head to heels.', 'Pull your chest up to the bar.', 'Lower with control.'], array['躺在低槓下方，握距寬於肩，身體從頭到腳跟呈一直線。', '將胸口拉向橫槓。', '控制放下。'], array['Bend your knees to make it easier, raise your feet to make it harder.'], array['彎曲膝蓋較簡單，墊高雙腳則更困難。']),
('meadows-row', 'Meadows Row', '梅多斯划船', array['back', 'biceps', 'rear_delts'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand sideways to a landmine barbell, hinge forward and grip the end with one hand.', 'Row the end toward your hip, elbow high.', 'Lower with control, then switch sides.'], array['側身站在地雷管槓鈴旁，身體前傾，單手握住槓端。', '將槓端拉向髖部，手肘向上。', '控制放下，之後換邊。'], array['Keep your back flat and hips square.'], array['背部保持平直，髖部保持正面朝前。']),
('single-arm-cable-row', 'Single-Arm Cable Row', '單臂滑輪划船', array['back', 'biceps', 'rear_delts'], array['cable_machine'], array['large_gym', 'small_gym'], array['Sit or stand facing a low pulley, holding one handle with your arm extended.', 'Pull the handle to your side, elbow close to your body.', 'Extend your arm back slowly.'], array['面向低位滑輪坐或站好，單手握住把手，手臂伸直。', '將把手拉向身側，手肘貼近身體。', '緩慢伸直手臂放回。'], array['Resist rotating your torso as you pull.'], array['拉的時候避免身體旋轉。']),
('wide-grip-lat-pulldown', 'Wide-Grip Lat Pulldown', '寬握滑輪下拉', array['lats', 'biceps'], array['lat_pulldown'], array['large_gym', 'small_gym'], array['Sit at the pulldown station and grip the bar well wider than shoulders.', 'Pull the bar to your upper chest, driving your elbows down and back.', 'Let it rise until your arms are straight.'], array['坐在下拉機前，握距明顯寬於肩。', '將槓拉至上胸，手肘向下向後發力。', '讓槓回升至手臂伸直。'], array['Pull to your chest, not behind your neck.'], array['拉向胸口，不要拉到頸後。']),
('neutral-grip-pull-up', 'Neutral-Grip Pull-up', '對握引體向上', array['lats', 'biceps', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from parallel handles with palms facing each other.', 'Pull yourself up until your chin clears the handles.', 'Lower to a full hang.'], array['雙手掌心相對，握住平行把手懸吊。', '拉起身體，直到下巴超過把手。', '放下回到完全懸掛。'], array['Often the most shoulder-friendly pull-up variation.'], array['通常是對肩膀最友善的引體向上變化。']),
('assisted-chin-up', 'Assisted Chin-up', '輔助反握引體向上', array['biceps', 'lats'], array['assisted_machine'], array['large_gym'], array['Kneel on the platform, choose the assistance, and grip the bars underhand.', 'Pull yourself up until your chin clears the bar.', 'Lower with control.'], array['跪在踏板上，設定輔助重量，反手握住把手。', '拉起身體，直到下巴超過橫桿。', '控制放下。'], array['Lower the assistance gradually as you get stronger.'], array['隨著力量增加，逐步降低輔助重量。']),
('weighted-chin-up', 'Weighted Chin-up', '負重反握引體向上', array['biceps', 'lats'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Attach weight to a belt and hang from the bar with an underhand grip.', 'Pull up until your chin clears the bar.', 'Lower to a full hang.'], array['以腰帶掛上負重，反手握住單槓懸吊。', '拉起身體，直到下巴超過單槓。', '放下回到完全懸掛。'], array['Keep your body still — no kipping.'], array['身體保持穩定，不要甩動借力。']),
('rack-pull', 'Rack Pull', '架上硬舉', array['back', 'glutes', 'hamstrings'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Set the bar on safety pins at knee height and grip it just outside your legs.', 'Keeping your back flat, drive your hips forward to stand tall.', 'Lower the bar back to the pins with control.'], array['將槓放在膝蓋高度的安全栓上，握距略寬於雙腿。', '背部保持平直，推髖向前站直。', '控制將槓放回安全栓。'], array['Squeeze your shoulder blades at the top.'], array['頂端時夾緊肩胛。']),
('back-extension', 'Back Extension', '背部伸展', array['lower_back', 'glutes', 'hamstrings'], array['back_extension_bench'], array['large_gym'], array['Set the pad below your hips and cross your arms over your chest.', 'Lower your torso by hinging at the hips.', 'Raise back up until your body is in a straight line.'], array['將護墊調至髖部下方，雙手交叉放在胸前。', '以髖部為軸下放上身。', '抬起至身體呈一直線。'], array['Don''t hyperextend past a straight line.'], array['不要過度後仰超過身體一直線。']),
('dumbbell-shrug', 'Dumbbell Shrug', '啞鈴聳肩', array['upper_back', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand holding a dumbbell in each hand at your sides.', 'Lift your shoulders straight up toward your ears.', 'Pause, then lower slowly.'], array['站立，雙手各持一顆啞鈴垂於身側。', '將肩膀直直向上聳向耳朵。', '停頓後緩慢放下。'], array['Keep your arms straight and don''t roll your shoulders.'], array['手臂保持伸直，不要轉動肩膀。']),
('goblet-squat', 'Goblet Squat', '啞鈴高腳杯深蹲', array['quads', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold one dumbbell vertically against your chest.', 'Squat down between your knees, keeping your torso upright.', 'Drive through your heels to stand back up.'], array['雙手於胸前直立握持一顆啞鈴。', '蹲下時讓身體在雙膝間下降，軀幹保持直立。', '用腳跟發力站起。'], array['Keep your elbows pointed down toward the floor.'], array['手肘朝下方向，貼近身體。']),
('smith-machine-squat', 'Smith Machine Squat', '史密斯機深蹲', array['quads', 'glutes', 'core'], array['smith_machine'], array['large_gym', 'small_gym'], array['Set the bar across your upper back, feet slightly forward.', 'Squat down until thighs are parallel to the floor.', 'Drive through your heels to stand back up.'], array['將槓置於上背，雙腳略往前站。', '蹲下直到大腿與地面平行。', '用腳跟發力站起。'], array['The fixed bar path makes this a good beginner squat option.'], array['固定軌道的槓桿設計，適合初學者練習深蹲。']),
('belt-squat', 'Belt Squat', '腰帶深蹲', array['quads', 'glutes'], array['hack_squat_machine'], array['large_gym'], array['Attach the belt and stand on the platforms with the weight hanging below your hips.', 'Squat down until your thighs are parallel to the floor.', 'Drive up to standing.'], array['穿上腰帶，站在踏板上，讓重量垂在髖部下方。', '下蹲至大腿與地面平行。', '發力站起。'], array['Loads your legs without loading your spine.'], array['能訓練腿部，同時不對脊椎施加壓力。']),
('sumo-deadlift', 'Sumo Deadlift', '相撲硬舉', array['hamstrings', 'glutes', 'lower_back', 'quads'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with a wide stance, toes turned out, and grip the bar inside your knees.', 'Push the floor away and drive your hips forward to stand tall.', 'Lower the bar under control.'], array['雙腳站寬、腳尖外開，在膝蓋內側握住槓。', '用力蹬地並推髖向前站直。', '控制放下槓鈴。'], array['Push your knees out over your toes throughout the lift.'], array['全程讓膝蓋朝腳尖方向向外推。']),
('trap-bar-deadlift', 'Trap Bar Deadlift', '六角槓硬舉', array['hamstrings', 'glutes', 'lower_back', 'quads', 'forearms'], array['trap_bar'], array['large_gym'], array['Stand inside the trap bar and grip the side handles with a flat back.', 'Drive through your feet and stand tall.', 'Lower the bar with control.'], array['站在六角槓中間，背部打平，握住兩側把手。', '用腳蹬地並站直。', '控制放下槓鈴。'], array['A friendlier deadlift variation for beginners.'], array['對初學者相對友善的硬舉變化。']),
('lying-leg-curl', 'Lying Leg Curl', '俯臥腿彎舉', array['hamstrings', 'calves'], array['lying_leg_curl_machine'], array['large_gym'], array['Lie face down with the pad just above your heels.', 'Curl your heels toward your glutes.', 'Lower slowly.'], array['俯臥，滾墊位於腳跟上方。', '將腳跟彎舉靠向臀部。', '緩慢放下。'], array['Keep your hips down on the bench.'], array['髖部全程貼緊椅面。']),
('nordic-hamstring-curl', 'Nordic Hamstring Curl', '北歐腿彎舉', array['hamstrings', 'glutes', 'calves'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Kneel with your ankles anchored and your body straight from knees to head.', 'Lower your torso forward as slowly as you can.', 'Push off the floor lightly to return.'], array['跪姿，腳踝固定，身體從膝蓋到頭呈一直線。', '盡量緩慢地向前放低上身。', '輕輕用手撐地推回起始位置。'], array['Very demanding — start with a small range and build up.'], array['難度很高，先從小範圍開始逐步增加。']),
('single-leg-romanian-deadlift', 'Single-Leg Romanian Deadlift', '單腿羅馬尼亞硬舉', array['hamstrings', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand on one leg holding a dumbbell in the opposite hand.', 'Hinge at the hip, extending the free leg behind you.', 'Return to standing by driving through the standing heel.'], array['單腳站立，另一側手持啞鈴。', '髖部後推，同時將另一腳向後伸直。', '用站立腳的腳跟發力回到站姿。'], array['Keep your hips square to the floor.'], array['髖部保持正對地面，不要打開。']),
('reverse-lunge', 'Reverse Lunge', '後跨步蹲', array['quads', 'glutes', 'hamstrings'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand tall, step one foot backward into a lunge.', 'Lower until both knees form roughly 90 degrees.', 'Push through the front foot to return to standing.'], array['站直，單腳向後跨步蹲下。', '下降至雙膝約呈90度。', '用前腳發力站回起始位置。'], array['Easier on the knees than a forward lunge for most people.'], array['對大多數人來說，比向前弓箭步更輕鬆對待膝蓋。']),
('split-squat', 'Split Squat', '分腿蹲', array['quads', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand in a long stride with dumbbells at your sides.', 'Lower straight down until your back knee nearly touches the floor.', 'Drive through your front heel to stand.'], array['前後大步站立，雙手持啞鈴垂於身側。', '垂直下蹲，直到後膝接近地面。', '用前腳腳跟發力站起。'], array['Keep your torso upright.'], array['上身保持直立。']),
('cable-kickback', 'Cable Kickback', '滑輪後踢', array['glutes', 'hamstrings'], array['cable_machine'], array['large_gym', 'small_gym'], array['Attach an ankle strap to a low pulley and face the machine, holding on for balance.', 'Kick your working leg straight back, squeezing your glute.', 'Return slowly.'], array['將踝帶接在低位滑輪，面向機台並扶住穩住身體。', '將工作腿向後踢直，夾緊臀部。', '緩慢放回。'], array['Don''t arch your lower back to kick higher.'], array['不要為了踢更高而拱下背。']),
('hip-abduction-machine', 'Hip Abduction Machine', '髖外展機', array['glutes', 'core'], array['hip_machine'], array['large_gym'], array['Sit in the machine, outer thighs against the pads.', 'Push your legs outward against the resistance.', 'Return with control to the start.'], array['坐在機台上，大腿外側靠著滾墊。', '將雙腿向外側推開對抗阻力。', '控制回到起始位置。'], array['Keep your torso still — the legs do all the work.'], array['軀幹保持穩定，全靠雙腿發力。']),
('single-leg-glute-bridge', 'Single-Leg Glute Bridge', '單腳臀橋', array['glutes', 'hamstrings'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back, one knee bent, other leg extended straight.', 'Drive through the planted heel to lift your hips.', 'Lower with control, then repeat on the other side.'], array['仰躺，一腳屈膝，另一腳伸直。', '用著地那隻腳的腳跟發力抬起髖部。', '控制放下，換邊重複。'], array['Keep hips level — avoid rotating toward the lifted leg.'], array['保持髖部水平，避免朝伸直腳那側旋轉。']),
('barbell-glute-bridge', 'Barbell Glute Bridge', '槓鈴臀橋', array['glutes', 'hamstrings', 'core'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your back with a barbell across your hips (use a pad).', 'Drive through your heels to lift your hips until your body is straight.', 'Lower slowly.'], array['仰躺，將槓鈴（加護墊）放在髖部上方。', '用腳跟發力抬起髖部，直到身體呈一直線。', '緩慢放下。'], array['Squeeze your glutes hard at the top.'], array['頂端時用力夾緊臀部。']),
('dumbbell-glute-bridge', 'Dumbbell Glute Bridge', '啞鈴臀橋', array['glutes', 'hamstrings', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your back with a dumbbell across your hips.', 'Drive through your heels to lift your hips.', 'Lower with control.'], array['仰躺，將啞鈴放在髖部上方。', '用腳跟發力抬起髖部。', '控制放下。'], array['Pause for a second at the top.'], array['頂端停頓一秒。']),
('dumbbell-hip-thrust', 'Dumbbell Hip Thrust', '啞鈴臀推', array['glutes', 'hamstrings'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit with your upper back against a bench, a dumbbell resting on your hips.', 'Drive your hips up until your body forms a straight line.', 'Lower with control.'], array['坐好，上背靠在訓練椅上，啞鈴放在髖部。', '將髖部向上推，直到身體呈一直線。', '控制放下。'], array['Tuck your chin slightly to keep your ribs down.'], array['下巴微收，避免肋骨外翻。']),
('smith-machine-hip-thrust', 'Smith Machine Hip Thrust', '史密斯機臀推', array['glutes', 'hamstrings', 'core'], array['smith_machine'], array['large_gym', 'small_gym'], array['Sit with your upper back on a bench, the smith bar (padded) across your hips.', 'Drive your hips up until your body is straight.', 'Lower with control.'], array['上背靠在訓練椅上，將史密斯機的槓（加護墊）放在髖部。', '將髖部向上推至身體呈一直線。', '控制放下。'], array['Set your feet so your shins are vertical at the top.'], array['調整腳的位置，讓頂端時小腿垂直。']),
('smith-machine-romanian-deadlift', 'Smith Machine Romanian Deadlift', '史密斯機羅馬尼亞硬舉', array['hamstrings', 'glutes', 'lower_back'], array['smith_machine'], array['large_gym', 'small_gym'], array['Stand holding the smith bar in front of your thighs, knees slightly bent.', 'Hinge at the hips, sliding the bar down your legs.', 'Drive your hips forward to stand.'], array['站立，雙手握住史密斯機的槓於大腿前方，膝蓋微彎。', '髖部後推，讓槓沿腿部下滑。', '推髖向前站直。'], array['Feel the stretch in your hamstrings, not your lower back.'], array['應感覺到腿後側伸展，而不是下背。']),
('dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift', '啞鈴羅馬尼亞硬舉', array['hamstrings', 'glutes', 'lower_back'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell in each hand in front of your thighs.', 'Hinge at the hips, lowering the dumbbells along your legs.', 'Drive your hips forward to return to standing.'], array['雙手各持啞鈴於大腿前方。', '髖部後推，讓啞鈴沿腿部下滑。', '推髖站直回到起始位置。'], array['Keep a soft bend in your knees, not a squat.'], array['膝蓋維持微彎，動作是髖鉸鏈而非深蹲。']),
('kettlebell-romanian-deadlift', 'Kettlebell Romanian Deadlift', '壺鈴羅馬尼亞硬舉', array['hamstrings', 'glutes', 'lower_back'], array['kettlebell'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a kettlebell with both hands in front of your thighs.', 'Hinge at the hips, lowering it along your legs.', 'Drive your hips forward to stand tall.'], array['雙手握壺鈴於大腿前方。', '髖部後推，讓壺鈴沿腿部下放。', '推髖向前站直。'], array['Keep your back flat and shoulders back.'], array['背部保持平直，肩膀向後。']),
('cable-pull-through', 'Cable Pull-Through', '滑輪拉穿', array['glutes', 'hamstrings', 'lower_back'], array['cable_machine'], array['large_gym', 'small_gym'], array['Face away from a low pulley with the rope between your legs, hips hinged back.', 'Drive your hips forward to stand tall, squeezing your glutes.', 'Hinge back to return.'], array['背對低位滑輪，繩索從雙腿間穿過，髖部後推。', '推髖向前站直，夾緊臀部。', '髖部後推回到起始位置。'], array['Use your hips, not your arms, to move the weight.'], array['用髖部而不是手臂移動重量。']),
('machine-glute-kickback', 'Machine Glute Kickback', '器械臀部後踢', array['glutes', 'hamstrings'], array['hip_machine'], array['large_gym'], array['Set up on the machine with the pad against your heel or back of the thigh.', 'Press your leg back until it''s extended.', 'Return slowly.'], array['在機台上就位，護墊貼住腳跟或大腿後側。', '將腿向後蹬直。', '緩慢放回。'], array['Keep your torso still and squeeze at the end of the push.'], array['軀幹保持穩定，蹬到底時夾緊臀部。']),
('cable-standing-hip-abduction', 'Cable Standing Hip Abduction', '滑輪站姿髖外展', array['glutes', 'core'], array['cable_machine'], array['large_gym', 'small_gym'], array['Attach an ankle strap to a low pulley and stand sideways to the machine.', 'Raise the outer leg out to the side.', 'Return slowly.'], array['將踝帶接在低位滑輪，側身站在機台旁。', '將外側腿向側邊抬起。', '緩慢放回。'], array['Keep your torso upright — don''t lean to lift higher.'], array['上身保持直立，不要為了抬更高而傾斜。']),
('cable-standing-hip-adduction', 'Cable Standing Hip Adduction', '滑輪站姿髖內收', array['inner_thighs', 'core', 'glutes'], array['cable_machine'], array['large_gym', 'small_gym'], array['Attach an ankle strap to a low pulley and stand sideways with the near leg attached.', 'Pull that leg across in front of your other leg.', 'Return slowly.'], array['將踝帶接在低位滑輪，側身站立，靠近機台的腿繫上踝帶。', '將該腿向內橫跨至另一腿前方。', '緩慢放回。'], array['Hold something for balance and keep the movement controlled.'], array['扶住穩固物體維持平衡，動作保持控制。']),
('hip-adduction-machine', 'Hip Adduction Machine', '髖內收機', array['inner_thighs', 'core'], array['hip_machine'], array['large_gym'], array['Sit in the machine, inner thighs against the pads.', 'Squeeze your legs together against the resistance.', 'Return with control to the start.'], array['坐在機台上，大腿內側靠著滾墊。', '將雙腿向內夾緊對抗阻力。', '控制回到起始位置。'], array['Move through a controlled, moderate range.'], array['動作範圍適中且全程控制。']),
('smith-machine-bulgarian-split-squat', 'Smith Machine Bulgarian Split Squat', '史密斯機保加利亞分腿蹲', array['quads', 'glutes', 'core'], array['smith_machine'], array['large_gym', 'small_gym'], array['Rest your back foot on a bench behind you with the smith bar on your shoulders.', 'Lower until your front thigh is parallel to the floor.', 'Drive through your front heel to stand.'], array['後腳放在身後的訓練椅上，史密斯機的槓放在肩上。', '下蹲至前腿大腿與地面平行。', '用前腳腳跟發力站起。'], array['Set your front foot far enough forward to keep your knee over your ankle.'], array['前腳跨遠一些，讓膝蓋保持在腳踝上方。']),
('smith-machine-reverse-lunge', 'Smith Machine Reverse Lunge', '史密斯機後跨步蹲', array['quads', 'glutes', 'hamstrings', 'core'], array['smith_machine'], array['large_gym', 'small_gym'], array['Stand with the smith bar on your shoulders and step one foot back.', 'Lower your back knee toward the floor.', 'Push through your front foot to stand, then switch legs.'], array['史密斯機的槓放在肩上，單腳向後跨一步。', '讓後膝向地面下降。', '用前腳發力站起，之後換腳。'], array['Keep your front shin close to vertical.'], array['前腳小腿盡量保持垂直。']),
('smith-machine-split-squat', 'Smith Machine Split Squat', '史密斯機分腿蹲', array['quads', 'glutes', 'core'], array['smith_machine'], array['large_gym', 'small_gym'], array['Set the smith bar on your shoulders and step one foot forward, the other back.', 'Lower straight down until your back knee nearly touches the floor.', 'Drive through your front heel to stand.'], array['史密斯機的槓放在肩上，單腳向前、另一腳向後站開。', '垂直下蹲，直到後膝接近地面。', '用前腳腳跟發力站起。'], array['Place your front foot slightly ahead of the bar so your knee stays stacked over your ankle.'], array['前腳略放在槓的前方，讓膝蓋保持在腳踝上方。']),
('heel-elevated-goblet-squat', 'Heel-Elevated Goblet Squat', '墊腳高腳杯深蹲', array['quads', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with your heels on a small plate, holding a dumbbell at your chest.', 'Squat down between your knees keeping your chest tall.', 'Press through your feet to stand.'], array['雙腳腳跟墊在小槓片上，雙手將啞鈴抱在胸前。', '在兩膝之間下蹲，胸口保持挺起。', '用腳掌發力站起。'], array['The raised heels let your knees travel forward, biasing the quads.'], array['墊高腳跟讓膝蓋能前移，更能刺激股四頭肌。']),
('dumbbell-sumo-squat', 'Dumbbell Sumo Squat', '啞鈴相撲深蹲', array['glutes', 'quads', 'inner_thighs', 'hamstrings'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with a wide stance, toes turned out, holding one dumbbell hanging between your legs.', 'Sit straight down, knees tracking over your toes.', 'Drive up and squeeze your glutes at the top.'], array['雙腳站寬、腳尖外開，單手或雙手將一顆啞鈴垂在兩腿之間。', '垂直向下坐，膝蓋朝腳尖方向。', '向上站起並在頂端夾緊臀部。'], array['Keep your torso upright and your knees pushed out.'], array['上身保持直立，膝蓋向外推。']),
('dumbbell-sumo-deadlift', 'Dumbbell Sumo Deadlift', '啞鈴相撲硬舉', array['hamstrings', 'glutes', 'lower_back', 'quads', 'inner_thighs'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with a wide stance and hold a dumbbell between your feet with both hands.', 'Keeping your back flat, drive through your feet to stand tall.', 'Lower the dumbbell with control.'], array['雙腳站寬，雙手握住雙腳之間的一顆啞鈴。', '背部保持平直，用腳發力站直。', '控制放下啞鈴。'], array['Push your knees out as you lift.'], array['拉起時讓膝蓋向外推。']),
('front-foot-elevated-split-squat', 'Front-Foot Elevated Split Squat', '前腳墊高分腿蹲', array['quads', 'glutes', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Place your front foot on a low step, back foot on the floor, dumbbells at your sides.', 'Lower until your back knee nearly touches the floor.', 'Drive through your front heel to stand.'], array['前腳踩在低台階上，後腳在地面，雙手持啞鈴垂於身側。', '下蹲至後膝接近地面。', '用前腳腳跟發力站起。'], array['The elevation increases range of motion — go lighter at first.'], array['墊高增加了動作幅度，一開始重量要輕一些。']),
('deficit-reverse-lunge', 'Deficit Reverse Lunge', '墊高後跨步蹲', array['glutes', 'quads', 'hamstrings', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand on a low step holding dumbbells and step one foot back off the step.', 'Lower your back knee toward the floor.', 'Push through your front foot to return to the step.'], array['站在低台階上，雙手持啞鈴，單腳向後踏出台階。', '讓後膝向地面下降。', '用前腳發力回到台階上。'], array['Control the step back to protect your knee.'], array['向後踏出時要控制速度以保護膝蓋。']),
('dumbbell-lateral-lunge', 'Dumbbell Lateral Lunge', '啞鈴側弓箭步', array['quads', 'glutes', 'inner_thighs', 'hamstrings'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand tall holding a dumbbell at your chest.', 'Step wide to one side and sit back into that hip, keeping the other leg straight.', 'Push off to return to standing, then switch sides.'], array['站直，將啞鈴抱在胸前。', '向一側大步跨出並坐入該側髖部，另一腿保持伸直。', '蹬地回到站姿，之後換邊。'], array['Keep both feet flat and pointing forward.'], array['雙腳全程踩平，腳尖朝前。']),
('dumbbell-curtsy-lunge', 'Dumbbell Curtsy Lunge', '啞鈴交叉弓箭步', array['glutes', 'quads', 'hamstrings', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand holding dumbbells at your sides.', 'Step one leg back and across behind your other leg, lowering into a lunge.', 'Push through your front foot to return.'], array['站立，雙手持啞鈴垂於身側。', '一腳向後並交叉到另一腿後方，下蹲成弓箭步。', '用前腳發力回到起始位置。'], array['Keep your hips facing forward.'], array['髖部保持朝向前方。']),
('landmine-squat', 'Landmine Squat', '地雷管深蹲', array['quads', 'glutes', 'core'], array['landmine'], array['large_gym', 'garage_gym'], array['Hold the end of a landmine barbell at your chest with both hands.', 'Squat down, keeping your chest up.', 'Stand back up and let the bar arc naturally.'], array['雙手將地雷管槓鈴末端抱在胸前。', '下蹲，胸口保持挺起。', '站起，讓槓自然弧線移動。'], array['The angled bar acts as a counterbalance, making the squat easier to learn.'], array['斜槓提供配重效果，讓深蹲更容易學習。']),
('landmine-romanian-deadlift', 'Landmine Romanian Deadlift', '地雷管羅馬尼亞硬舉', array['hamstrings', 'glutes', 'lower_back'], array['landmine'], array['large_gym', 'garage_gym'], array['Stand holding the end of a landmine barbell with both hands in front of your thighs.', 'Hinge at the hips, sliding the bar down your legs.', 'Drive your hips forward to stand.'], array['站立，雙手握住地雷管槓鈴末端於大腿前方。', '髖部後推，讓槓沿腿部下滑。', '推髖向前站直。'], array['Keep a flat back and slight knee bend.'], array['背部保持平直，膝蓋微彎。']),
('kettlebell-swing', 'Kettlebell Swing', '壺鈴擺盪', array['glutes', 'hamstrings', 'core', 'cardio'], array['kettlebell'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with the kettlebell in front of you, feet shoulder-width.', 'Hinge at the hips to swing the kettlebell back between your legs.', 'Snap your hips forward to swing it up to chest height.'], array['壺鈴放身體前方，雙腳與肩同寬站立。', '髖部後推，將壺鈴往後擺盪至雙腿間。', '髖部向前爆發，將壺鈴擺至胸口高度。'], array['Power comes from your hips, not your arms.'], array['力量來自髖部發力，而非手臂。']),
('glute-focused-back-extension', 'Glute-Focused Back Extension', '臀部導向背部伸展', array['glutes', 'hamstrings', 'lower_back'], array['back_extension_bench'], array['large_gym'], array['Set the pad below your hips and round your upper back slightly.', 'Lower your torso by hinging at the hips.', 'Squeeze your glutes to lift back to a straight line.'], array['將護墊調至髖部下方，上背微微圓起。', '以髖部為軸下放上身。', '夾緊臀部抬起至身體呈一直線。'], array['Rounding the upper back shifts the work from the lower back to the glutes.'], array['圓起上背能讓發力從下背轉移到臀部。']),
('reverse-hyperextension', 'Reverse Hyperextension', '反向背伸展', array['glutes', 'hamstrings', 'lower_back'], array['back_extension_bench'], array['large_gym'], array['Lie face down on the pad with your hips at the edge and hold the handles.', 'Swing your legs up behind you until they are in line with your body.', 'Lower slowly.'], array['俯臥在墊上，髖部靠近邊緣，雙手抓住把手。', '將雙腿向後擺至與身體呈一直線。', '緩慢放下。'], array['Don''t swing — lift with your glutes.'], array['不要甩動，用臀部發力抬起。']),
('leg-press-calf-raise', 'Leg Press Calf Raise', '腿推機提踵', array['calves'], array['leg_press'], array['large_gym', 'small_gym'], array['Sit in the leg press and place the balls of your feet on the lower edge of the platform.', 'Press through your toes to extend your ankles.', 'Lower your heels for a full stretch.'], array['坐在腿推機上，前腳掌踩在踏板下緣。', '用腳尖推動，伸展腳踝。', '放低腳跟至完全伸展。'], array['Keep your knees almost straight but not locked.'], array['膝蓋接近伸直但不要鎖死。']),
('wall-sit', 'Wall Sit', '牆壁深蹲', array['quads', 'glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lean your back against a wall and slide down.', 'Stop when your thighs are parallel to the floor, knees at 90 degrees.', 'Hold the position, breathing steadily.'], array['背靠牆壁並向下滑。', '大腿與地面平行、膝蓋呈90度時停止。', '維持姿勢並穩定呼吸。'], array['Keep your knees aligned over your ankles, not past your toes.'], array['膝蓋對齊腳踝上方，不要超過腳尖。']),
('jump-squat', 'Jump Squat', '跳躍深蹲', array['quads', 'glutes', 'calves'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Perform a bodyweight squat.', 'Explode upward into a jump at the bottom.', 'Land softly and immediately sink into the next rep.'], array['做一個徒手深蹲。', '在蹲到底時向上爆發跳起。', '輕柔落地後立刻接續下一下。'], array['Land with soft knees to reduce impact.'], array['落地時膝蓋保持柔軟緩衝，減少衝擊。']),
('incline-dumbbell-curl', 'Incline Dumbbell Curl', '上斜啞鈴彎舉', array['biceps', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit back on an incline bench with dumbbells hanging at your sides.', 'Curl both dumbbells up, keeping your upper arms still.', 'Lower slowly to a full stretch.'], array['靠坐在上斜椅上，雙手持啞鈴垂在身側。', '保持上臂不動，將啞鈴彎舉起。', '緩慢放下至完全伸展。'], array['The incline stretches the biceps — use lighter weights.'], array['上斜角度能拉長二頭肌，重量可以輕一些。']),
('concentration-curl', 'Concentration Curl', '集中彎舉', array['biceps', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit and rest your elbow against your inner thigh, dumbbell hanging.', 'Curl the dumbbell up toward your shoulder.', 'Lower slowly.'], array['坐好，手肘靠在大腿內側，啞鈴垂下。', '將啞鈴彎舉向肩膀。', '緩慢放下。'], array['Keep your upper arm braced against your leg.'], array['上臂全程固定靠在大腿上。']),
('ez-bar-curl', 'EZ-Bar Curl', 'EZ 曲槓彎舉', array['biceps', 'forearms'], array['ez_bar'], array['large_gym', 'garage_gym'], array['Stand holding an EZ bar with an underhand grip on the angled sections.', 'Curl the bar toward your shoulders keeping your elbows by your sides.', 'Lower with control.'], array['站立，以反手握住EZ曲槓的斜面握位。', '手肘貼近身體，將槓彎舉向肩膀。', '控制放下。'], array['The angled grip is easier on the wrists.'], array['曲槓的握位對手腕較友善。']),
('spider-curl', 'Spider Curl', '蜘蛛彎舉', array['biceps', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie chest-down on an incline bench with your arms hanging straight down holding dumbbells.', 'Curl the weights up without moving your upper arms.', 'Lower slowly.'], array['胸口貼在上斜椅上俯臥，雙手持啞鈴自然垂下。', '上臂不動，將啞鈴彎舉起。', '緩慢放下。'], array['No momentum is possible here — go light.'], array['這個姿勢無法借力，重量要輕。']),
('rope-hammer-curl', 'Rope Hammer Curl', '繩索錘式彎舉', array['biceps', 'forearms'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand facing a low pulley holding a rope with palms facing each other.', 'Curl the rope up toward your shoulders, elbows by your sides.', 'Lower slowly.'], array['面向低位滑輪站立，雙手掌心相對握住繩索。', '手肘貼近身體，將繩索彎舉向肩膀。', '緩慢放下。'], array['Keep your wrists straight throughout.'], array['全程手腕保持平直。']),
('drag-curl', 'Drag Curl', '拖曳彎舉', array['biceps', 'forearms'], array['barbell'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand holding a barbell with an underhand grip.', 'Curl by dragging the bar up along your body, pulling your elbows back.', 'Lower with control.'], array['站立，反手握住槓鈴。', '沿著身體拖曳槓向上，同時將手肘向後拉。', '控制放下。'], array['Keep the bar touching your body the whole way.'], array['全程讓槓貼著身體。']),
('rope-tricep-pushdown', 'Rope Tricep Pushdown', '繩索三頭下壓', array['triceps', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand facing a high pulley holding a rope with elbows by your sides.', 'Press the rope down and spread the ends apart at the bottom.', 'Return slowly until your forearms are just past parallel.'], array['面向高位滑輪站立，手肘貼近身體，握住繩索。', '向下壓，並在底部將繩索兩端向外拉開。', '緩慢回到前臂略超過水平。'], array['Keep your elbows pinned — only your forearms move.'], array['手肘固定不動，只有前臂移動。']),
('dumbbell-skull-crusher', 'Two Dumbbell Skullcrusher', '雙啞鈴仰臥臂屈伸', array['triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench holding a dumbbell in each hand over your chest.', 'Bend your elbows to lower the dumbbells beside your head.', 'Extend your arms back up.'], array['躺在訓練椅上，雙手各持啞鈴舉在胸口上方。', '彎曲手肘，將啞鈴下放到頭部兩側。', '伸直手臂推回。'], array['Keep your upper arms vertical throughout.'], array['上臂全程保持垂直。']),
('single-dumbbell-skullcrusher', 'Single Dumbbell Skullcrusher', '單啞鈴仰臥臂屈伸', array['triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a bench holding one dumbbell with both hands above your chest.', 'Bend your elbows to lower it behind your head.', 'Extend your arms to return.'], array['躺在訓練椅上，雙手握住一顆啞鈴舉在胸口上方。', '彎曲手肘，將啞鈴下放到頭後。', '伸直手臂回到起始位置。'], array['Keep your elbows pointing at the ceiling.'], array['手肘保持朝向天花板。']),
('dumbbell-overhead-tricep-extension', 'Dumbbell Overhead Tricep Extension', '啞鈴頭上三頭伸展', array['triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand or sit holding one dumbbell overhead with both hands.', 'Bend your elbows to lower it behind your head.', 'Extend your arms back up.'], array['站或坐，雙手將一顆啞鈴舉過頭頂。', '彎曲手肘，將啞鈴下放到頭後。', '伸直手臂推回。'], array['Keep your elbows close to your head.'], array['手肘盡量靠近頭部。']),
('single-arm-dumbbell-tricep-extension', 'Single Arm Dumbbell Tricep Extension', '單臂啞鈴三頭伸展', array['triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a dumbbell overhead in one hand, supporting that arm with the other if needed.', 'Lower the weight behind your head by bending your elbow.', 'Extend back up.'], array['單手將啞鈴舉過頭頂，必要時用另一手扶住手臂。', '彎曲手肘，將啞鈴下放到頭後。', '伸直手臂推回。'], array['Only your forearm should move.'], array['只有前臂應該移動。']),
('bench-dip', 'Bench Dip', '椅上撐體', array['triceps', 'chest', 'shoulders'], array['bench'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit on the edge of a bench, hands beside your hips, then slide your hips off.', 'Lower your body by bending your elbows to about 90 degrees.', 'Press back up.'], array['坐在椅子邊緣，雙手放在髖部兩側，將臀部移出椅面。', '彎曲手肘下降至約90度。', '推回起始位置。'], array['Bend your knees to make it easier; keep your back close to the bench.'], array['彎曲膝蓋可降低難度，背部貼近椅子。']),
('tricep-kickback', 'Tricep Kickback', '啞鈴三頭後踢', array['triceps', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Hinge forward, upper arm parallel to the floor, elbow bent.', 'Extend your forearm straight back until your arm is fully straight.', 'Bend back to the start with control.'], array['身體前傾，上臂與地面平行，手肘彎曲。', '將前臂向後伸直，直到手臂完全伸展。', '控制彎回起始位置。'], array['Keep your upper arm still — only the forearm moves.'], array['上臂保持固定不動，僅前臂移動。']),
('wrist-extension', 'Wrist Extension', '腕伸展', array['forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Rest your forearms on your thighs, palms down, holding light dumbbells.', 'Lift your hands by extending your wrists.', 'Lower slowly.'], array['前臂放在大腿上、掌心向下，手持輕啞鈴。', '伸展手腕將手抬起。', '緩慢放下。'], array['Use very light weight and higher reps.'], array['使用很輕的重量與較高次數。']),
('farmer-carry', 'Farmer Carry', '農夫行走', array['forearms', 'upper_back', 'core'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Pick up a heavy dumbbell in each hand and stand tall.', 'Walk with short, steady steps.', 'Keep your shoulders back and don''t lean.'], array['雙手各拿起一顆較重的啞鈴，站直。', '以小而穩的步伐行走。', '肩膀向後，身體不要傾斜。'], array['Grip hard and brace your core the whole time.'], array['全程握緊並收緊核心。']),
('crunch', 'Crunch', '捲腹', array['abs', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with knees bent, hands by your head.', 'Curl your shoulders off the floor by contracting your abs.', 'Lower slowly.'], array['仰躺屈膝，雙手放在頭部兩側。', '收縮腹肌，讓肩膀離開地面。', '緩慢放下。'], array['Don''t pull on your neck — lift with your abs.'], array['不要拉扯頸部，用腹肌發力。']),
('reverse-crunch', 'Reverse Crunch', '反向捲腹', array['lower_abs', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with knees bent and lifted over your hips.', 'Curl your hips off the floor toward your ribs.', 'Lower slowly.'], array['仰躺，屈膝將雙腿抬至髖部上方。', '捲動骨盆，讓髖部離開地面靠向肋骨。', '緩慢放下。'], array['Avoid swinging your legs for momentum.'], array['避免甩腿借力。']),
('russian-twist', 'Russian Twist', '俄羅斯轉體', array['obliques', 'core', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit with knees bent and lean back slightly, feet lifted or on the floor.', 'Rotate your torso to one side.', 'Rotate to the other side in a controlled way.'], array['坐好屈膝，身體微微後仰，雙腳抬起或著地。', '將軀幹轉向一側。', '有控制地轉向另一側。'], array['Rotate from your ribs, not just your arms.'], array['用肋骨轉動軀幹，而不只是手臂擺動。']),
('bicycle-crunch', 'Bicycle Crunch', '腳踏車捲腹', array['obliques', 'core', 'quads', 'glutes'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back, hands behind your head.', 'Bring one elbow toward the opposite knee while extending the other leg.', 'Alternate sides in a smooth, pedaling motion.'], array['仰躺，雙手輕放頭後。', '將一側手肘帶向對側膝蓋，另一腳同時伸直。', '左右交替，如踩腳踏車般流暢進行。'], array['Don''t pull on your neck — let your abs do the work.'], array['不要用手拉扯頸部，靠腹部力量發力。']),
('mountain-climber', 'Mountain Climber', '登山者', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank position.', 'Drive one knee toward your chest, then quickly switch legs.', 'Continue alternating at a brisk, controlled pace.'], array['從高棒式開始。', '將一腳膝蓋快速帶向胸口，再迅速換腳。', '持續交替，動作快而穩定。'], array['Keep hips low and steady — don''t let them bounce up.'], array['髖部保持低而穩定，避免上下彈跳。']),
('dead-bug', 'Dead Bug', '死蟲式', array['abs', 'core', 'quads', 'glutes'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with arms straight up and knees bent over your hips.', 'Lower the opposite arm and leg toward the floor.', 'Return and switch sides.'], array['仰躺，雙臂向上伸直，膝蓋屈起在髖部上方。', '將對側手臂與腿向地面放低。', '回到起始位置，換邊。'], array['Keep your lower back pressed into the floor.'], array['下背全程貼緊地面。']),
('bird-dog', 'Bird Dog', '鳥狗式', array['abs', 'core', 'glutes', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees with a flat back.', 'Extend the opposite arm and leg until they''re in line with your body.', 'Return and switch sides.'], array['四足跪姿開始，背部保持平直。', '伸直對側手臂與腿，與身體呈一直線。', '回到起始位置，換邊。'], array['Keep your hips level — don''t rotate.'], array['髖部保持水平，不要旋轉。']),
('pallof-press', 'Pallof Press', '帕洛夫推', array['obliques', 'core', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand sideways to a cable at chest height, holding the handle at your chest.', 'Press the handle straight out in front of you.', 'Bring it back to your chest without rotating.'], array['側身站在胸口高度的滑輪旁，將把手握在胸前。', '將把手向正前方推出。', '在不轉動身體的情況下收回胸前。'], array['The goal is resisting rotation — stay square.'], array['目標是抵抗旋轉，身體保持正面朝前。']),
('cable-woodchop', 'Cable Woodchop', '滑輪劈砍', array['obliques', 'core', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Set the pulley high, grip the handle with both hands.', 'Rotate your torso to pull the handle down and across your body.', 'Return with control, then repeat, and switch sides.'], array['將滑輪設在高處，雙手握住把手。', '旋轉軀幹將把手向下拉過身體。', '控制放回，重複後換邊。'], array['Rotate from your core, not just your arms.'], array['旋轉力量來自核心，而非僅靠手臂。']),
('half-kneeling-pallof-press', 'Half-Kneeling Pallof Press', '半跪帕洛夫推', array['obliques', 'core', 'glutes', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Kneel on one knee sideways to a cable, the handle held at your chest.', 'Press the handle straight out.', 'Return to your chest, keeping your torso still.'], array['單膝跪地，側身面對滑輪，把手握在胸前。', '將把手向正前方推出。', '收回胸前，軀幹保持穩定。'], array['Squeeze the glute of your down leg for stability.'], array['夾緊著地腿的臀部以增加穩定。']),
('cable-pallof-hold', 'Cable Pallof Hold', '滑輪帕洛夫抗旋轉', array['obliques', 'core', 'glutes', 'shoulders'], array['cable_machine'], array['large_gym', 'small_gym'], array['Stand sideways to a cable and press the handle straight out.', 'Hold with your arms extended.', 'Resist the cable pulling you to the side.'], array['側身站在滑輪旁，將把手向前推出。', '手臂伸直維持不動。', '抵抗滑輪將你向側邊拉。'], array['Breathe steadily while holding.'], array['維持時保持穩定呼吸。']),
('hanging-knee-raise', 'Hanging Knee Raise', '懸吊抬膝', array['lower_abs', 'core', 'forearms'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a pull-up bar with a firm grip.', 'Raise your knees toward your chest.', 'Lower slowly without swinging.'], array['穩固握住單槓懸吊。', '將膝蓋抬向胸口。', '緩慢放下，避免擺盪。'], array['Tilt your pelvis up at the top to engage your abs.'], array['頂端時捲起骨盆以啟動腹肌。']),
('captains-chair-knee-raise', 'Captain''s Chair Knee Raise', '羅馬椅抬膝', array['lower_abs', 'core', 'shoulders'], array['dip_station'], array['large_gym', 'small_gym', 'garage_gym'], array['Support yourself on the forearm pads with your back against the pad.', 'Raise your knees toward your chest.', 'Lower slowly.'], array['以前臂撐在扶墊上，背靠椅背。', '將膝蓋抬向胸口。', '緩慢放下。'], array['Keep your back pressed to the pad throughout.'], array['全程背部貼緊椅墊。']),
('decline-sit-up', 'Decline Sit-Up', '斜板仰臥起坐', array['abs', 'core', 'quads'], array['bench'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on a decline bench with your feet secured and hands across your chest.', 'Curl your torso up toward your knees.', 'Lower with control.'], array['躺在下斜板上，雙腳固定，雙手交叉在胸前。', '將上身捲起靠向膝蓋。', '控制放下。'], array['Don''t yank your neck forward.'], array['不要用力拉扯頸部。']),
('weighted-crunch', 'Weighted Crunch', '負重捲腹', array['abs', 'core'], array['plates'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your back with knees bent, holding a plate against your chest.', 'Curl your shoulders off the floor.', 'Lower slowly.'], array['仰躺屈膝，將槓片抱在胸前。', '讓肩膀離開地面捲起。', '緩慢放下。'], array['Use a weight that lets you keep clean form.'], array['選擇能維持標準動作的重量。']),
('weighted-russian-twist', 'Weighted Russian Twist', '負重俄羅斯轉體', array['obliques', 'core', 'shoulders'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit leaning back slightly, holding a dumbbell with both hands at your chest.', 'Rotate your torso to one side.', 'Rotate to the other side.'], array['坐好並微微後仰，雙手將啞鈴握在胸前。', '將軀幹轉向一側。', '轉向另一側。'], array['Keep your chest lifted and spine long.'], array['胸口挺起，脊椎保持延伸。']),
('dumbbell-side-bend', 'Dumbbell Side Bend', '啞鈴側彎', array['obliques', 'core', 'forearms'], array['dumbbells'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand tall holding a dumbbell in one hand at your side.', 'Bend sideways toward the dumbbell.', 'Return upright by contracting the opposite side.'], array['站直，單手持啞鈴垂於身側。', '向持啞鈴的一側彎曲身體。', '用對側腹斜肌收縮回到直立。'], array['Move only sideways — don''t lean forward or back.'], array['只做側向移動，不要前後傾。']),
('elliptical', 'Elliptical', '橢圓機穩定有氧', array['cardio'], array['elliptical'], array['large_gym', 'small_gym'], array['Set a moderate resistance and step onto the pedals.', 'Push and pull the handles while pedaling smoothly.', 'Maintain a steady effort for the full session.'], array['設定中等阻力並踏上踏板。', '踩踏的同時推拉握把。', '全程維持穩定的施力強度。'], array['Keep your posture upright rather than leaning on the handles.'], array['保持姿勢直立，避免過度依靠握把支撐。']),
('jump-rope', 'Jump Rope', '跳繩', array['cardio'], array['jump_rope'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Hold the rope handles at hip height, wrists doing most of the turning.', 'Jump just high enough to clear the rope with each turn.', 'Keep a steady rhythm, landing softly on the balls of your feet.'], array['雙手握把於髖部高度，主要靠手腕轉動繩子。', '每次跳躍高度剛好能讓繩子通過即可。', '保持穩定節奏，以前腳掌輕柔落地。'], array['Keep your elbows close to your body, not flared out.'], array['手肘貼近身體，避免向外張開。']),
('assault-bike', 'Assault Bike', '風扇車間歇', array['cardio'], array['air_bike'], array['large_gym', 'garage_gym'], array['Warm up with easy pedaling, using both arms and legs.', 'Sprint at maximum effort for a short interval.', 'Recover at an easy pace, then repeat the cycle.'], array['先以輕鬆的手腳配合踩踏熱身。', '以最大力量衝刺一段短時間。', '以輕鬆配速恢復後重複循環。'], array['Push and pull with your arms to engage your upper body too.'], array['雙手推拉施力，同時訓練上半身。']),
('skierg', 'SkiErg', '滑雪機', array['cardio'], array['ski_erg'], array['large_gym'], array['Stand tall facing the machine and grip both handles overhead.', 'Pull the handles down and hinge at the hips in one smooth motion.', 'Return to the tall start position and repeat at a steady rhythm.'], array['面向機器挺直站立，雙手在頭上握住把手。', '順勢下拉把手並同時髖部後推，動作連貫流暢。', '回到挺直的起始姿勢，以穩定節奏重複。'], array['Drive the pull with your lats and hips, not just your arms.'], array['用背闊肌與髖部帶動下拉，不要只靠手臂。']),
('treadmill-incline-walk', 'Treadmill Incline Walk', '跑步機坡度健走', array['cardio'], array['treadmill'], array['large_gym', 'small_gym'], array['Set the treadmill to a moderate incline and a comfortable speed.', 'Walk with an upright posture and natural arm swing.', 'Keep a steady pace for the full time.'], array['將跑步機設為中等坡度與舒適速度。', '保持挺直姿勢與自然擺臂行走。', '維持穩定配速直到時間結束。'], array['Avoid holding the handrails — it lowers the effort.'], array['避免抓扶手，否則會降低訓練強度。']),
('battle-ropes', 'Battle Ropes', '戰繩', array['cardio'], array['battle_ropes'], array['large_gym', 'garage_gym'], array['Hold one rope end in each hand, feet shoulder-width apart, knees slightly bent.', 'Alternate raising and lowering each arm quickly to create waves in the rope.', 'Keep your core braced and work in intervals of 20–30 seconds.'], array['雙手各握一端戰繩，雙腳與肩同寬、膝蓋微彎。', '雙手快速交替上下甩動，讓繩子產生波浪。', '核心保持出力，以 20–30 秒為一組間歇進行。'], array['Keep your chest up and let the movement come from the shoulders.'], array['保持胸口挺起，讓動作由肩膀帶動。']),
('incline-push-up', 'Incline Push-up', '上斜伏地挺身', array['upper_chest', 'triceps', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Place hands on a bench or sturdy elevated surface.', 'Lower your chest to the edge, elbows at 45 degrees.', 'Push back up to full arm extension.'], array['雙手撐在訓練椅或穩固的高處。', '將胸口下壓靠近邊緣，手肘約45度。', '推回至手臂完全伸直。'], array['Easier variant of the push-up — raise the surface height to make it easier.'], array['伏地挺身的簡化版本，墊高的位置越高越輕鬆。']),
('knee-push-up', 'Knee Push-up', '跪姿伏地挺身', array['chest', 'triceps', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees, hands under shoulders, body straight from knees to head.', 'Lower your chest toward the floor.', 'Push back up.'], array['四足跪姿，雙手在肩膀下方，身體從膝蓋到頭呈一直線。', '將胸口下壓靠近地面。', '推回起始位置。'], array['A good stepping stone toward full push-ups.'], array['是邁向標準伏地挺身的好過渡。']),
('wide-push-up', 'Wide Push-up', '寬距伏地挺身', array['chest', 'shoulders', 'triceps', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Set your hands wider than shoulder-width in a high plank.', 'Lower your chest to the floor.', 'Press back up.'], array['高棒式，雙手放在寬於肩膀的位置。', '將胸口下壓至地面。', '推回起始位置。'], array['Keep your core tight so your hips don''t sag.'], array['核心繃緊，避免髖部下塌。']),
('diamond-push-up', 'Diamond Push-up', '鑽石伏地挺身', array['triceps', 'chest', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Place your hands together under your chest, forming a diamond with thumbs and index fingers.', 'Lower your chest toward your hands.', 'Press back up.'], array['雙手併攏放在胸口下方，拇指與食指形成菱形。', '將胸口下壓靠近雙手。', '推回起始位置。'], array['Keep your elbows close to your body.'], array['手肘貼近身體。']),
('decline-push-up', 'Decline Push-up', '下斜伏地挺身', array['lower_chest', 'shoulders', 'triceps', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Place feet on a bench, hands on the floor.', 'Lower your chest toward the floor under control.', 'Press back up to the start.'], array['雙腳放在訓練椅上，雙手撐地。', '控制節奏將胸口下壓靠近地面。', '推回起始位置。'], array['Harder than a standard push-up — keep hips from sagging.'], array['比一般伏地挺身更具挑戰性，注意髖部不要下垂。']),
('pike-push-up', 'Pike Push-up', '屈體伏地挺身', array['shoulders', 'triceps', 'chest', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a downward-dog position, hips high.', 'Bend your elbows to lower your head toward the floor.', 'Press back up.'], array['以下犬式開始，髖部抬高。', '彎曲手肘，讓頭部向地面下降。', '推回起始位置。'], array['Walk your feet closer to increase the shoulder load.'], array['將雙腳靠近手可增加肩膀負擔。']),
('feet-elevated-pike-push-up', 'Feet-Elevated Pike Push-up', '墊腳屈體伏地挺身', array['shoulders', 'triceps', 'chest', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Place your feet on a bench and walk your hands in to make a steep pike.', 'Lower your head toward the floor.', 'Press back up.'], array['雙腳放在椅子上，將手向內走近，形成陡峭的屈體姿勢。', '讓頭部向地面下降。', '推回起始位置。'], array['A step toward handstand push-ups.'], array['是邁向倒立伏地挺身的階段。']),
('archer-push-up', 'Archer Push-up', '弓箭手伏地挺身', array['chest', 'triceps', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a wide push-up position.', 'Lower toward one hand while the other arm stays straight.', 'Push back up and alternate sides.'], array['以寬距伏地挺身姿勢開始。', '向一隻手的方向下降，另一隻手保持伸直。', '推回後換邊。'], array['Start with a small range and progress gradually.'], array['先從小幅度開始，逐步加大。']),
('typewriter-push-up', 'Typewriter Push-up', '打字機伏地挺身', array['chest', 'triceps', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lower into the bottom of a wide push-up.', 'Shift your chest side to side over your hands.', 'Press back up.'], array['下降至寬距伏地挺身的底部。', '將胸口在雙手之間左右移動。', '推回起始位置。'], array['Keep your hips level as you shift.'], array['移動時髖部保持水平。']),
('explosive-push-up', 'Explosive Push-up', '爆發式伏地挺身', array['chest', 'triceps', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank.', 'Lower with control, then push up hard so your hands leave the floor.', 'Land softly and go into the next rep.'], array['從高棒式開始。', '控制下降，然後用力推起讓雙手離開地面。', '輕柔落地並進入下一下。'], array['Land with slightly bent elbows to absorb impact.'], array['落地時手肘微彎以緩衝衝擊。']),
('hindu-push-up', 'Hindu Push-up', '印度伏地挺身', array['chest', 'shoulders', 'triceps', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a pike position, hips high.', 'Sweep your chest down and forward between your hands.', 'Push through into an upward-dog, then reverse the path.'], array['以屈體姿勢開始，髖部抬高。', '將胸口向下向前劃過兩手之間。', '推起成上犬式，再反向回到起始。'], array['Move smoothly and stay within a comfortable back range.'], array['動作保持流暢，下背維持舒適的幅度。']),
('scapular-push-up', 'Scapular Push-up', '肩胛伏地挺身', array['upper_back', 'chest', 'shoulders', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank with straight arms.', 'Let your chest sink by pinching your shoulder blades together.', 'Push the floor away to spread your shoulder blades.'], array['以高棒式開始，手臂伸直。', '夾緊肩胛讓胸口下沉。', '推地讓肩胛打開。'], array['Keep your elbows locked — only your shoulder blades move.'], array['手肘維持伸直，只有肩胛移動。']),
('push-up-shoulder-tap', 'Push-up Shoulder Tap', '伏地挺身觸肩', array['abs', 'core', 'chest', 'shoulders', 'triceps'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Do a push-up.', 'At the top, tap one shoulder with the opposite hand.', 'Repeat on the other side.'], array['做一下伏地挺身。', '在頂端時用一手觸碰對側肩膀。', '換另一邊重複。'], array['Keep your hips still as you tap.'], array['觸肩時髖部保持不動。']),
('wall-push-up', 'Wall Push-up', '靠牆伏地挺身', array['chest', 'triceps', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand facing a wall, hands on it at chest height.', 'Bend your elbows to bring your chest toward the wall.', 'Push back to the start.'], array['面向牆壁站立，雙手扶牆於胸口高度。', '彎曲手肘讓胸口靠近牆面。', '推回起始位置。'], array['Step your feet further back to make it harder.'], array['腳離牆越遠難度越高。']),
('wall-walk', 'Wall Walk', '爬牆走', array['shoulders', 'core', 'chest', 'triceps'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank with your feet against a wall.', 'Walk your feet up the wall while walking your hands closer to it.', 'Walk back down under control.'], array['高棒式開始，雙腳靠牆。', '雙腳沿牆向上走，同時手向牆靠近。', '有控制地走回起始位置。'], array['Go only as high as you feel stable.'], array['只走到自己覺得穩定的高度。']),
('wall-handstand-push-up', 'Wall Handstand Push-up', '靠牆倒立伏地挺身', array['shoulders', 'triceps', 'core', 'chest'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Kick up into a handstand facing the wall.', 'Lower your head toward the floor by bending your elbows.', 'Press back up.'], array['面向牆壁倒立。', '彎曲手肘讓頭部向地面下降。', '推回起始位置。'], array['Use a mat or folded towel under your head for safety.'], array['頭下方放墊子或摺好的毛巾以確保安全。']),
('handstand-push-up', 'Handstand Push-up', '倒立伏地挺身', array['shoulders', 'triceps', 'core', 'chest'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Get into a stable handstand.', 'Lower your head toward the floor with control.', 'Press back up to straight arms.'], array['進入穩定的倒立姿勢。', '控制讓頭部向地面下降。', '推回至手臂伸直。'], array['Advanced move — build up with pike push-ups first.'], array['進階動作，先以屈體伏地挺身打好基礎。']),
('chair-dip', 'Chair Dip', '椅子撐體', array['triceps', 'chest', 'shoulders'], array['chair'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit on the edge of a sturdy chair, hands beside your hips.', 'Slide off and lower your body by bending your elbows.', 'Push back up until your arms are extended.'], array['坐在穩固椅子邊緣，雙手放在髖部兩側。', '向前滑出，屈肘下降身體。', '推回至手臂伸直。'], array['Keep elbows pointing backward, not flaring out to the sides.'], array['手肘朝後彎曲，避免向外側張開。']),
('doorway-row', 'Doorway Row', '門框划船', array['back', 'biceps', 'upper_back', 'core'], array['doorway'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Hold both sides of a sturdy door frame and lean back with straight arms.', 'Pull your chest toward the frame.', 'Lower slowly.'], array['雙手抓住堅固門框兩側，手臂伸直向後傾。', '將胸口拉向門框。', '緩慢放下。'], array['Check that the door frame is secure before leaning back.'], array['向後傾前先確認門框穩固。']),
('towel-row', 'Towel Row', '毛巾划船', array['back', 'biceps', 'upper_back', 'core'], array['towel'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Loop a towel around a sturdy post and hold both ends, leaning back.', 'Pull your chest toward the post.', 'Lower slowly.'], array['將毛巾繞過穩固的柱子，雙手握住兩端向後傾。', '將胸口拉向柱子。', '緩慢放下。'], array['Make sure the anchor is very secure.'], array['確認固定點非常穩固。']),
('prone-y-raise', 'Prone Y Raise', '俯臥 Y 字舉', array['upper_back', 'rear_delts', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie face down with arms extended overhead in a Y shape.', 'Lift your arms off the floor by squeezing your upper back.', 'Lower slowly.'], array['俯臥，雙臂向頭上方伸直呈Y字。', '夾緊上背，將手臂抬離地面。', '緩慢放下。'], array['Keep your neck neutral — look at the floor.'], array['頸部保持中立，視線朝向地面。']),
('prone-t-raise', 'Prone T Raise', '俯臥 T 字舉', array['upper_back', 'rear_delts', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie face down with arms out to the sides in a T shape.', 'Lift your arms by squeezing your shoulder blades together.', 'Lower slowly.'], array['俯臥，雙臂向兩側伸直呈T字。', '夾緊肩胛，將手臂抬起。', '緩慢放下。'], array['Thumbs up helps rotate the shoulders correctly.'], array['拇指朝上有助於肩膀正確旋轉。']),
('superman', 'Superman', '超人式', array['lower_back', 'glutes', 'upper_back', 'hamstrings'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie face down, arms extended forward.', 'Lift your arms, chest, and legs off the floor together.', 'Hold briefly, then lower with control.'], array['俯臥，雙臂向前伸直。', '同時將手臂、胸口與雙腳抬離地面。', '短暫停留後控制放下。'], array['Lift to a comfortable range — don''t force an arch.'], array['抬到舒適的範圍即可，不要勉強過度後仰。']),
('superman-hold', 'Superman Hold', '超人式維持', array['lower_back', 'glutes', 'upper_back', 'hamstrings'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie face down with arms extended in front.', 'Lift your arms, chest and legs off the floor.', 'Hold, then lower slowly.'], array['俯臥，雙臂向前伸直。', '同時抬起手臂、胸口與雙腿離地。', '維持後緩慢放下。'], array['Squeeze your glutes and avoid craning your neck.'], array['夾緊臀部，避免抬頭過度。']),
('reverse-snow-angel', 'Reverse Snow Angel', '反向雪天使', array['upper_back', 'rear_delts', 'lower_back', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie face down with arms at your sides, lifting your chest slightly.', 'Sweep your arms in an arc overhead like a snow angel.', 'Sweep them back to your sides.'], array['俯臥，手臂放在身側，胸口微微抬起。', '像雪天使一樣將手臂以弧線劃到頭上方。', '再劃回身側。'], array['Keep your arms hovering off the floor the whole time.'], array['全程手臂保持懸空離地。']),
('dead-hang', 'Dead Hang', '懸吊', array['forearms', 'lats', 'shoulders', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Grip a pull-up bar with hands shoulder-width apart.', 'Hang with your arms straight.', 'Hold for the target time.'], array['雙手與肩同寬握住單槓。', '手臂伸直懸吊。', '維持至目標時間。'], array['Breathe steadily and keep your grip firm.'], array['保持穩定呼吸，握力要穩。']),
('active-hang', 'Active Hang', '主動懸吊', array['lats', 'upper_back', 'forearms', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a pull-up bar with a firm grip.', 'Pull your shoulder blades down and back without bending your arms.', 'Hold for the target time.'], array['穩固握住單槓懸吊。', '手臂不彎，將肩胛向下向後收。', '維持至目標時間。'], array['Your body should rise slightly as the shoulder blades engage.'], array['肩胛啟動時，身體會微微上提。']),
('scapular-pull-up', 'Scapular Pull-up', '肩胛引體向上', array['lats', 'upper_back', 'forearms', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a pull-up bar with straight arms.', 'Pull your shoulder blades down to lift your body slightly.', 'Lower back to a full hang.'], array['手臂伸直懸吊在單槓上。', '將肩胛向下壓，使身體略微上提。', '放回完全懸吊。'], array['Keep your arms straight — the movement is small.'], array['手臂保持伸直，動作幅度很小。']),
('negative-pull-up', 'Negative Pull-up', '離心引體向上', array['lats', 'biceps', 'upper_back', 'forearms'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Jump or step up so your chin is above the bar.', 'Lower yourself as slowly as you can.', 'Reset and repeat.'], array['跳起或踩台階，讓下巴高過單槓。', '盡可能緩慢地放下身體。', '重新開始並重複。'], array['Aim for a 3–5 second lowering.'], array['目標是3到5秒的放下時間。']),
('commando-pull-up', 'Commando Pull-up', '突擊隊引體向上', array['lats', 'biceps', 'upper_back', 'core'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Grip a bar with one hand in front and one behind, standing sideways to it.', 'Pull up until your head passes the bar to one side.', 'Lower and switch sides.'], array['側身面對單槓，一手在前、一手在後握住。', '拉起直到頭部越過橫槓一側。', '放下後換邊。'], array['Alternate which side your head passes.'], array['交替頭部越過的一側。']),
('l-sit-pull-up', 'L-Sit Pull-up', 'L 型引體向上', array['lats', 'biceps', 'core', 'forearms'], array['pull_up_bar'], array['large_gym', 'small_gym', 'garage_gym'], array['Hang from a bar and lift your legs straight out in front.', 'Pull up while holding your legs up.', 'Lower with control.'], array['懸吊在單槓上，將雙腿向前伸直抬起。', '保持雙腿抬高的同時拉起。', '控制放下。'], array['Bend your knees if straight legs are too hard.'], array['若直腿太難可彎曲膝蓋。']),
('towel-pull-up', 'Towel Pull-up', '毛巾引體向上', array['lats', 'biceps', 'forearms', 'upper_back'], array['towel'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Drape a towel over a pull-up bar and grip both ends.', 'Pull yourself up until your chin is at your hands.', 'Lower with control.'], array['將毛巾披在單槓上，雙手握住兩端。', '拉起身體至下巴接近雙手。', '控制放下。'], array['The towel makes your grip work much harder.'], array['毛巾會大幅增加握力負擔。']),
('bodyweight-squat', 'Bodyweight Squat', '徒手深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand with feet shoulder-width apart.', 'Sit your hips back and down until thighs are parallel to the floor.', 'Drive through your heels to stand back up.'], array['雙腳與肩同寬站立。', '將髖部往後往下坐，直到大腿與地面平行。', '用腳跟發力站起。'], array['Keep your chest up and knees tracking over your toes.'], array['保持胸口挺起，膝蓋方向與腳尖一致。']),
('pistol-squat', 'Pistol Squat', '單腿深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one leg with the other leg extended forward.', 'Sit back and down on the standing leg as low as you can.', 'Drive through your heel to stand.'], array['單腳站立，另一腿向前伸直。', '以站立腳向後向下坐到最低。', '用腳跟發力站起。'], array['Hold a support or use a box until you build the strength.'], array['先扶著支撐物或使用箱子，直到力量足夠。']),
('assisted-pistol-squat', 'Assisted Pistol Squat', '輔助單腿深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Hold a stable support with one hand and stand on one leg.', 'Lower into a single-leg squat.', 'Use the support lightly to help you stand.'], array['單手扶著穩固支撐物，單腳站立。', '下蹲成單腿深蹲。', '輕輕借助支撐物協助站起。'], array['Reduce how much you pull on the support over time.'], array['逐漸減少對支撐物的依賴。']),
('shrimp-squat', 'Shrimp Squat', '蝦式深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one leg and hold your other foot behind you.', 'Lower until your back knee touches the floor.', 'Drive up through your standing leg.'], array['單腳站立，另一腳向後抓住。', '下蹲直到後膝碰到地面。', '用站立腿發力站起。'], array['Hold a support if you need help balancing.'], array['需要平衡時可扶住支撐物。']),
('cossack-squat', 'Cossack Squat', '哥薩克深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand with a wide stance, toes slightly out.', 'Shift your weight to one side and squat deep on that leg while the other stays straight.', 'Return to center and switch.'], array['雙腳站得很寬，腳尖微微外開。', '重心移向一側並深蹲，另一腿保持伸直。', '回到中間後換邊。'], array['Keep your heel down on the bent leg.'], array['彎曲腿的腳跟保持踩實。']),
('sissy-squat', 'Sissy Squat', '西西深蹲', array['quads', 'core', 'calves'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand holding a support, rise onto your toes.', 'Lean back and bend your knees forward, lowering your body.', 'Return by pushing your knees back.'], array['扶住支撐物站立，踮起腳尖。', '身體向後傾，讓膝蓋向前彎曲下降。', '將膝蓋往後推回起始位置。'], array['Very quad-focused and knee-demanding — go slowly.'], array['非常鎖定股四頭肌且膝蓋負擔大，請放慢速度。']),
('forward-lunge', 'Forward Lunge', '前跨步蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall and step one foot forward.', 'Lower until both knees are about 90 degrees.', 'Push back to the start and switch legs.'], array['站直，單腳向前跨出。', '下蹲至兩膝約呈90度。', '蹬回起始位置並換腳。'], array['Keep your front knee over your ankle.'], array['前膝保持在腳踝上方。']),
('lateral-lunge', 'Lateral Lunge', '側弓箭步', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand with feet together and step wide to one side.', 'Sit back into that hip, keeping the other leg straight.', 'Push off to return and switch sides.'], array['雙腳併攏站立，向一側大步跨出。', '坐入該側髖部，另一腿保持伸直。', '蹬地回到起始位置後換邊。'], array['Keep your chest tall and both feet flat.'], array['胸口挺起，雙腳踩平。']),
('curtsy-lunge', 'Curtsy Lunge', '交叉弓箭步', array['glutes', 'quads', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall with feet hip-width apart.', 'Step one leg back and across behind the other, lowering into a lunge.', 'Return to standing and switch.'], array['雙腳與髖同寬站直。', '一腳向後並交叉到另一腿後方，下蹲成弓箭步。', '回到站姿後換腳。'], array['Keep your hips facing forward.'], array['髖部保持朝前。']),
('skater-squat', 'Skater Squat', '滑冰者深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one leg and reach the other leg behind you.', 'Lower until your back knee nearly touches the floor.', 'Stand back up on the working leg.'], array['單腳站立，另一腿向後伸出。', '下蹲至後膝接近地面。', '用工作腿站起。'], array['Swing your arms forward for balance.'], array['手臂向前擺動維持平衡。']),
('single-leg-box-squat', 'Single-Leg Box Squat', '單腿箱式深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array['step_box'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand in front of a box on one leg with the other leg extended.', 'Sit back until you lightly touch the box.', 'Stand up using the working leg.'], array['單腳站在箱子前，另一腿伸出。', '向後坐直到輕觸箱子。', '用工作腿站起。'], array['Use a higher box first and lower it as you get stronger.'], array['先使用較高的箱子，力量增加後再降低。']),
('step-down', 'Step-Down', '下階', array['quads', 'glutes', 'hamstrings', 'calves'], array['step_box'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on a box with one foot hanging off the edge.', 'Slowly lower the free heel toward the floor by bending the standing leg.', 'Press back up to the top.'], array['站在箱子上，一腳懸空在邊緣外。', '彎曲站立腿，緩慢將懸空腳的腳跟放向地面。', '推回頂端。'], array['Keep your knee tracking over your toes.'], array['膝蓋保持朝腳尖方向。']),
('calf-raise', 'Calf Raise', '站姿提踵', array['calves'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall, feet hip-width apart.', 'Rise up onto the balls of your feet as high as possible.', 'Lower back down slowly.'], array['站直，雙腳與髖同寬。', '盡量踮起腳尖向上抬高。', '緩慢放下。'], array['Use a wall or chair for balance if needed.'], array['若需要平衡輔助，可扶牆或椅子。']),
('single-leg-calf-raise', 'Single-Leg Calf Raise', '單腿提踵', array['calves', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one foot, holding a wall for balance.', 'Rise as high as you can onto your toes.', 'Lower slowly to a full stretch.'], array['單腳站立，扶牆維持平衡。', '盡量踮高腳尖。', '緩慢放下至完全伸展。'], array['Use a step to increase the range of motion.'], array['站在台階邊緣可增加動作幅度。']),
('glute-bridge-march', 'Glute Bridge March', '臀橋抬腿踏步', array['glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back and lift into a glute bridge.', 'Lift one foot off the floor, then switch.', 'Keep your hips level as you march.'], array['仰躺並抬起成臀橋姿勢。', '抬起一隻腳離地，然後換腳。', '踏步時保持髖部水平。'], array['Don''t let your hips drop on the lifted side.'], array['抬腳側的髖部不要下沉。']),
('frog-pump', 'Frog Pump', '青蛙臀推', array['glutes', 'hamstrings'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with the soles of your feet together and knees out wide.', 'Drive your hips up by squeezing your glutes.', 'Lower slowly.'], array['仰躺，雙腳腳掌相對，膝蓋向外打開。', '夾緊臀部將髖部向上推。', '緩慢放下。'], array['Use higher reps for a strong burn.'], array['使用較高次數可獲得強烈燃燒感。']),
('donkey-kick', 'Donkey Kick', '驢子後踢', array['glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees with a flat back.', 'Kick one leg back and up, knee bent at 90 degrees.', 'Lower and repeat, then switch legs.'], array['四足跪姿，背部保持平直。', '將一腿向後向上踢，膝蓋維持90度。', '放下並重複，之後換腳。'], array['Don''t arch your lower back to lift higher.'], array['不要為了抬更高而拱下背。']),
('fire-hydrant', 'Fire Hydrant', '消防栓式', array['glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees.', 'Lift one knee out to the side, keeping it bent.', 'Lower and repeat, then switch legs.'], array['四足跪姿開始。', '將一側膝蓋向外側抬起並保持彎曲。', '放下並重複，之後換腳。'], array['Keep your torso still — only your hip moves.'], array['軀幹保持穩定，只有髖部在動。']),
('clamshell', 'Clamshell', '蚌殼式', array['glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your side with knees bent and feet together.', 'Open your top knee like a clamshell without moving your pelvis.', 'Lower slowly.'], array['側躺，屈膝，雙腳併攏。', '骨盆不動，像蚌殼一樣打開上方膝蓋。', '緩慢放下。'], array['Don''t roll your hips back.'], array['髖部不要向後翻。']),
('hip-airplane', 'Hip Airplane', '髖部飛機式', array['glutes', 'hamstrings', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one leg and hinge forward, the other leg extended back.', 'Rotate your hips open, then closed, like airplane wings.', 'Return to standing.'], array['單腳站立，身體前傾，另一腿向後伸直。', '將髖部向外打開再關閉，像飛機機翼一樣。', '回到站姿。'], array['Hold a wall lightly if you need balance.'], array['需要平衡時可輕扶牆壁。']),
('side-lying-hip-abduction', 'Side-Lying Hip Abduction', '側躺髖外展', array['glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your side with legs straight and stacked.', 'Lift your top leg toward the ceiling.', 'Lower slowly.'], array['側躺，雙腿伸直疊放。', '將上方腿向天花板抬起。', '緩慢放下。'], array['Keep your toes pointing forward.'], array['腳尖保持朝前。']),
('side-lying-leg-raise', 'Side-Lying Leg Raise', '側躺抬腿', array['glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your side with your bottom arm supporting your head.', 'Raise your top leg with control.', 'Lower without letting your hips rock back.'], array['側躺，下方手臂撐住頭部。', '有控制地抬起上方腿。', '放下時髖部不要向後晃動。'], array['Move slowly rather than lifting as high as possible.'], array['放慢速度比抬到最高更重要。']),
('lying-hamstring-walkout', 'Lying Hamstring Walkout', '仰臥腿後側滑行', array['hamstrings', 'glutes', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back in a glute bridge.', 'Walk your feet out away from you while keeping your hips up.', 'Walk them back in.'], array['仰躺成臀橋姿勢。', '保持髖部抬高，將雙腳向外走遠。', '再走回來。'], array['Only go as far as you can control.'], array['只走到自己能控制的距離。']),
('towel-hamstring-curl', 'Towel Hamstring Curl', '毛巾腿彎舉', array['hamstrings', 'glutes', 'core'], array['towel'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with your heels on towels on a smooth floor and hips lifted.', 'Slide your heels away, then curl them back in.', 'Keep your hips high.'], array['仰躺，雙腳腳跟放在光滑地板上的毛巾上，髖部抬起。', '將腳跟向外滑出，再彎收回來。', '髖部保持抬高。'], array['Slow controlled reps are harder than they look.'], array['慢而有控制的動作比看起來更困難。']),
('stability-ball-hamstring-curl', 'Stability Ball Hamstring Curl', '瑞士球腿彎舉', array['hamstrings', 'glutes', 'core'], array['stability_ball'], array['large_gym'], array['Lie on your back with your heels on a stability ball and hips lifted.', 'Roll the ball toward your glutes.', 'Roll it back out slowly.'], array['仰躺，雙腳腳跟放在瑞士球上，髖部抬起。', '將球滾向臀部。', '緩慢滾回。'], array['Keep your hips lifted throughout.'], array['全程保持髖部抬高。']),
('banded-glute-bridge', 'Banded Glute Bridge', '彈力帶臀橋', array['glutes', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your back with a band above your knees.', 'Drive your hips up while pushing your knees out against the band.', 'Lower slowly.'], array['仰躺，膝蓋上方套上彈力帶。', '抬起髖部，同時將膝蓋向外撐開對抗彈力帶。', '緩慢放下。'], array['Keep tension on the band the whole time.'], array['全程保持彈力帶的張力。']),
('banded-hip-thrust', 'Banded Hip Thrust', '彈力帶臀推', array['glutes', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit with your upper back on a bench and a band above your knees.', 'Thrust your hips up and push your knees out.', 'Lower with control.'], array['上背靠在椅上，膝蓋上方套上彈力帶。', '向上推髖並將膝蓋向外撐開。', '控制放下。'], array['Squeeze your glutes hard at the top.'], array['頂端時用力夾緊臀部。']),
('banded-clamshell', 'Banded Clamshell', '彈力帶蚌殼式', array['glutes', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your side with a band above your knees, feet together.', 'Open your top knee against the band.', 'Lower slowly.'], array['側躺，膝蓋上方套彈力帶，雙腳併攏。', '對抗彈力帶打開上方膝蓋。', '緩慢放下。'], array['Keep your pelvis stable.'], array['骨盆保持穩定。']),
('banded-lateral-walk', 'Banded Lateral Walk', '彈力帶側走', array['glutes', 'quads', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Place a loop band around your legs above the knees.', 'Bend your knees slightly and step sideways.', 'Take several steps in one direction, then reverse.'], array['將環狀彈力帶套在膝蓋上方。', '微屈膝，向側邊跨步。', '朝一個方向走數步後，反方向走回。'], array['Keep tension on the band throughout — don''t let your feet drift together.'], array['全程保持彈力帶張力，避免雙腳靠攏。']),
('banded-monster-walk', 'Banded Monster Walk', '彈力帶怪物走', array['glutes', 'quads', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Place a band around your ankles or above your knees and bend your knees slightly.', 'Step out to the side, keeping tension on the band.', 'Step the other foot in without letting it slacken.'], array['將彈力帶套在腳踝或膝蓋上方，膝蓋微彎。', '向側邊跨步，保持彈力帶張力。', '另一腳跟上，不要讓彈力帶鬆掉。'], array['Stay low and keep your toes pointing forward.'], array['身體保持低姿，腳尖朝前。']),
('banded-squat', 'Banded Squat', '彈力帶深蹲', array['quads', 'glutes', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand on the band, hold the handles at shoulder height.', 'Squat down until thighs are near parallel to the floor.', 'Drive through your heels to stand back up.'], array['雙腳踩住彈力帶，雙手握把手於肩膀高度。', '蹲下直到大腿接近與地面平行。', '用腳跟發力站起。'], array['The band adds resistance that increases as you stand up.'], array['彈力帶阻力會隨站起而增加。']),
('banded-donkey-kick', 'Banded Donkey Kick', '彈力帶驢子後踢', array['glutes', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Start on hands and knees with a band around your feet or above your knees.', 'Kick one leg back and up against the band.', 'Lower and repeat.'], array['四足跪姿，彈力帶套在腳上或膝蓋上方。', '對抗彈力帶將一腿向後向上踢。', '放下並重複。'], array['Keep your hips square to the floor.'], array['髖部保持正對地面。']),
('banded-fire-hydrant', 'Banded Fire Hydrant', '彈力帶消防栓式', array['glutes', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Start on hands and knees with a band above your knees.', 'Lift one knee out to the side against the band.', 'Lower and repeat.'], array['四足跪姿，膝蓋上方套彈力帶。', '對抗彈力帶將一側膝蓋向外抬起。', '放下並重複。'], array['Keep your torso still.'], array['軀幹保持穩定。']),
('banded-kickback', 'Banded Kickback', '彈力帶後踢', array['glutes', 'hamstrings', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor a band low and loop it around one ankle, holding a support.', 'Kick the leg straight back, squeezing your glute.', 'Return slowly.'], array['將彈力帶固定在低處並套在一側腳踝，手扶支撐物。', '將腿向後踢直並夾緊臀部。', '緩慢放回。'], array['Don''t lean forward to gain range.'], array['不要靠前傾來增加幅度。']),
('banded-standing-hip-abduction', 'Banded Standing Hip Abduction', '彈力帶站姿髖外展', array['glutes', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Stand with a band around your ankles or above your knees.', 'Lift one leg out to the side against the band.', 'Return slowly.'], array['站立，彈力帶套在腳踝或膝蓋上方。', '對抗彈力帶將一腿向側邊抬起。', '緩慢放回。'], array['Keep your torso upright.'], array['上身保持直立。']),
('banded-seated-hip-abduction', 'Banded Seated Hip Abduction', '彈力帶坐姿髖外展', array['glutes', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Sit on a chair with a band above your knees.', 'Push your knees apart against the band.', 'Bring them back slowly.'], array['坐在椅子上，膝蓋上方套彈力帶。', '對抗彈力帶將雙膝向外打開。', '緩慢收回。'], array['Sit tall and squeeze at the end range.'], array['坐挺，在最大幅度時用力。']),
('band-pull-apart', 'Band Pull-Apart', '彈力帶拉開', array['upper_back', 'rear_delts', 'shoulders'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Hold a band with both hands, arms extended in front of you.', 'Pull the band apart by moving your arms out to the sides.', 'Return with control to the start.'], array['雙手握彈力帶，雙臂向前伸直。', '雙臂向外側拉開彈力帶。', '控制放回起始位置。'], array['Keep your arms straight throughout the movement.'], array['全程保持手臂伸直。']),
('banded-face-pull', 'Banded Face Pull', '彈力帶面拉', array['upper_back', 'rear_delts', 'shoulders'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor a band at head height and hold both ends with straight arms.', 'Pull toward your face, elbows high and out.', 'Return slowly.'], array['將彈力帶固定在頭部高度，雙手伸直握住兩端。', '手肘抬高外展，將彈力帶拉向臉部。', '緩慢放回。'], array['Squeeze your rear delts at the end.'], array['拉到底時夾緊後三角肌。']),
('banded-row', 'Banded Row', '彈力帶划船', array['back', 'biceps', 'upper_back'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor the band at chest height, hold an end in each hand.', 'Pull both handles toward your torso, elbows close to your body.', 'Return with control to the start.'], array['將彈力帶固定於胸口高度，雙手各握一端。', '將把手拉向軀幹，手肘貼近身體。', '控制放回起始位置。'], array['Squeeze your shoulder blades together at the end of the pull.'], array['拉到底時夾緊肩胛骨。']),
('banded-lat-pulldown', 'Banded Lat Pulldown', '彈力帶下拉', array['lats', 'biceps', 'core'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor a band overhead and hold it with arms extended above you.', 'Pull it down to your upper chest, driving your elbows down.', 'Return slowly.'], array['將彈力帶固定在頭頂上方，雙臂向上伸直握住。', '手肘向下發力，將彈力帶拉至上胸。', '緩慢放回。'], array['Kneel or stand tall to keep your posture steady.'], array['跪姿或站直以維持姿勢穩定。']),
('banded-pallof-press', 'Banded Pallof Press', '彈力帶帕洛夫推', array['obliques', 'core', 'glutes', 'shoulders'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor a band at chest height and stand sideways to it, holding it at your chest.', 'Press your hands straight out.', 'Bring them back without rotating.'], array['將彈力帶固定在胸口高度，側身站立，握在胸前。', '將雙手向正前方推出。', '收回時不要旋轉身體。'], array['Resist the band pulling you sideways.'], array['抵抗彈力帶把你拉向側邊。']),
('banded-woodchop', 'Banded Woodchop', '彈力帶砍木', array['obliques', 'core', 'shoulders', 'glutes'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Anchor a band high and stand sideways to it, holding it with both hands.', 'Pull it diagonally across your body to your opposite hip.', 'Return slowly and repeat before switching sides.'], array['將彈力帶固定在高處，側身站立，雙手握住。', '沿對角線將其拉過身體至對側髖部。', '緩慢放回，重複後換邊。'], array['Rotate through your torso, not just your arms.'], array['用軀幹旋轉，而不只是手臂。']),
('banded-dead-bug', 'Banded Dead Bug', '彈力帶死蟲式', array['abs', 'core', 'glutes', 'shoulders'], array['resistance_bands'], array['large_gym', 'small_gym', 'garage_gym'], array['Lie on your back holding a band overhead with knees bent over your hips.', 'Extend one leg while pulling the band taut.', 'Return and switch sides.'], array['仰躺，雙手握彈力帶舉過頭，屈膝在髖部上方。', '伸直一腿同時將彈力帶拉緊。', '回到起始位置，換邊。'], array['Keep your lower back pressed down.'], array['下背保持貼地。']),
('hollow-body-hold', 'Hollow Body Hold', '空心撐體', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back and press your lower back into the floor.', 'Lift your shoulders and legs a few inches off the floor.', 'Hold the position.'], array['仰躺，將下背壓向地面。', '抬起肩膀與雙腿離地幾公分。', '維持此姿勢。'], array['Bend your knees if your lower back lifts.'], array['若下背翹起，可彎曲膝蓋。']),
('hollow-rock', 'Hollow Rock', '空心搖擺', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Get into a hollow body hold.', 'Rock back and forth while keeping your body rigid.', 'Keep your lower back pressed down.'], array['進入空心撐體姿勢。', '保持身體僵直，前後搖擺。', '下背保持貼地。'], array['Small, controlled rocks are better than big ones.'], array['小而有控制的搖擺比大幅度更好。']),
('v-up', 'V-Up', 'V 字起身', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie flat on your back with arms overhead.', 'Lift your legs and torso at the same time, reaching toward your toes.', 'Lower with control.'], array['仰躺，雙臂舉過頭。', '同時抬起雙腿與上身，手向腳尖伸去。', '控制放下。'], array['Bend your knees slightly to make it easier.'], array['稍微彎曲膝蓋可降低難度。']),
('flutter-kick', 'Flutter Kick', '交替踢腿', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with legs straight and lifted slightly off the floor.', 'Kick your legs up and down in small alternating motions.', 'Keep your lower back pressed down.'], array['仰躺，雙腿伸直並略微抬離地面。', '以小幅度上下交替踢腿。', '下背保持貼地。'], array['Keep the kicks small and steady.'], array['踢腿幅度要小且穩定。']),
('lying-leg-raise', 'Lying Leg Raise', '躺姿抬腿', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back, legs straight, hands by your sides.', 'Raise your legs to vertical, keeping them straight.', 'Lower slowly without letting your lower back arch off the floor.'], array['仰躺，雙腳伸直，雙手放身體兩側。', '將雙腳抬至垂直，保持腿部伸直。', '緩慢放下，避免下背離地拱起。'], array['Bend your knees slightly if your lower back lifts off the floor.'], array['若下背會離地，可稍微屈膝降低難度。']),
('toe-touch', 'Toe Touch', '仰臥觸趾', array['lower_abs', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with legs straight up in the air.', 'Reach your hands toward your toes by curling your shoulders up.', 'Lower slowly.'], array['仰躺，雙腿向上伸直。', '捲起肩膀，雙手向腳尖伸去。', '緩慢放下。'], array['Lift with your abs, not by swinging your arms.'], array['用腹肌發力，而不是靠甩手臂。']),
('heel-tap', 'Heel Tap', '仰臥觸踵', array['obliques', 'core'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on your back with knees bent and shoulders slightly lifted.', 'Reach one hand to tap the same-side heel.', 'Alternate sides.'], array['仰躺屈膝，肩膀略微抬起。', '伸手觸碰同側腳跟。', '左右交替。'], array['Crunch sideways to feel your obliques.'], array['向側邊捲動以感受腹斜肌。']),
('plank-shoulder-tap', 'Plank Shoulder Tap', '棒式觸肩', array['abs', 'core', 'shoulders', 'chest'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high plank with your feet slightly wider than hip-width.', 'Tap one shoulder with the opposite hand.', 'Alternate without rocking your hips.'], array['高棒式，雙腳略寬於髖。', '用一手觸碰對側肩膀。', '交替進行且不要晃動髖部。'], array['Widen your feet to make it easier.'], array['腳站寬一些可降低難度。']),
('plank-jack', 'Plank Jack', '棒式開合跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a high or forearm plank.', 'Jump your feet apart, then back together.', 'Keep your hips level.'], array['以高棒式或手肘棒式開始。', '雙腳跳開再跳回併攏。', '髖部保持水平。'], array['Step out one foot at a time for a low-impact version.'], array['一次一腳踏出可做成低衝擊版本。']),
('bear-plank', 'Bear Plank', '熊式撐體', array['abs', 'core', 'quads', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees, then lift your knees an inch off the floor.', 'Keep your back flat and core tight.', 'Hold the position.'], array['四足跪姿，將膝蓋抬離地面約2.5公分。', '背部平直，核心繃緊。', '維持此姿勢。'], array['Keep your knees under your hips.'], array['膝蓋保持在髖部下方。']),
('bear-crawl', 'Bear Crawl', '熊爬', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Get into a bear plank position.', 'Move opposite hand and foot forward together.', 'Continue crawling with a flat back.'], array['進入熊式撐體姿勢。', '同時向前移動對側的手與腳。', '背部保持平直持續爬行。'], array['Keep your knees low and hips level.'], array['膝蓋保持低位、髖部水平。']),
('crab-walk', 'Crab Walk', '螃蟹走', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit with hands behind you and lift your hips off the floor.', 'Walk your hands and feet in one direction.', 'Keep your hips lifted.'], array['坐姿，雙手撐在身後，將髖部抬離地面。', '手腳同時朝一個方向移動。', '全程保持髖部抬高。'], array['Keep your chest open and shoulders back.'], array['胸口打開，肩膀向後。']),
('inchworm', 'Inchworm', '尺蠖爬行', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall, then fold forward and place your hands on the floor.', 'Walk your hands out to a plank.', 'Walk your feet toward your hands and stand up.'], array['站直，向前彎腰將雙手放地。', '雙手向前走成棒式。', '雙腳走向雙手再站起。'], array['Keep your legs as straight as you comfortably can.'], array['在舒適範圍內盡量保持雙腿伸直。']),
('l-sit-hold', 'L-Sit Hold', 'L 型支撐', array['abs', 'core', 'triceps', 'quads', 'shoulders'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit with hands beside your hips on the floor or parallettes.', 'Press down to lift your hips and legs off the ground.', 'Hold with legs straight in front.'], array['坐姿，雙手放在髖部兩側的地面或平行槓上。', '向下撐起，讓髖部與雙腿離地。', '雙腿向前伸直維持。'], array['Bend your knees to start.'], array['可先彎曲膝蓋開始練習。']),
('seated-knee-tuck', 'Seated Knee Tuck', '坐姿收膝', array['lower_abs', 'core', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit on the edge of a bench and lean back slightly, legs extended.', 'Bring your knees toward your chest.', 'Extend your legs back out.'], array['坐在椅子邊緣，身體微微後傾，雙腿伸直。', '將膝蓋收向胸口。', '再將雙腿伸出。'], array['Keep your chest up and don''t collapse.'], array['胸口挺起，不要塌陷。']),
('side-plank-hip-dip', 'Side Plank Hip Dip', '側棒式髖部下沉', array['obliques', 'core', 'shoulders', 'glutes'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start in a side plank on your forearm.', 'Lower your hip toward the floor.', 'Lift it back up.'], array['以前臂撐起成側棒式。', '將髖部向地面下降。', '再抬回起始位置。'], array['Keep your body in a straight line from head to feet.'], array['身體從頭到腳保持一直線。']),
('copenhagen-plank', 'Copenhagen Plank', '哥本哈根側棒式', array['obliques', 'core', 'quads', 'glutes'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Get into a side plank with your top leg resting on a bench.', 'Lift your bottom leg to meet the top one.', 'Hold the position.'], array['側棒式，將上方腿放在椅子上。', '將下方腿抬起靠上方腿。', '維持此姿勢。'], array['Start with your knee on the bench for an easier version.'], array['先將膝蓋放在椅子上可降低難度。']),
('dragon-flag', 'Dragon Flag', '龍旗', array['lower_abs', 'core', 'lats', 'quads'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Lie on a bench and grip behind your head.', 'Lift your body into a straight line with only your shoulders on the bench.', 'Lower slowly.'], array['躺在椅上，雙手抓住頭後方。', '將身體抬成一直線，僅肩膀著椅。', '緩慢放下。'], array['Advanced — build up with hanging leg raises first.'], array['進階動作，先以懸吊抬腿打好基礎。']),
('burpee', 'Burpee', '波比跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['From standing, drop into a squat and place hands on the floor.', 'Kick your feet back into a plank, then return them to your hands.', 'Stand and jump up explosively, then repeat.'], array['站姿蹲下，雙手撐地。', '雙腳向後跳成棒式，再跳回雙手旁。', '站起並向上跳躍，重複動作。'], array['Scale by removing the jump if needed early on.'], array['初期若吃力，可省略最後的跳躍動作。']),
('half-burpee', 'Half Burpee', '半波比跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall, then squat and place your hands on the floor.', 'Step or jump your feet back to a plank.', 'Return your feet and stand up.'], array['站直，蹲下將雙手放在地上。', '雙腳向後踏出或跳出成棒式。', '收回雙腳並站起。'], array['Skip the push-up and jump for a lower-impact version.'], array['不做伏地挺身與跳躍即可降低衝擊。']),
('squat-thrust', 'Squat Thrust', '深蹲撐跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Squat down and place your hands on the floor.', 'Kick your feet back into a plank.', 'Jump your feet back in and stand.'], array['蹲下並將雙手放在地上。', '雙腳向後踢出成棒式。', '跳回雙腳並站起。'], array['Keep your core tight in the plank.'], array['棒式時核心保持繃緊。']),
('high-knees', 'High Knees', '高抬腿', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall and jog in place.', 'Drive your knees up toward waist height each step.', 'Pump your arms and keep a quick, steady rhythm.'], array['站直並原地小跑。', '每一步都將膝蓋抬高至腰部高度。', '雙臂擺動，維持快速穩定的節奏。'], array['Land on the balls of your feet, not flat-footed.'], array['用前腳掌著地，避免整腳掌拍地。']),
('jumping-jack', 'Jumping Jack', '開合跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start standing with feet together, arms at your sides.', 'Jump your feet out while raising your arms overhead.', 'Jump back to the start and repeat continuously.'], array['雙腳併攏站立，雙手放身體兩側。', '跳開雙腳的同時將雙手舉過頭頂。', '跳回起始姿勢並連續重複。'], array['Keep a soft bend in your knees when landing.'], array['落地時膝蓋保持微彎緩衝。']),
('skater-hop', 'Skater Hop', '滑冰跳', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand on one leg and leap sideways to the other leg.', 'Land softly with a bent knee, back leg swinging behind.', 'Repeat side to side.'], array['單腳站立，向側邊跳到另一腳。', '屈膝輕柔落地，後腿向後擺。', '左右交替。'], array['Land quietly to protect your joints.'], array['輕輕落地以保護關節。']),
('lateral-shuffle', 'Lateral Shuffle', '側向滑步', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand in a slight squat with feet shoulder-width apart.', 'Shuffle sideways several steps without crossing your feet.', 'Change direction and repeat.'], array['微蹲，雙腳與肩同寬。', '向側邊滑步數步，雙腳不要交叉。', '換方向重複。'], array['Stay low and keep your chest up.'], array['保持低姿並挺胸。']),
('sprawl', 'Sprawl', '撲地', array['cardio'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall, then drop your hands to the floor.', 'Kick your feet back and lower your hips toward the ground.', 'Jump your feet in and stand back up.'], array['站直，然後雙手放到地上。', '雙腳向後踢出，髖部向地面下降。', '跳回雙腳並站起。'], array['Move quickly, but land your feet under your hips.'], array['動作要快，但雙腳落在髖部下方。']),
('cat-cow-stretch', 'Cat-Cow Stretch', '貓牛式伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Start on hands and knees.', 'Arch your back and lift your chest and tailbone (cow).', 'Round your spine and tuck your chin (cat).'], array['四足跪姿開始。', '拱起背部，胸口與尾骨上揚（牛式）。', '圓起脊椎並收下巴（貓式）。'], array['Move with your breath — inhale to arch, exhale to round.'], array['配合呼吸，吸氣拱背，吐氣圓背。']),
('arm-circles', 'Arm Circles', '手臂繞圈', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall with arms straight out to the sides.', 'Make small circles forward.', 'Reverse direction.'], array['站直，雙臂向兩側伸直。', '向前畫小圓圈。', '再反方向畫圈。'], array['Gradually increase the circle size.'], array['逐漸加大圓圈幅度。']),
('worlds-greatest-stretch', 'World''s Greatest Stretch', '世界最強伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Step into a deep lunge and place both hands inside your front foot.', 'Rotate your chest toward the front knee and reach that arm up.', 'Return and switch sides.'], array['向前跨出成深弓箭步，雙手放在前腳內側。', '將胸口轉向前膝並向上伸手。', '回到起始位置後換邊。'], array['Move slowly and breathe into each stretch.'], array['動作放慢，隨呼吸加深伸展。']),
('leg-swings-stretch', 'Leg Swings', '擺腿伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand holding a wall for support.', 'Swing one leg forward and back in a controlled arc.', 'Switch legs.'], array['站立，扶牆支撐。', '有控制地前後擺動一腿。', '換腿。'], array['Start small and let the range grow naturally.'], array['從小幅度開始，讓幅度自然增大。']),
('torso-twist-stretch', 'Torso Twists', '軀幹扭轉伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand with feet shoulder-width apart and arms bent at chest height.', 'Rotate your torso to one side.', 'Rotate to the other side.'], array['雙腳與肩同寬站立，手臂彎曲在胸口高度。', '將軀幹轉向一側。', '再轉向另一側。'], array['Keep your hips facing forward.'], array['髖部保持朝前。']),
('doorway-chest-stretch', 'Doorway Chest Stretch', '門框胸部伸展', array['mobility'], array['doorway'], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand in a doorway with your forearms on the frame, elbows at shoulder height.', 'Step one foot forward and gently lean through.', 'Hold the stretch.'], array['站在門口，前臂放在門框上，手肘與肩同高。', '單腳向前跨步並輕輕前傾。', '維持伸展。'], array['Stop if you feel any pinching in your shoulders.'], array['若肩膀有夾擠感請停止。']),
('childs-pose', 'Child''s Pose', '嬰兒式', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Kneel and sit your hips back toward your heels.', 'Reach your arms forward along the floor.', 'Rest your forehead down and breathe.'], array['跪姿，將髖部向後坐向腳跟。', '雙臂沿地面向前伸展。', '額頭貼地並放鬆呼吸。'], array['Widen your knees if it''s more comfortable.'], array['若更舒適可將膝蓋分開。']),
('kneeling-hip-flexor-stretch', 'Kneeling Hip Flexor Stretch', '跪姿髖屈肌伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Kneel on one knee with the other foot forward.', 'Tuck your pelvis and gently shift your hips forward.', 'Hold, then switch sides.'], array['單膝跪地，另一腳向前。', '骨盆微收，輕輕將髖部向前推。', '維持後換邊。'], array['Squeeze the glute on the kneeling side to deepen it.'], array['夾緊跪地側的臀部可加深伸展。']),
('hamstring-stretch', 'Hamstring Stretch', '腿後側伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Place one heel on a low step, bench or rail with that leg straight.', 'Hinge forward from the hips with a flat back until you feel a stretch behind your thigh.', 'Hold, then switch legs.'], array['將一腳腳跟放在低台階、長椅或欄桿上，腿伸直。', '背部平直，從髖部向前傾，直到大腿後側有伸展感。', '維持後換腿。'], array['Stop where you feel a mild stretch — don''t bounce.'], array['伸展到輕微緊繃即可，不要彈震。']),
('standing-quad-stretch', 'Standing Quad Stretch', '站姿股四頭肌伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand tall and hold onto a support if needed.', 'Bend one knee and hold your ankle behind you.', 'Keep your knees together and hold.'], array['站直，必要時扶著支撐物。', '彎曲一膝，向後抓住腳踝。', '雙膝併攏並維持。'], array['Tuck your pelvis to feel it in the front of the thigh.'], array['骨盆微收才能感受大腿前側伸展。']),
('seated-forward-fold-stretch', 'Seated Forward Fold', '坐姿前彎伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit with legs extended in front of you.', 'Hinge forward from the hips reaching toward your toes.', 'Hold and breathe.'], array['坐姿，雙腿向前伸直。', '從髖部向前傾，手伸向腳尖。', '維持並呼吸。'], array['Keep your spine long instead of rounding.'], array['保持脊椎延伸，不要過度圓背。']),
('cross-body-shoulder-stretch', 'Cross-Body Shoulder Stretch', '橫跨身體肩部伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Bring one arm across your chest.', 'Use the other hand to gently press it closer.', 'Hold, then switch.'], array['將一手臂橫過胸前。', '用另一手輕輕將它壓近身體。', '維持後換邊。'], array['Keep your shoulder down, not shrugged.'], array['肩膀放鬆下沉，不要聳肩。']),
('wall-calf-stretch', 'Wall Calf Stretch', '靠牆小腿伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Stand facing a wall with one foot back, heel down.', 'Lean into the wall until you feel a calf stretch.', 'Hold, then switch.'], array['面向牆壁站立，一腳在後、腳跟著地。', '向牆傾身直到小腿感覺伸展。', '維持後換腳。'], array['Keep your back leg straight and heel pressed down.'], array['後腳保持伸直，腳跟壓地。']),
('butterfly-stretch', 'Butterfly Stretch', '蝴蝶式伸展', array['mobility'], array[]::text[], array['large_gym', 'small_gym', 'garage_gym', 'bodyweight_only'], array['Sit with the soles of your feet together and knees out.', 'Hold your feet and sit tall.', 'Gently lean forward or press your knees down.'], array['坐姿，雙腳腳掌相對，膝蓋向外打開。', '抓住雙腳並坐挺。', '輕輕前傾或向下壓膝蓋。'], array['Keep your spine long; don''t force your knees down.'], array['保持脊椎延伸，不要硬壓膝蓋。'])
on conflict (slug) do update set
  name_en            = excluded.name_en,
  name_zh            = excluded.name_zh,
  muscle_groups      = excluded.muscle_groups,
  equipment          = excluded.equipment,
  equipment_settings = excluded.equipment_settings,
  instructions_en    = excluded.instructions_en,
  instructions_zh    = excluded.instructions_zh,
  tips_en            = excluded.tips_en,
  tips_zh            = excluded.tips_zh;

delete from exercises where slug <> all (array['bench-press', 'incline-bench-press', 'incline-dumbbell-press', 'dumbbell-bench-press', 'decline-bench-press', 'machine-chest-press', 'pec-deck', 'cable-fly', 'push-up', 'weighted-push-up', 'overhead-press', 'seated-dumbbell-press', 'arnold-press', 'lateral-raise', 'cable-lateral-raise', 'front-raise', 'rear-delt-fly', 'reverse-pec-deck', 'face-pull', 'upright-row', 'deadlift', 'romanian-deadlift', 'barbell-row', 't-bar-row', 'dumbbell-bent-over-row', 'one-arm-dumbbell-row', 'chest-supported-row', 'seated-row', 'machine-row', 'lat-pulldown', 'close-grip-lat-pulldown', 'straight-arm-pulldown', 'pull-up', 'assisted-pull-up', 'weighted-pull-up', 'chin-up', 'shrug', 'squat', 'front-squat', 'hack-squat', 'leg-press', 'bulgarian-split-squat', 'walking-lunge', 'step-up', 'leg-extension', 'leg-curl', 'seated-leg-curl', 'hip-thrust', 'glute-bridge', 'good-morning', 'standing-calf-raise', 'seated-calf-raise', 'bicep-curl', 'hammer-curl', 'preacher-curl', 'cable-curl', 'reverse-curl', 'wrist-curl', 'tricep-pushdown', 'overhead-tricep-extension', 'skull-crusher', 'close-grip-bench-press', 'dip', 'assisted-dip', 'plank', 'side-plank', 'hanging-leg-raise', 'cable-crunch', 'ab-wheel', 'running', 'walking', 'cycling', 'rowing', 'stair-climber', 'dumbbell-fly', 'incline-cable-fly', 'decline-dumbbell-press', 'smith-machine-bench-press', 'landmine-press', 'weighted-dip', 'machine-shoulder-press', 'standing-dumbbell-press', 'push-press', 'machine-lateral-raise', 'cable-front-raise', 'plate-front-raise', 'bent-over-rear-delt-raise', 'cable-rear-delt-fly', 'pendlay-row', 'inverted-row', 'meadows-row', 'single-arm-cable-row', 'wide-grip-lat-pulldown', 'neutral-grip-pull-up', 'assisted-chin-up', 'weighted-chin-up', 'rack-pull', 'back-extension', 'dumbbell-shrug', 'goblet-squat', 'smith-machine-squat', 'belt-squat', 'sumo-deadlift', 'trap-bar-deadlift', 'lying-leg-curl', 'nordic-hamstring-curl', 'single-leg-romanian-deadlift', 'reverse-lunge', 'split-squat', 'cable-kickback', 'hip-abduction-machine', 'single-leg-glute-bridge', 'barbell-glute-bridge', 'dumbbell-glute-bridge', 'dumbbell-hip-thrust', 'smith-machine-hip-thrust', 'smith-machine-romanian-deadlift', 'dumbbell-romanian-deadlift', 'kettlebell-romanian-deadlift', 'cable-pull-through', 'machine-glute-kickback', 'cable-standing-hip-abduction', 'cable-standing-hip-adduction', 'hip-adduction-machine', 'smith-machine-bulgarian-split-squat', 'smith-machine-reverse-lunge', 'smith-machine-split-squat', 'heel-elevated-goblet-squat', 'dumbbell-sumo-squat', 'dumbbell-sumo-deadlift', 'front-foot-elevated-split-squat', 'deficit-reverse-lunge', 'dumbbell-lateral-lunge', 'dumbbell-curtsy-lunge', 'landmine-squat', 'landmine-romanian-deadlift', 'kettlebell-swing', 'glute-focused-back-extension', 'reverse-hyperextension', 'leg-press-calf-raise', 'wall-sit', 'jump-squat', 'incline-dumbbell-curl', 'concentration-curl', 'ez-bar-curl', 'spider-curl', 'rope-hammer-curl', 'drag-curl', 'rope-tricep-pushdown', 'dumbbell-skull-crusher', 'single-dumbbell-skullcrusher', 'dumbbell-overhead-tricep-extension', 'single-arm-dumbbell-tricep-extension', 'bench-dip', 'tricep-kickback', 'wrist-extension', 'farmer-carry', 'crunch', 'reverse-crunch', 'russian-twist', 'bicycle-crunch', 'mountain-climber', 'dead-bug', 'bird-dog', 'pallof-press', 'cable-woodchop', 'half-kneeling-pallof-press', 'cable-pallof-hold', 'hanging-knee-raise', 'captains-chair-knee-raise', 'decline-sit-up', 'weighted-crunch', 'weighted-russian-twist', 'dumbbell-side-bend', 'elliptical', 'jump-rope', 'assault-bike', 'skierg', 'treadmill-incline-walk', 'battle-ropes', 'incline-push-up', 'knee-push-up', 'wide-push-up', 'diamond-push-up', 'decline-push-up', 'pike-push-up', 'feet-elevated-pike-push-up', 'archer-push-up', 'typewriter-push-up', 'explosive-push-up', 'hindu-push-up', 'scapular-push-up', 'push-up-shoulder-tap', 'wall-push-up', 'wall-walk', 'wall-handstand-push-up', 'handstand-push-up', 'chair-dip', 'doorway-row', 'towel-row', 'prone-y-raise', 'prone-t-raise', 'superman', 'superman-hold', 'reverse-snow-angel', 'dead-hang', 'active-hang', 'scapular-pull-up', 'negative-pull-up', 'commando-pull-up', 'l-sit-pull-up', 'towel-pull-up', 'bodyweight-squat', 'pistol-squat', 'assisted-pistol-squat', 'shrimp-squat', 'cossack-squat', 'sissy-squat', 'forward-lunge', 'lateral-lunge', 'curtsy-lunge', 'skater-squat', 'single-leg-box-squat', 'step-down', 'calf-raise', 'single-leg-calf-raise', 'glute-bridge-march', 'frog-pump', 'donkey-kick', 'fire-hydrant', 'clamshell', 'hip-airplane', 'side-lying-hip-abduction', 'side-lying-leg-raise', 'lying-hamstring-walkout', 'towel-hamstring-curl', 'stability-ball-hamstring-curl', 'banded-glute-bridge', 'banded-hip-thrust', 'banded-clamshell', 'banded-lateral-walk', 'banded-monster-walk', 'banded-squat', 'banded-donkey-kick', 'banded-fire-hydrant', 'banded-kickback', 'banded-standing-hip-abduction', 'banded-seated-hip-abduction', 'band-pull-apart', 'banded-face-pull', 'banded-row', 'banded-lat-pulldown', 'banded-pallof-press', 'banded-woodchop', 'banded-dead-bug', 'hollow-body-hold', 'hollow-rock', 'v-up', 'flutter-kick', 'lying-leg-raise', 'toe-touch', 'heel-tap', 'plank-shoulder-tap', 'plank-jack', 'bear-plank', 'bear-crawl', 'crab-walk', 'inchworm', 'l-sit-hold', 'seated-knee-tuck', 'side-plank-hip-dip', 'copenhagen-plank', 'dragon-flag', 'burpee', 'half-burpee', 'squat-thrust', 'high-knees', 'jumping-jack', 'skater-hop', 'lateral-shuffle', 'sprawl', 'cat-cow-stretch', 'arm-circles', 'worlds-greatest-stretch', 'leg-swings-stretch', 'torso-twist-stretch', 'doorway-chest-stretch', 'childs-pose', 'kneeling-hip-flexor-stretch', 'hamstring-stretch', 'standing-quad-stretch', 'seated-forward-fold-stretch', 'cross-body-shoulder-stretch', 'wall-calf-stretch', 'butterfly-stretch']);
-- END ai_plan_exercises
