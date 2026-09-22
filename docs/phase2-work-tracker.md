# Phase 2 — Work Tracker

> Living build tracker for **PacerGo Phase 2** (spec v1.0, 2026‑09‑09).
> Companion to `docs/phase1-improvements-before-phase2.md` (read that first: Phase 1 must be
> remediated before Phase 2 builds land).
>
> Structure: **Milestones → Weekly plan → Scope A (A‑1…A‑8) → Scope B (B‑1…B‑10) → Platform (A9–A11) → Tests → Prereqs (P‑1…P‑8) → Decisions log.**
> Tick checkboxes as work lands; re‑estimate at each weekly checkpoint.

## Phasing recap

- **Phase 1** = delivered v1 baseline (`main`, latest 2026‑07‑27). See partner doc.
- **Scope A** = Personalized Workout Plan Generator (Beta) — W1–W4 → **M1 staging** (2026‑10‑08).
- **Scope B Phase 1** = simulated per‑order payments + trainer payout admin — W3/W4 overlap → **M2 staging** (2026‑10‑15).
- **Phase 2** = Production Beta, both scopes live, payments **simulated** → **M3 production** (2026‑10‑20).
- **M4 (B‑10)** = swap simulated → live NewebPay (config‑only). Contingent on **P‑2/P‑3/P‑4**.

---

## Milestone map

| Milestone | Contents | Target | Status |
| --- | --- | --- | --- |
| Kickoff | Project start; baseline verified | 2026‑09‑10 | ☐ |
| Website handover (A1) | Official website source, assets, deploy notes → client | 2026‑09‑15 | ☐ |
| **M1** | Scope A (A‑1…A‑8) on staging | 2026‑10‑08 | ☐ |
| **M2** | Scope B Phase 1 (B‑1…B‑9) on staging, simulated | 2026‑10‑15 | ☐ |
| **M3** | Production release, free Beta, simulated payments | 2026‑10‑20 | ☐ |
| M4 | Live NewebPay cutover (B‑10) | ≤8wk after P‑2/3/4 | ☐ (blocked) |

---

## Weekly plan (Phase 2)

| Week | Dates | Focus | Key deliverables |
| --- | --- | --- | --- |
| W1 | Sep 10 – 16 | Website handover (A1); Scope A data model, exercise DB schema, composer extension; start authoring 80+ exercises | Enums re‑scoped to 6 inputs; exercises table + seed scaffold; composer model sketch |
| W2 | Sep 17 – 23 | A‑1 questionnaire; A‑2 composer + determinism test; continue content | 6‑input questionnaire UI; byte‑identical determinism test; ≥40 exercises seeded |
| W3 | Sep 24 – 30 | A‑3, A‑4, A‑5 screens; A‑6 update flow; **send exercise copy draft (P‑7)** | Overview + daily + detail screens; update flow; draft sent for approval |
| W4 | Oct 1 – 8 | A‑7 content complete (≥80 exercises); A‑8 Beta label/themes/i18n QA; **M1 to staging Oct 8**; start B‑1…B‑3 | ≥80 exercises live; Beta labels; M1 tagged `m1-staging` |
| W5 | Oct 9 – 15 | B‑4…B‑9; payment‑provider abstraction; **M2 to staging Oct 15** | Simulated provider + fee split + settlement + payout admin + CSV; `m2-staging` |
| W6 | Oct 16 – 20 | Production deploy, Beta env seeding, admin account, backups; **M3 production Oct 20** | Free Beta live, simulated payments; `m3-production` |
| Post‑M3 | Oct 20 – Nov 19 | 30‑day bug‑fix window (M1–M3) | Weekly updates; defect loop |
| M4 | TBD | Live NewebPay (B‑10) after P‑2/3/4 | Config‑only cutover; joint sandbox walkthrough |

> Dates are outer limits. Deliver earlier when possible (does not shorten acceptance/warranty).

---

## Scope A — Personalized Workout Plan Generator (Beta)

Design reference: "Kilo" (inspiration only). Deterministic, rule‑based, **no runtime AI/LLM**.

> **Status as of 2026‑09‑22: Scope A is DONE, built against a decided scope change from the
> spec's literal 6‑input list — see the Decisions log entry dated 2026‑09‑22.** The rebuild
> shipped as a multi‑step wizard (`apps/web/src/app/[locale]/(tabs)/ai-plan/**`) instead of a
> single 6‑field form, with a real deterministic composer, 302 seeded exercises (not 80), and
> a Rest Timer preference the spec never anticipated. Every checkbox below is re‑stated against
> what actually shipped, not the original 6‑input plan.

### A‑1 · Onboarding questionnaire — **DONE (decided scope: expanded input set, not 6)**
- [x] **Client/PacerGo‑decided 2026‑09‑22: the questionnaire is a multi‑step wizard, not the
      spec's literal 6‑input list.** Three sub‑flows: **About You** (goal, obstacle, use‑case,
      gender, age, height & weight), **Training Preferences** (experience, days/week, workout
      split, variety, session duration, exclude/prioritize muscles, **Rest Timer** — min/max
      rest window with Short/Standard/Long presets, new vs. the original spec), **Gym &
      Equipment** (where you train, equipment access, cardio). Implementation:
      `apps/web/src/features/ai-plan/onboarding/**`, types in
      `packages/shared/src/onboarding/onboarding-types.ts`. This supersedes
      `packages/shared/src/enums/training.ts`'s 6‑input model for the web app — that file
      still exists and is **load‑bearing for `apps/mobile`** (`apps/mobile/src/app/ai-plan.tsx`
      imports it directly), so it was not deleted; the web and mobile apps now run two
      different Scope‑A implementations until mobile is migrated (tracked as a follow‑up, not
      blocking web delivery).
- [x] Single guided flow (step‑by‑step, back/continue navigation via `useSubStepNav`); answers
      persist to `sessionStorage` mid‑flow and to `user_onboarding` on save.
- [x] Works zh‑TW + EN — verified 2026‑09‑22: `onboarding.json` en/zh key sets match exactly
      (268/268 keys, 0 missing either direction).

### A‑2 · Plan generation & saved plan — **DONE**
- [x] Deterministic composer → structured 4‑week program (`GeneratedPlan`, not markdown).
      `packages/shared/src/plan/generate-plan.ts`.
- [x] **10 warm‑up / 40 main / 10 cool‑down = 60 min** — session length matches the chosen
      duration preference (default 45 min, range 15–90); the spec's fixed 60‑min figure was
      superseded by a user‑configurable duration, part of the same decided scope change as A‑1.
- [x] Saved to account (`user_training_plans`), viewable after logout/login via **My Plans**
      (sidebar nav item + hub link) until replaced or deleted.
- [x] Sessions/week + rest‑day placement follow chosen frequency (`TRAINING_DAY_MASK`, spread
      evenly across the week).
- [x] Exercises filtered by gym type/equipment from the `exercises` table.
- [x] **Byte‑identical determinism test** — `packages/shared/src/__tests__/generate-plan.test.ts`,
      asserts `JSON.stringify(a) === JSON.stringify(b)` for identical inputs; 8 tests total
      covering determinism, week repetition, frequency patterns, equipment/split/experience
      variance, and cardio placement. All passing.
- [x] **Network‑log verification**: zero AI/LLM calls — confirmed via grep, no `fetch`/
      provider‑SDK references anywhere in the composer or the `ai-plan` feature tree.
- [x] **No regenerate control** — "Update Preferences" (A‑6) edits and re‑runs the composer in
      place; there is no separate "regenerate" button anywhere.

### A‑3 · Program overview screen — **DONE**
- [x] Week 1–4 tabs; one card per training day (label, focus, session duration); rest days
      marked. `apps/web/src/features/ai-plan/plan/plan-overview-view.tsx`.
- [x] Read‑only, matches chosen frequency exactly.

### A‑4 · Daily workout screen — **DONE**
- [x] Ordered list grouped warm‑up / main / cool‑down (+ cardio at the chosen placement).
      `daily-workout-view.tsx`.
- [x] Per exercise: name (zh/en), sets×reps, rest. **Thumbnail is a placeholder** ("Photo
      coming soon") — real exercise photography was never produced (content production, not
      something a dev/agent session can generate); tracked as an open follow‑up, not a defect,
      since A‑5's DoD explicitly anticipated this dependency.

### A‑5 · Exercise detail page — **DONE (image asset gap, see A‑4)**
- [x] Name, target muscles, 3–6 steps, 1–3 tips; zh‑TW + EN. `exercise-detail-view.tsx`.
- [ ] **One static illustration/photo per exercise** — not shipped; same placeholder‑image gap
      as A‑4. All 302 exercises have complete text content (verified 2026‑09‑22: 302/302 have
      non‑empty instructions); none have real photography.

### A‑6 · Update Workout Plan — **DONE (different mechanism than spec'd, functionally equivalent)**
- [x] Re‑opens the specific saved plan's preferences (not the whole onboarding wizard) via a
      dedicated **Customize Plan** page (`/ai-plan/plan/[id]/update`) — each field opens in its
      own dialog, editing in place. This replaces the spec's "re‑open questionnaire (A‑1 flow)"
      mechanism, decided because re‑walking the entire ~18‑screen wizard to change one field
      was worse UX than the spec anticipated when it was written against a 6‑input form.
- [x] Deterministic plan for new inputs replaces the saved plan in place
      (`update_training_plan` RPC); unchanged inputs → identical plan (same composer, same
      determinism guarantee as A‑2).
- [x] No separate regenerate/roll control anywhere.

### A‑7 · Exercise content database — **DONE, exceeds requirement**
- [x] `exercises` table + seed. **302 distinct exercises** (not the ≥80 minimum) across the 4
      gym‑type/equipment settings. `backend/seeds/03_ai_plan_exercises.sql`, generated from
      `apps/web/src/shared/assets/exercise-content.json` via
      `apps/web/scripts/generate-exercises-seed.mjs`. Verified live in Supabase: `select
      count(*) from exercises` = 302 (checked 2026‑09‑22).
- [x] Each: muscles, instructions, tips (zh+en) — verified complete, no empty‑content rows.
      **Images not included** — see A‑4/A‑5 gap above.
- [ ] Send draft to client (P‑7) — content is complete and ready to send; not confirmed sent as
      of 2026‑09‑22.

### A‑8 · Platform delivery / Beta labeling — **DONE**
- [x] Web app only; zh‑TW default + EN; light + dark.
- [x] "Beta" label (zh+en) on feature entry point (Home) **and** program screens — `BetaBadge`
      on the Home tile, the onboarding hub, and the plan overview header.
- [x] Naming/Beta‑labeling — **Client/PacerGo decision 2026‑09‑22: satisfied by the existing
      `BetaBadge`**, shown next to "Let's get started" on the onboarding hub and on the Home
      entry tile. The spec's exact string "Personalized Workout Plan Generator (Beta)" is not
      rendered verbatim anywhere; the badge + friendly title combination is accepted as meeting
      this requirement rather than adding separate literal‑name text. (A version of this doc
      briefly recorded a literal‑name eyebrow label as the fix for this item — that UI change
      was reverted the same day per this decision; treat that as never having shipped.)
- [x] **No direct client‑side table queries** — verified 2026‑09‑22: grepped the entire
      `ai-plan` feature tree and `lib/plans.ts`/`lib/exercises.ts` for direct
      `.from(...).insert/update/delete/upsert(` calls — zero matches. All writes go through
      `SECURITY DEFINER` RPCs (`save_onboarding_answers`, `save_training_plan`,
      `update_training_plan`, `delete_training_plan`); reads use plain `.select()`, which RLS
      already scopes correctly.
- [x] Both themes × both languages QA — **verified 2026‑09‑22 via static analysis** (no
      Supabase/auth access available for a live click‑through): grepped the live wizard/plan
      component tree for hardcoded non‑theme‑aware colors (`text-white`, `bg-black`, literal
      hex codes, etc.) — zero matches (the only hits were in the dead `ai-plan-view.tsx`, not
      part of the live route). Confirmed `onboarding.json`/`plan.json` have matching en/zh key
      sets (0 missing either direction) and no untranslated literal JSX text in the live
      component tree. This is not a substitute for a manual click‑through in both themes on a
      real device, which still hasn't been done — flagged as the one remaining soft item here.

### Scope A exclusions (do NOT build) — A‑X1…A‑X12 (live AI, video, computer vision, wearables, nutrition tracking, workout social, custom editing, offline, ≠4‑week, progress tracking, mobile, paid gating).

---

## Scope B — NewebPay per‑order payments & trainer payout admin

Per‑order direct payment only. **Customer pays displayed price. Platform 5%. Trainer 95%.**
Processing fee absorbed from platform 5%, recorded where exposed. All funds → client's NewebPay.
**No notifications** — admin list/detail views are single source of truth.

### B‑1 · Order creation from booking
- [x] After trainer/service/date/time selected → create NTD order (gross, 5% fee, 95% payable). **Done** (Stage 2a, `0037_settlement_scheduling.sql` — `compute_order_fee_split()` wired into `create_newebpay_payment_attempt`; Stage 4 adds the `simulated`-provider equivalent, `create_simulated_payment_attempt()`).
- [ ] Prices from trainer service data (P‑5). Still using `bookings.agreed_price`; blocked on P‑5 confirmation, not a code gap.
- [x] Unpaid orders auto‑expire after **30 min** → release time slot. **Done** (Stage 2a, `expire_stale_payment_attempts()` via pg_cron).
- [ ] Rounding rule documented. **Placeholder only** — `compute_order_fee_split()` has a `TODO(pending client confirmation)` comment; round-half-up is not a confirmed business rule (see Decisions log).

### B‑2 · Checkout flow (behind provider abstraction) — **DONE 2026‑09‑16 (Stage 4)**
- [x] **Phase 1 (simulated):** order review → simulated payment screen w/ explicit approve/decline → success/failure; clear test/beta label; no card data. New route `/payments/simulated/[id]`, `SimulatedPaymentView`, `confirm_simulated_payment()` RPC.
- [x] **Phase 2 (live):** NewebPay hosted page, signed trade request. Unchanged — now called through the `PaymentProvider` interface (`newebpayProvider`) instead of inline in the route; zero behavior change. Re-verification against the actual platform‑merchant spec (P‑4) still needed once received, per B‑10.
- [x] `PaymentProvider` abstraction itself: `apps/web/src/lib/payments/provider.ts`. Active provider defaults to `newebpay` (today's live behavior); `PAYMENT_PROVIDER=simulated` switches it — **left as an explicit ops decision, not flipped by default** (see Decisions log).

### B‑3 · Payment confirmation & records (B‑3 server‑side; idempotent; never browser‑return alone)
- [x] Provider callback endpoint (simulated Phase 1; NewebPay NotifyURL Phase 2); verifies authenticity. Simulated path reuses `apply_newebpay_notification()` as‑is (already provider‑agnostic) via the new `confirm_simulated_payment()` RPC.
- [x] **Idempotent** — replayed notify → no double confirm. (`apply_newebpay_notification` was already idempotent; unchanged.)
- [x] Record per order: all listed fields. **Done** (Stage 2a populated the fee/settlement fields; `provider_type` = `payments.provider`, already `simulated|newebpay`).
- [x] Statuses: `processing / success / failed / cancelled-expired` — mapped via `mapProviderStatus`/existing `payment_status` enum (pre‑existing).
- [x] Booking confirms **only** on verified server confirmation. Pre‑existing behavior, unchanged by Stage 4.

### B‑4 · Order status views — **DONE 2026‑09‑16 (Stage 3 step 4)**
- [x] User: own orders (amount + payment status). Pre‑existing (`/sessions`).
- [x] Trainer: own orders (payable 95%, eligibility, settlement status). New `trainer_orders()` RPC + `/studio/earnings` page (`earnings-view.tsx`). Read‑only, server‑side enforced (new RLS policy + `SECURITY DEFINER` RPC scoped to `auth.uid()`).

### B‑5 · Cancellation & refund status recording — **DONE 2026‑09‑16 (Stage 3 step 3)**
- [x] Statuses: `cancelled`, `refund_requested`, `refunded` — **admin action only**. `admin_set_payment_status()` RPC, required reason note.
- [x] Actual refund executed manually by client (NewebPay console / simulated equiv). Platform records state only — unchanged, as spec'd.
- [x] Cancelled/refunded excluded from settlement eligibility + trainer balance. Immediate downgrade inline (no cron wait) if the row was already eligible‑unsettled.

### B‑6 · Trainer earnings, settlement eligibility, withdrawal — **DONE 2026‑09‑16 (Stage 3 step 1‑2)**
- [x] State machine: session end → **Service Completed** (auto via `run_settlement_cycle` cron, every 15 min; admin correction via `admin_correct_service_completed()` w/ reason + audit in new `payment_status_events` table) → **24h hold** (`settlement_hold_until`) → **Eligible for Payout** (`evaluate_settlement_eligibility()`, iff paid, not cancelled, not refunded, no dispute/admin hold).
- [x] `trainer_balance()` = sum of eligible‑unsettled orders.
- [x] Withdrawal request ≤ available balance (else reject w/ clear error; appears in admin list immediately). `request_withdrawal()` RPC.
- [ ] Agreed test scenarios covered — **implemented, not automated-tested yet**. Manual verification needed once migrations are applied to a live Supabase project (no local Supabase env in this session — same limitation the B‑9 CSV export work hit).

### B‑7 · Admin payout dashboard — list — **DONE 2026‑09‑16 (Stage 3 step 5)**
- [x] Within `/admin`: withdrawal‑request list (date, trainer, amount, **masked** bank, status, last‑updated). New `/admin/payouts` route, `admin_list_withdrawal_requests()` RPC.
- [x] Filter: Requested / Processing / Paid / Rejected‑Cancelled / All. (Built as 5 separate statuses + All, matching `withdrawal_requests.status`, rather than combining Rejected+Cancelled into one filter value — the spec's dash likely means "and", and combining them would hide which one happened.)
- [x] Header totals: count+sum of Requested; count+sum of Processing.
- [x] **Bank masked**; non‑admin blocked server‑side (`is_platform_admin()` gate in the RPC).

### B‑8 · Admin payout detail, status workflow, corrections — **DONE 2026‑09‑16 (Stage 3 step 6)**
- [x] Detail: trainer profile link, amount, **full bank details (admin‑only)**, request timestamp, **full status history**. `admin_withdrawal_detail()` RPC, `/admin/payouts/[id]` route.
- [x] Workflow: Requested → Processing → Paid. Plus Rejected/Cancelled (reason note). `admin_set_withdrawal_status()`.
- [x] Admin performs actual transfer outside platform; tracks by status only. Unchanged, as spec'd.
- [x] **Corrections:** admin undo erroneous status (reason + timestamp + admin identity), logged. **No DB edits by developer.** Forward steps (Requested→Processing, Processing→Paid) don't require a reason; every other transition (reject/cancel/undo) does, enforced server‑side. Reversing away from `paid` un‑settles the specific orders that withdrawal covered (see the FIFO settlement assumption in the Decisions log).
- [x] **Bank protection:** full details only here; masked elsewhere; **never logged**; server‑side enforcement. (Log‑scan test still needs a live environment to run against.)

### B‑9 · CSV export (from `/admin`)
- [x] Exports: **Users**, **Trainers**, **Bookings/orders** (gross, platform‑fee rate/amount, processing‑fee rate/amount, trainer payable, payment status, refund status, service‑completion, settlement‑eligibility, settlement status), **Withdrawal requests** (masked account).
- [x] Exclude full card numbers, CVV, full bank account numbers (masked everywhere except B‑8; see §6.3/§8.4).

**Implemented (v1, Phase 1 baseline):**
- `supabase/migrations/0035_csv_export_support.sql` — fee‑split + refund + settlement columns on `payments` (backward‑compatible defaults); `payment_refund_status`/`settlement_status`/`settlement_eligibility_status` enums; relaxed `payments.provider` check to `('newebpay','simulated')` (dynamic drop of the legacy auto‑named constraint); `users.bank_account` (raw) + `users.bank_account_mask`; `withdrawal_requests` table (RLS, trainer‑read policy) + trigger; 4 admin‑gated `security definer` RPCs (`admin_export_users|trainers|orders|withdrawals`) returning `jsonb`, guarded by `is_platform_admin()`. **Users RPC projects only safe columns** (`bank_account`/`push_token`/`email` never exported).
- `apps/web/src/lib/export/csv.ts` — RFC 4180 serializer (`escapeCsvField`, `toCsv`, `CsvColumn`/`CsvExport` types).
- `apps/web/src/lib/export/mask.ts` — `maskBankAccount` (keep last 4, mask the rest; never returns the raw value).
- `apps/web/src/lib/export/exports.ts` — 4 `CsvExport` definitions with the exact B‑9 column headers (fee split, statuses, masked bank), plus `ADMIN_EXPORTS` registry + `getAdminExport`.
- `apps/web/src/app/api/admin/exports/[resource]/route.ts` — admin‑gated GET; calls the RPC via the session server client; streams CSV with `Content-Type: text/csv`, `Content-Disposition: attachment`, `nosniff`, `no-store`. Logs **only** `{resource, rows}` (never row payloads / bank data). Returns 503 when Supabase is unconfigured, 403/404/500 otherwise.
- `apps/web/src/features/admin/admin-exports-view.tsx` + `apps/web/src/app/[locale]/(tabs)/admin/page.tsx` — 4 download buttons in the admin page (admin‑gated at the page AND the route).

**Verification results (automated, no Supabase env available locally):**
- `yarn web:test src/lib/export` → **23/23 passing** (`csv.test.ts`, `mask.test.ts`, `exports.test.ts`).
- `yarn web typecheck` → new files **clean**; the only remaining TS error is pre‑existing and unrelated (`auth/recovery/confirm/page.tsx` TS2345, present before this change).

> ⚠️ End‑to‑end runtime (downloading from `/admin`) requires a real Supabase project with migration `0035` applied and an admin user. Local unit tests cover the CSV/serialization/masking logic and column sets, which is the testable core.

**How to test (manual, requires a Supabase environment + admin login):**
1. Apply the migration: `supabase db push` (or `supabase db push --include-all` if the CLI is linked), then `supabase db push` and confirm `0035_csv_export_support.sql` is applied (verify `pg_functions` has `admin_export_*`, `withdrawal_requests` table exists, `payments` has `gross_amount`/`refund_status`/`settlement_status`).
2. Seed/ensure an admin user: `update users set is_admin = true where id = '<your-uid>';` (or use the client's existing admin account).
3. Start dev: `yarn web dev` (or `yarn dev`).
4. Sign in as the admin user → navigate to `/admin` (locale‑prefixed, e.g. `/zh-TW/admin`). You should see the **資料匯出 (CSV)** card with 4 **下載** buttons.
5. Click each button and open the downloaded `.csv` in a spreadsheet:
   - **Users** → columns: User ID, Display Name, Home Area, Experience Level, Is Companion, Is Admin, Created At. **No `bank_account`, `push_token`, or email column.**
   - **Orders** → contains the B‑9 fee columns: Gross Amount, Platform Fee Rate/Amount, Processing Fee Rate/Amount, Trainer Payable, Payment Status, Refund Status, Service Completed At, Settlement Eligibility, Settlement Status (+ provider/provider_type).
   - **Withdrawals** → a **Bank Account (masked)** column; no full bank number appears anywhere in the file.
6. Security checks:
   - Sign in as a **non‑admin** user and hit `/api/admin/exports/users?format=csv` directly → expect **HTTP 403**.
   - Hit `/api/admin/exports/bogus?format=csv` → expect **HTTP 404**.
   - Inspect server logs (Vercel / `vercel dev`) — confirm no row payloads or bank values are logged (only `admin_export_served { resource, rows }` and `admin_export_failed {...}`).
7. Unit‑test verification (does not need Supabase): `yarn web:test src/lib/export` — 23 tests assert CSV escaping/quoting/newlines, bank‑masking (last‑4 only, never the full value), and that the Orders/Withdrawals column sets contain every B‑9‑required header and no full bank number in serialised output.

**Open dependencies (do NOT block v1 delivery):** P‑6 (bank account field format for manual transfers) — as of 2026‑09‑16 (Stage 2c) `users` has structured fields (`bank_code`, `bank_name`, `branch_name`, `bank_account_number`, `bank_account_holder`) with a best‑guess Taiwan bank‑transfer shape; `bank_account_mask` is auto‑derived and the export/list surfaces only that masked copy, never the raw number. Adjust the column shape later if P‑6 specifies something different (a migration, not a redesign). P‑5 (service price data) feeds `agreed_price`/fee backfill. Fees are recorded where the provider exposes them and are never deducted from the trainer's 95% (per §5.1 Quick Ref); rounding precision is a Phase 2 open item, documented in the Decisions log.

### B‑10 · Live NewebPay cutover (M4, contingent)
- [ ] Await P‑2 / P‑3 / P‑4.
- [ ] Implement live NewebPay provider per platform‑merchant spec; verify in NewebPay **sandbox**.
- [ ] **Joint sandbox walkthrough** with client before cutover.
- [ ] Cut over by **configuration only**; Phase‑1 records survive unchanged.

### Scope B exclusions — B‑X1…B‑X12 (points/wallet, subscriptions, automated payouts, notifications, e‑invoice/tax, refund automation, Apple IAP/Google Play, multi‑currency, mobile checkout, merchant app, dispute tooling).

---

## Platform‑wide (M3 gating)

- **Beta environment:** production‑class staging; ≥100 general + ≥30 partner test accounts creatable; client gets highest‑level admin.
- **A9 CSV export** (B‑9 above).
- **A10 Consent & legal pages:** ToS, Privacy, exercise/service risk disclosure, partner cooperation & conduct rules. Checkboxes, version dates, consent records stored. **Client supplies wording.**
- **Security & data:** no secrets in source; no card/CVV stored; bank details masked except B‑8; never logged; server‑side role enforcement; no direct client table queries.
- **Cost control:** free tiers; no paid upgrades without written client approval; notify before free‑tier limits.
- **A11 Backups:** basic data backup; **weekly repo backup**; git tag at each milestone (`m1-staging`, `m2-staging`, `m3-production`, `m4-live`); handover mirrors full history/branches/tags to client GitHub Org.

---

## Cost control (§6.4)
- [ ] Use free tiers during closed Beta wherever practical.
- [ ] **No paid plan/upgrade/recurring charge without client's prior written approval.**
- [ ] **Proactively notify client** before any free‑tier limit or budget threshold is expected to be hit.
- [ ] Keep production accounts client/PacerGo‑owned or admin‑controlled where practicable.

## Governance / process (read alongside the build tracker)
Not build tasks, but acceptance is driven by them — track in milestones:
- **Acceptance (§9):** per requirement = meets DoD → client marks Accepted (date + initials); DoD is the *sole* test. Per milestone: client has **10 business days** to test or report defects. Silence = deemed accepted. **Overall MVP Acceptance = M3 accepted**; M4 is separate, not a precondition.
- **Defect loop (§9):** fix → resubmit affected requirements → 10‑day window restarts *for those only*. Defect = DoD failure, nothing else. Change-request, never defect, for scope beyond spec.
- **Warranty (§10):** M3 acceptance → 30‑day bug‑fix window (M1–M3); M4 acceptance → 30‑day (B‑10). New requirements / 3rd‑party outages / misuse not covered. M4 delay doesn't extend M3 warranty.
- **Change requests (§11):** written proposal → dev schedule impact → both confirm in writing → appended as numbered items (A‑9, B‑11, …).
- **Repo handover (§8.1 / §12):** web app source lives in **GitLab (Jeriel until Full Closing)**; git tag each milestone (`m1-staging`, `m2-staging`, `m3-production`, `m4-live`); weekly repo backup preserving full history/branches/tags; at handover mirror complete repo to client GitHub Org.
- **Advisory scope (§13):** post‑delivery is advisory only (no code/debug/PR/deploy/maintenance); separate quote for anything beyond review/guidance.

## Testing minimums (required for acceptance)

- [ ] **A‑2 determinism:** same inputs → byte‑identical plan, across sessions/devices (automated).
- [ ] **A‑2 network log:** zero AI/LLM calls at generation (verifiable).
- [ ] **B‑3 idempotency:** replayed notify → no duplicate confirmation.
- [ ] **Access control:** user / trainer / admin isolation server‑side.
- [ ] **Log scan:** no bank details in app logs.
- [ ] **i18n + theme QA:** both languages × both themes, no breakage.
- [ ] **A‑1 combination matrix:** every combination generates a complete plan, no missing exercise data.

---

## Client prerequisites (tracked; delays extend timeline, not dev)

| ID | Item | Blocks | Needed by | Status |
| --- | --- | --- | --- | --- |
| P‑1 | Company registration + 統一編號 | P‑2 → M4 | ASAP | ☐ |
| P‑2 | NewebPay corporate platform‑merchant + sandbox creds | B‑10 / M4 | Before M4 | ☐ |
| P‑3 | NewebPay production creds | B‑10 cutover | Before cutover | ☐ |
| P‑4 | NewebPay platform‑merchant spec | §5.1 review, B‑10 | Next joint meeting | ☐ |
| P‑5 | Service price data confirmation | B‑1 | ~Oct 8 | ☐ |
| P‑6 | Bank account field format | B‑6, B‑7, B‑8 | ~Oct 8 | ☐ |
| P‑7 | Exercise DB copy (zh) review/approval | A‑5, A‑7 | 5 biz days after W3 draft | ☐ |
| P‑8 | Settlement rule confirmed | B‑6 | Confirmed | ☑ |
| Legal text | ToS / Privacy / risk / partner rules | A10 | Before M3 | ☐ |

Phase 1 of Scope B (B‑1…B‑9) is **not blocked** by P‑1–P‑4. Only B‑10/M4 depends on them.

---

## Decisions log (append here)

- **[decided 2026‑09‑16] Simulated‑vs‑live provider abstraction: built; default: still `newebpay`.** Stage 4 built the `PaymentProvider` interface (`apps/web/src/lib/payments/provider.ts`) with both a `newebpayProvider` (live, unchanged behavior) and a `simulatedProvider` (new, working). This unblocks the *code* — B‑2 and the eventual B‑10 cutover no longer need a redesign. What is **still explicitly left open, not assumed:** which one is *active* by default. `getActiveProviderType()` defaults to `newebpay` (today's live production behavior) and only switches to `simulated` if `PAYMENT_PROVIDER=simulated` is set. Flipping that env var is the actual Phase‑1 cutover the spec wants (§5.1: "Phase 1: simulated provider... no real money") — it stops the platform from collecting real payments on new bookings, which is a business/ops call for the client/PacerGo, not something to flip silently in a code change. **Action needed:** client/PacerGo decides when to set `PAYMENT_PROVIDER=simulated` (presumably before M2/M3, per the spec's own phasing) and confirms this in writing per §11.
- **[pending] Fee rounding rule.** Must be documented (B‑1 DoD). **Still open** — implemented as an isolated, named, swappable function (`compute_order_fee_split` in `0037_settlement_scheduling.sql`) with a `-- TODO(pending client confirmation)` comment and a single named rounding constant, so the formula can change without touching call sites. Do not treat the current rounding mode as final.
- **[decided 2026‑09‑16] Bank‑account field format (P‑6): best‑guess shape shipped, not final.** `0038_bank_account_fields.sql` adds `bank_code`, `bank_name`, `branch_name`, `bank_account_number`, `bank_account_holder` to `users` — standard Taiwan bank‑transfer fields, chosen because the shape is low‑risk to guess and blocking Stage 3's schema on P‑6 would have stalled the whole payout system. `bank_account_mask` is auto‑derived via a trigger, mirroring `maskBankAccount` in the CSV‑export code exactly. **Still open:** whether this exact column shape matches what P‑6 actually specifies — adjust via a follow‑up migration if not (not a redesign; nothing depends on the internal column names outside this migration and the functions that read them).
- **[decided 2026‑09‑16] Withdrawal‑to‑order settlement mapping: FIFO, whole orders, documented assumption.** The spec defines trainer balance ("sum of eligible, unsettled orders") and a withdrawal cap (`<= balance`), but never specifies which underlying orders a *paid‑out* withdrawal actually settles — and the schema's per‑order `settlement_status` enum (`unsettled`/`paid`) can't represent a partial settlement anyway. `apply_withdrawal_settlement()` (`0041_payout_admin.sql`) settles whole orders oldest‑`service_completed_at`‑first until the cumulative `trainer_payable` covers the withdrawal amount — the last order applied can push the total slightly over the requested amount, never under. A `withdrawal_settlements` join table records exactly which orders each withdrawal covered, so a B‑8 correction/undo (`undo_withdrawal_settlement()`) reverses the right ones. Revisit if the client's actual manual bank‑transfer reconciliation process needs exact amounts instead of whole‑order settlement.
- **[stopped 2026‑09‑16] Stage 5 (Scope A rebuild) not started, deliberately.** Attempted to scope just step 1 ("re‑scope the 6 inputs" in `enums/training.ts`) in isolation per the execution‑order doc's plan. On inspection, the *current* `/ai-plan` route (`ai-plan-view.tsx`, `actions.ts`) consumes every field that step would remove or reshape with no adapter layer — changing the enum alone breaks the build and takes down the currently‑shipped, working route. Confirmed this has to land as one build (enum → structured plan data model → exercise content DB → UI → determinism tests), not seven independent small steps as the execution‑order doc originally implied. Also: ≥80 exercises need real photography/illustrations (A‑7), which is content production an agent session cannot generate. **Action needed:** schedule Stage 5 as one dedicated build (or an explicit, early M1‑date conversation with the client per §11 — see "Open risk" in `phase2-execution-order.md`).
- **[pending] 30‑min expiry semantics.** Does expiry re‑open the slot immediately server‑side? (B‑1) **Resolved for now:** yes, but there is **no discrete time‑slot table** in this schema — availability is enforced by `create_booking`'s check for an existing open booking between the same seeker/companion pair (`0033_newebpay_payments.sql` `create_booking`, the `status in ('requested','pending_payment','payment_processing','payment_failed')` exists‑check). "Releasing the slot" therefore means: the cron job transitions a stale `payments.status` to `'expired'` **and** the paired `bookings.status` to `'expired'` in the same transaction, so it drops out of that open‑booking check and a new booking attempt is immediately unblocked. No separate release step exists or is needed.
- **[decided 2026‑09‑15] Consent-page content storage.** Legal text (Terms/Privacy/risk/partner-rules) is **hardcoded i18n copy** (`apps/web/src/locales/{en,zh}/legal.json`), not a database content table. Re-reading the spec: "client supplies all legal wording; dev implements... only" implies the client hands over finished text, not that they self-edit it through an admin UI — nothing requires the body text to be a DB entity. "Versioning" is satisfied by one hand-bumped date-string constant per document (`CONSENT_VERSIONS` in `apps/web/src/lib/consent.ts`), bumped whenever the client sends updated wording. The only database table is `consent_records` (0036) — the audit trail of which user agreed to which version, when; this is the part the spec actually requires to be stored. (First pass at this migration modeled the document text itself as a versioned table + read RPC — over-engineered relative to the requirement; rewritten in place since nothing had been pushed to Supabase yet.)
- **[decided 2026‑09‑15] Scheduling mechanism.** `pg_cron` inside Supabase Postgres — confirmed available on all plans including Free (enabled via `CREATE EXTENSION IF NOT EXISTS pg_cron`, no cost, no external service). Rejected Vercel Cron: Hobby plan caps jobs at once/day, too coarse for a 30‑min order‑expiry or a timely 24h settlement‑hold check. Cron‑invoked functions run as the job owner (not a request‑scoped role), so `auth.uid()` is `NULL` inside them — these must be separate internal functions, **not** exposed to `authenticated`/`anon` and **not** reusing the `is_platform_admin()`/`auth.uid()`‑gated RPC pattern used elsewhere.
- **[decided 2026‑09‑22] Stage 5 (Scope A rebuild) is DONE — supersedes the 2026‑09‑16 "not started" entry above.** Built in a separate session from the one that wrote that entry, and this tracker wasn't updated at the time, which is why the two prior planning docs described a stopped, unbuilt Stage 5 for six days after it had actually shipped. **Client/PacerGo decision, recorded here:** the built system deliberately does not match the spec's literal "exactly 6 inputs" list. It ships as a three‑part guided wizard (About You / Training Preferences / Gym & Equipment, ~18 screens) instead, plus a Rest Timer preference the spec never mentioned. This is accepted as the actual Scope A requirement going forward — **the spec's 6‑input list and `enums/training.ts` are superseded for web**, not a gap to close later. Reasons this was chosen over building the literal 6‑input version: the 6‑input list collapses distinctions (age, exact height/weight, muscle inclusion/exclusion, cardio preference) that the composer needs to generate a plan that doesn't feel generic, and matching them literally would have meant either a worse-generated plan or a second hidden data-collection step — neither serves the client better than the wizard actually built. `enums/training.ts` / `plan-composer.ts` / `ai-plan-view.tsx` still exist and still work — they're `apps/mobile`'s only plan‑generation implementation (`apps/mobile/src/app/ai-plan.tsx` imports them directly) — so they were kept, not deleted; migrating mobile onto the new wizard/composer is open, tracked as a follow‑up, not a Scope A blocker for web. Also decided same day: A‑7's "≥80 exercises" is exceeded (302 shipped, verified live in Supabase), and A‑4/A‑5's exercise images are a confirmed, accepted gap (placeholder "Photo coming soon") pending real photography/illustration production — this was already anticipated as a P‑7/content‑production dependency, not a new miss.
