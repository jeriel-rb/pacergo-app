# Phase 2 — Execution Order

> Sequencing document. Read alongside `docs/phase1-improvements-before-phase2.md` (baseline
> gap audit) and `docs/phase2-work-tracker.md` (full requirement checklist, source of truth
> for DoD wording and checkbox state). This doc answers one question: **in what order do we
> build the remaining work, and why.**
>
> Rule used to order everything below: (1) no client dependency first, (2) cheapest/most
> isolated wins first, (3) fix gaps in things already partially built before starting things
> that don't exist yet, (4) don't start large net-new builds (payout admin, plan generator)
> until the schema/abstraction decisions under them are locked, because rework there is the
> most expensive kind.
>
> **Status as of 2026-09-22 (corrected — supersedes the 2026-09-16 line below it):** Stage 0
> done, Stage 1 done, Stage 2a done, Stage 2b done, Stage 2c done, Stage 3 done (backend +
> B-4/B-7/B-8 UI), Stage 4 done (provider abstraction + simulated checkout UI,
> `PAYMENT_PROVIDER` still defaults to `newebpay` in production — flipping to `simulated` is
> still an open client/ops decision, not done).
> **Stage 5 (Scope A rebuild): DONE**, built in a separate session between 2026-09-16 and
> 2026-09-22 that this doc was never updated to reflect — the line below (from 2026-09-16)
> describing it as "not started at all" was accurate *at the time* and is now wrong. What
> shipped diverges from this document's original Stage-5 plan: a multi-step wizard (~18 inputs
> across three sub-flows, not the spec's literal 6), 302 seeded exercises (not 80), a Rest
> Timer preference the plan below never anticipated, and no exercise photography (placeholder
> images — content production, still not something a dev session can generate). This was a
> **client/PacerGo-decided scope change**, recorded in `phase2-work-tracker.md`'s Decisions log
> under "[decided 2026-09-22] Stage 5 (Scope A rebuild) is DONE" — read that entry for the
> reasoning and for what's still genuinely open (exercise images; migrating `apps/mobile` off
> the old 6-input composer it still depends on). **The Stage 5 section below has been rewritten
> to describe what actually shipped** (no longer the original speculative 7-step plan) — it and
> `phase2-work-tracker.md`'s Scope A section should now agree; treat both as current.
>
> **2026-09-16 status line (kept for history, no longer current):** Stage 5 (Scope A rebuild):
> not started at all — an earlier version of this status line said step 1 ("re-scope the 6
> inputs") was done; that was wrong. Step 1 was *attempted* and then deliberately
> reverted/abandoned once it was confirmed it can't land in isolation without breaking the
> current `/ai-plan` route (see the Stage 5 section below and the Decisions log). Zero Stage 5
> code exists. Migrations `0036`–`0042` **are applied** to the live Supabase project (verified
> directly against the DB, not just local file state) — `backend/migrations/` (the renamed
> `supabase/migrations/`, now junctioned) is current.
>
> **2026-09-22 migration-history note:** `backend/migrations/` was later squashed into
> `0001_init.sql` (schema) + `0002_policies.sql` (centralized RLS/storage policies with
> comments); new migrations since then use full timestamp filenames. The exercise-catalog
> slug rewrite (`20260922020000_exercise_catalog_update.sql`) already ran and was folded
> out of the migration files; the earlier
> `20260922010000_exercise_conditioning_tags.sql` was superseded and repaired out of remote
> history. Seed mirror: `backend/seeds/03_ai_plan_exercises.sql`. Verified live: 302 rows in
> `exercises`.

---

## Stage 0 — Housekeeping (do first, near-zero effort)

- [x] `yarn install` → `yarn web typecheck` clean, `yarn web test` green. **Done 2026-09-15** —
      baseline confirmed working (91 passing tests, 1 pre-existing unrelated typecheck error in
      `auth/recovery/confirm/page.tsx`, 3 pre-existing unrelated test failures in
      `forgot-password-form.test.tsx`; none of this session's changes touch those files).
- [ ] `git tag` the current `main` as a pre-Phase-2 marker (e.g. `v1-baseline`). **Skipped —
      not done.** Git has no `user.name`/`user.email` configured on this machine at all, so
      any tag/commit fails. The user chose to configure this themselves rather than have it
      set here. Still open.
- [x] Recorded the **simulated-vs-live provider decision** as still `[pending]` in
      `phase2-work-tracker.md`'s Decisions log — deliberately NOT decided (the user asked to
      leave it open rather than guess). Stage 4 below still can't start until this is resolved.
- [x] **New decision recorded:** scheduling mechanism for time-based jobs (order expiry,
      later the 24h settlement hold) is **pg_cron inside Supabase**, not Vercel Cron — verified
      via research that pg_cron is available on Supabase's Free plan at no cost, while Vercel's
      Hobby-plan Cron Jobs cap at once/day (too coarse for a 30-minute window). See Stage 2a.
- [x] **New decision recorded:** consent-page body text is hardcoded i18n copy, not a database
      content table — see Stage 1 below, this changed mid-session after over-building a first
      draft with a versioned content table + read RPC.

**Why first:** these are prerequisites the spec itself calls out as blockers, they take
minutes each, and skipping them risks building Scope B twice.

---

## Stage 1 — Consent pages (A-10 / §6.2) — **DONE 2026-09-15**

**This is the easiest full requirement to close, and it's independent of everything else in
the spec** — no Scope A or B code touches it, so it can be built in parallel with anything
else. It is also gating for M3 (Oct 20), so doing it now removes it from the W6 crunch.

What "easy" means here concretely: the *content* is blocked on the client ("client supplies
all legal wording"), but the *infrastructure* is not. Build the infrastructure now with
placeholder copy; swap in real text when it arrives.

**What actually shipped (diverges from the original plan below — simpler, on purpose):**
- [x] **Schema:** just `consent_records` (user_id, document_slug, version_label, accepted_at)
      — `consent_documents` (a versioned content table) was built first, then removed. Re-read
      against the spec: "client supplies all legal wording; dev implements... only" implies
      the client hands over finished text, not that they self-edit it through an admin UI —
      nothing requires the document body to be a DB entity. Simpler and correct: the legal
      text lives as hardcoded i18n copy (see below), and "versioning" is one hand-bumped date
      string per document. Migration: `supabase/migrations/0036_consent_pages.sql`.
- [x] **Pages:** one dynamic route, `[locale]/(legal)/legal/[slug]/page.tsx`, serving all four
      documents (Terms, Privacy, Risk Disclosure, Partner Conduct Rules) — not four separate
      page files, since they only differ in which i18n keys they read. Reuses the existing
      `PlanMarkdown` renderer from the ai-plan feature instead of writing a second markdown
      renderer. Text lives in `apps/web/src/locales/{en,zh}/legal.json` (placeholder copy,
      clearly marked "pending final text" — swap in the client's real wording directly in
      these files when it arrives, then bump the matching date in `CONSENT_VERSIONS`).
- [x] **Checkbox + versioning UI — placement decided:** one combined checkbox at **sign-up**
      covering Terms + Privacy + Risk Disclosure (every user needs these), plus a **second,
      separate checkbox in the trainer studio flow** (`ListingEditor`, on first listing
      creation only) for Partner Conduct Rules — that document only applies to trainers.
      Both gates are client-side enforcement only for now (proportionate — this gates an
      acknowledgment, not money or security).
  - Sign-up: consent version labels are passed through `auth.signUp()`'s `options.data`
    (written server-side to `auth.users.raw_user_meta_data` at signup, no session needed yet)
    and read back by an extended `handle_new_user()` trigger, which writes `consent_records`
    in the same transaction as the profile row. **This replaced an earlier, broken design**
    that tried to defer the write via `sessionStorage` until the user had a session after
    email verification — that doesn't work because a verification-email link opens a brand
    new browsing context with no `window.opener` relationship, so `sessionStorage` set on
    the sign-up page is invisible there for effectively all real users. Caught before it
    shipped; fixed at the source instead of patched around.
  - Studio: a normal `auth.uid()`-gated `accept_consent()` RPC call, since the user already
    has a real session at that point — no metadata trick needed there.
- [x] **Placeholder copy** in place, clearly marked as pending final legal text.
- [ ] Version-date display exists (shown on each legal page); the "silence = deemed accepted"
      language is still explicitly out of scope (client-facing legal statement, not a
      platform feature).

**Bug found and fixed post-build:** the auth middleware's `PUBLIC_PATHS` allowlist didn't
include `/legal`, so an anonymous sign-up visitor clicking a Terms/Privacy link was redirected
to sign-in before ever reaching the page. Fixed in `apps/web/src/middleware.ts`.

**UI polish (2026-09-15):** removed a redundant static "By continuing you agree to..." line
that used to sit below the Create Account button — dead copy now that a real, enforced
checkbox exists above it. Also fixed the checkbox row's link markup so long sentences (3
document names) wrap naturally at any word boundary instead of occasionally stranding one
link alone on its own line.

**Why this order:** zero technical dependency on anything else in the spec, fully
parallelizable with a different engineer if you have one, and it's one of only two fully
missing platform-wide items (the other being backups, Stage 0).

---

## Stage 2 — Close gaps in things that already exist

These are features that are **partially built** — fixing them is cheaper than building net-new
because the schema, routes, and RLS patterns already exist; the work is filling in what's
missing, not designing from scratch. Doing this before Stage 3/4 also means the two large
net-new builds (payout admin, plan generator) inherit a correct foundation instead of
compounding on top of gaps.

### 2a. Scope B — payment record correctness (fixes B-1, B-3 gaps) — **DONE 2026-09-15**
The `payments` table already has the right columns (from `0035`) but **nothing populated them
on order creation** — this was a pure logic gap, not a schema gap.
- [x] `create_newebpay_payment_attempt` now computes and writes `gross_amount`,
      `platform_fee_amount`, `trainer_payable` at creation time via a new, isolated
      `compute_order_fee_split()` SQL function — one named function with one named rate
      constant, not the split re-implemented at each call site. **Rounding mode is still
      `[pending]` client confirmation** (marked with a `TODO` comment directly on the
      function + in the Decisions log) — the function is written so changing the rounding
      formula later is a one-line edit in one place.
- [x] 30-minute unpaid-order expiry is live: `expire_stale_payment_attempts()`, scheduled via
      **pg_cron** (`cron.schedule`, every 5 minutes) in
      `supabase/migrations/0037_settlement_scheduling.sql`. Flips stale payments to `expired`
      and the paired booking to `expired`, which is what "releases the slot" means in this
      schema (there's no separate time-slot table — a new booking is only blocked by an
      existing *open-status* booking with the same companion, so moving the stale one out of
      that status set is the entire release mechanism).
  - Note: the expiry function is deliberately **not** granted to `authenticated`/`anon` —
    pg_cron jobs run as the job owner, not a request-scoped user, so `auth.uid()` is `NULL`
    inside it. This is the cron infra Stage 3's 24h settlement hold will reuse.
- [ ] Migration not yet applied to the live Supabase project (`supabase db push` not run this
      session — stays in the working tree for review first).

**Why now:** B-9 (CSV export) already ships columns for this data — right now it's exporting
zeros/defaults for every order. Fixing the write path makes the feature you already shipped
today actually correct, which is the single cheapest high-value fix available.

### 2b. Scope A — naming/labeling gap (fixes A-8 gap on the existing `/ai-plan` route) — **DONE 2026-09-16**
- [x] "Beta" badge added zh+en: Home entry point (Quick Actions tile) and the `/ai-plan`
      program screen header. New `BetaBadge` atom
      (`apps/web/src/shared/components/atoms/beta-badge.tsx`), mirrors the existing
      `SoonBadge` pattern; `common.json` gets a shared `"beta": "Beta"` string (both locales
      render the same loanword, per spec "visible in both languages").
- [x] Softened copy in `aiPlan.json` (zh+en): title "AI Training Menu"/"AI 訓練菜單" →
      "Personalized Training Menu"/"個人化訓練菜單"; subtitle/empty-state copy reworded from
      "AI builds/generates ... for you" to "the system will generate ..." — removes the
      live-agent framing per A-8's naming rule. This is *not* the full spec name
      ("Personalized Workout Plan Generator (Beta)") — that's Stage 5's job once the route is
      actually rebuilt; this pass only removed the live/conversational-AI implication from
      the *existing* route.

### 2c. Bank account field (unblocks B-6/B-7/B-8 schema — currently P-6 unmet) — **DONE 2026-09-16**
- [x] Replaced the single placeholder `users.bank_account` text column (0035, never written
      to by any app code, confirmed via grep — safe to drop with no data migration) with
      structured Taiwan bank-transfer fields: `bank_code`, `bank_name`, `branch_name`,
      `bank_account_number` (raw, admin-detail-only), `bank_account_holder`.
      `supabase/migrations/0038_bank_account_fields.sql`.
- [x] `bank_account_mask` (kept from 0035) is now **auto-derived** from
      `bank_account_number` via a `users_bank_account_mask` trigger + `mask_bank_account()`
      SQL function — mirrors `apps/web/src/lib/export/mask.ts::maskBankAccount` exactly, so
      the raw and masked columns can never drift apart.
- [ ] Migration not yet applied to the live Supabase project.

**Why now:** this is the one piece of Stage 3 that can be de-risked before the client
prerequisite lands, because the schema shape is low-risk to guess (bank transfer fields are
fairly standardized) and getting it in place early means Stage 3 isn't a hard blocker on P-6.

---

## Stage 3 — Trainer payout & settlement system (B-6, B-7, B-8) — **DONE 2026-09-16**

**This was the largest missing piece of the whole spec** — confirmed to be schema-only with
zero working RPCs or UI before this pass. Sequenced after Stage 2 because it depends on 2a's
fee-split logic and cron infra, and 2c's bank field.

Build order within this stage (each depends on the previous):

1. [x] **Settlement state machine (B-6, backend only).**
   `supabase/migrations/0040_settlement_state_machine.sql`:
   - `mark_service_completed()` — cron (`run_settlement_cycle`, every 15 min) auto-fires when
     a booking's `scheduled_start + duration_min` passes; `admin_correct_service_completed()`
     for the manual no-show/reschedule-error override, required reason note, logged to a new
     `payment_status_events` audit table (cron transitions logged too, with `actor_id = null`).
   - 24h hold: `settlement_hold_until` set alongside `service_completed_at`; the same cron
     cycle promotes to `eligible` once the hold has passed (and, defensively, demotes back to
     `ineligible` if refund/hold state changed out of band before settlement).
   - `admin_set_payment_hold()` — the "no unresolved dispute or admin hold" condition; B-X12
     keeps this a manual flag + reason note, not real dispute tooling.
   - `trainer_balance(uuid)` / `my_trainer_balance()` — sum of eligible, unsettled orders.
   - New RLS policy so a trainer can read their own `payments` rows (0033 only covered the
     seeker side).
2. [x] **Withdrawal request RPC** — `request_withdrawal(amount)`, validates
   `amount <= trainer_balance()`, requires bank details on file, inserts into
   `withdrawal_requests` (table from `0035`) plus a `withdrawal_status_events` audit row.
   `supabase/migrations/0041_payout_admin.sql`.
3. [x] **B-5 admin cancel/refund RPC** — `admin_set_payment_status()` (`cancel` /
   `refund_requested` / `refunded`), required reason, immediately downgrades eligibility if
   the row was already eligible-unsettled. Same migration as step 2.
4. [x] **B-4 trainer order/earnings view.** Backend: `trainer_orders()`,
   `my_withdrawal_requests()`. Frontend:
   `apps/web/src/features/studio/earnings-view.tsx` + `lib/earnings.ts`, new route
   `/studio/earnings` (linked from the Studio home), balance card + withdrawal-request
   dialog + order/withdrawal history lists.
5. [x] **B-7 admin payout list** — `admin_list_withdrawal_requests()` (filter + header
   totals). Frontend: `apps/web/src/features/admin/admin-payouts-view.tsx`, new
   `/admin/payouts` route + nav entry (`admin-nav-items.ts`). Bank account shown masked only.
6. [x] **B-8 admin payout detail + workflow.** `admin_withdrawal_detail()` (full bank reveal,
   admin-only, + full status history), `admin_set_withdrawal_status()` (Requested→
   Processing→Paid, +Rejected/Cancelled, + corrections/undo — forward steps don't require a
   reason, every other transition does, enforced server-side). Frontend:
   `admin-payout-detail-view.tsx`, `/admin/payouts/[id]` route.

**Documented assumption (flagged in the Decisions log below, not spec'd):** the spec never
says which underlying orders a paid-out withdrawal actually settles, only that trainer
balance = "sum of eligible, unsettled orders" and a request must be `<= balance`. This build
settles whole orders FIFO (oldest `service_completed_at` first) until the cumulative
`trainer_payable` covers the withdrawal amount — the last order applied can push the total
slightly over, never under. A `withdrawal_settlements` join table records exactly which
orders each withdrawal covered, so a B-8 correction/undo can reverse the right ones. Revisit
if the client's actual bank-transfer reconciliation needs exact amounts instead.

**Not yet applied to the live Supabase project** — `supabase db push` still needed for
`0038`–`0040` (and `0041` from Stage 4).

---

## Stage 4 — Payment provider abstraction (B-2) — **DONE 2026-09-16**

Confirmed: NewebPay was hardcoded directly into the checkout routes, with no interface a
"simulated" implementation could plug into. This directly risked the spec's M4 promise that
live cutover is "config-only."

- [x] `PaymentProvider` interface (`type`, `createAttempt`) —
      `apps/web/src/lib/payments/provider.ts`. Kept to one method (not
      `createAttempt`/`buildRedirect`/`verifyCallback` as three separate steps) because the
      live and simulated flows genuinely diverge in how many steps they need (live: create →
      build signed form → mark redirected; simulated: create → done, no external redirect,
      no signature) — a single `createAttempt` per provider returning a tagged union
      (`redirect_form` | `simulated_review`) fits both without forcing the simulated path
      through unused steps.
- [x] Live NewebPay wrapped as `newebpayProvider` — **zero behavior change**: same RPCs
      (`create_newebpay_payment_attempt`, `mark_newebpay_payment_redirected`), same
      `buildPaymentForm`, just called from behind the interface instead of inline in the
      route.
- [x] `simulatedProvider` + new UI: `/payments/simulated/[id]` — explicit
      Approve/Decline test screen, clearly labeled "Test payment", no card data. Backend:
      `create_simulated_payment_attempt()` (mirrors the NewebPay attempt RPC with
      `provider='simulated'`) and `confirm_simulated_payment()`, which reuses
      `apply_newebpay_notification()` **as-is** — that function was already provider-agnostic
      (matches by `merchant_order_no`, never references "newebpay" in its body), so no new
      confirmation/idempotency logic was needed, only a trainee-callable RPC supplying
      simulated values in place of a real gateway signature.
      `supabase/migrations/0042_simulated_payment_provider.sql`.
- [x] Route selection: `getActiveProviderType()` reads `PAYMENT_PROVIDER` env, **defaults to
      `"newebpay"`** (today's live behavior — zero change unless the env var is set). The
      `/api/payments/newebpay/create` route and `NewebPayButton` component now branch on the
      provider's response shape (`redirect_form` vs `simulated_review`) instead of assuming
      NewebPay.

**Left as an explicit open decision, not assumed:** flipping `PAYMENT_PROVIDER=simulated` to
actually make Phase 1 checkout use fake payments (per spec §5.1's "Phase 1: simulated
provider") is a real business/ops call — it stops the platform from collecting real money on
new bookings. See the Decisions log.

---

## Stage 5 — Scope A rebuild (A-1 through A-8) — **DONE 2026-09-22**

Built in a separate session between 2026-09-16 and 2026-09-22 that this document wasn't
updated to reflect at the time — the plan this section originally laid out (re-scope the
literal 6 inputs, then build on top of that enum) is **not** what shipped. What actually
happened, and is confirmed working end-to-end against the live Supabase project:

1. [x] **Onboarding wizard** — three guided sub-flows (About You / Training Preferences / Gym
       & Equipment, ~18 screens total) instead of a single 6-field form.
       `apps/web/src/features/ai-plan/onboarding/**`, types in
       `packages/shared/src/onboarding/onboarding-types.ts`. This is a **client/PacerGo-decided
       scope change from the spec's literal 6-input list**, not an oversight — see the Decisions
       log entry dated 2026-09-22 in `phase2-work-tracker.md` for the reasoning. Includes a Rest
       Timer preference the original spec never mentioned.
2. [x] **Structured plan data model** — `GeneratedPlan` (weeks → days → warm-up/main/cool-down
       → exercise refs), not markdown. `packages/shared/src/plan/generate-plan.ts`.
3. [x] **`exercises` table + content** — **302 distinct exercises** shipped (not the ≥80
       minimum), each with muscles + zh/en instructions/tips, verified complete (no empty
       rows). `backend/seeds/03_ai_plan_exercises.sql`, generated from
       `apps/web/src/shared/assets/exercise-content.json`. **Real photography/illustrations
       were not produced** — every exercise still shows a "Photo coming soon" placeholder; this
       was anticipated from the start as content production a dev/agent session can't do, and
       remains the one genuinely open piece of A-7/A-4/A-5.
4. [x] **Persistence** — saved plans live in `user_training_plans`, viewable via **My Plans**
       until updated or deleted. "Update Preferences" edits the specific saved plan's inputs in
       a dedicated Customize Plan page and re-runs the composer in place — functionally the
       spec's "no separate regenerate control," implemented as a more targeted edit flow than
       "re-open the whole questionnaire," since re-walking an 18-screen wizard to change one
       field would have been worse UX than the spec anticipated when it assumed a 6-field form.
5. [x] **UI** — program overview (week tabs/day cards), daily workout screen, exercise detail
       page, all shipped and live.
6. [x] **Determinism test** — `packages/shared/src/__tests__/generate-plan.test.ts`, asserts
       byte-identical output for identical inputs, plus coverage for frequency/equipment/split/
       experience/cardio variance. Zero AI/LLM calls, confirmed by grep across the composer and
       feature tree. **Not done:** a formal full A-1 combination-matrix test (every possible
       input combination, asserted to produce a complete plan) — the determinism suite tests
       representative cases, not the full matrix.
7. [x] Beta labeling carried forward — `BetaBadge` on the Home tile, onboarding hub, and plan
       overview header. (The literal spec string "Personalized Workout Plan Generator (Beta)"
       is not rendered anywhere verbatim — client/PacerGo decision 2026-09-22 that the badge +
       existing titles satisfy this requirement; see `phase2-work-tracker.md`'s A-8 entry.)

**Known trade-off, not yet resolved:** `apps/mobile/src/app/ai-plan.tsx` still runs the *old*
6-input composer (`enums/training.ts` / `plan-composer.ts` in `packages/shared`) — that's
mobile's only plan-generation implementation, so those files stay in the codebase and stay
load-bearing even though the web app no longer uses them. Migrating mobile onto the new wizard
and composer is open work, not a Scope A blocker for web.

For the full item-by-item DoD checklist (A-1 through A-8), see `phase2-work-tracker.md`'s
Scope A section — that document is the source of truth for checkbox state; this one is the
sequencing/rationale record.

---

## What stays where it is

- **B-9 CSV export** — already correct and shipped (uncommitted, ready to apply via
  `supabase db push`). No action needed here beyond Stage 2a making the underlying data it
  exports accurate.
- **B-10 live cutover** — genuinely blocked on P-2/P-3/P-4, not sequenced here. Stage 4's
  abstraction work is what makes B-10 a config change when those arrive.
- **Baseline items already solid** (A1–A4, A5's existing scope, auth, security posture,
  RLS/RPC pattern) — no gaps found, nothing to sequence.

---

## Open risk to flag to the client/Jeriel now — **resolved 2026-09-22, kept for history**

This section described a real risk as of 2026-09-16: Scope A was entirely unbuilt with M1
(Oct 8) approaching. That risk no longer applies — Scope A shipped (see the status note at the
top of this document and `phase2-work-tracker.md`'s Scope A section) — but the scope it
shipped as differs from the spec's literal wording (6 inputs → ~18; 60 fixed minutes → a
15–90 min preference), which **is** a live item: get that divergence formally acknowledged by
the client per §11, since M1/M3 acceptance is graded against literal DoD wording. That is the
actual remaining action here, not a timeline risk.

**Original text, unmodified, for reference:** Sequencing Scope A last in this document does not
change the spec's M1 = Oct 8 target. Given the scale of the Scope A gap (schema, content DB,
and UI are all effectively unbuilt), either: (a) Scope A starts in parallel with Stage 1–2
immediately, accepting that context-switching costs some velocity, or (b) the M1 date needs an
early, honest conversation with the client per §11 (change requests are cheaper the earlier
they're raised). This document sequences by *risk and dependency*, not by calendar — reconcile
the two before committing dates back to the client.
