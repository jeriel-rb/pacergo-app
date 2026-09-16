# Phase 1 Improvements Before Phase 2

> Living readiness document for the **PacerGo Phase 2** spec (v1.0, 2026‑09‑09).
> It records (A) what Phase 1 (the delivered **v1 baseline**) already provides, and
> (B) **what must be improved in Phase 1 before Phase 2 work can proceed.**

This is the companion checklist for the dev lead and reviewers. Tick items as work lands;
do not reorder Phase 2 without revisiting the gates at the bottom.

> **Update 2026-09-15:** Stage 0/1/2a of `docs/phase2-execution-order.md` are done —
> baseline verified, A10 consent pages built, and the B-1/B-3 fee-split + 30-min order
> expiry gaps noted below are closed. This file is left as the original point-in-time
> baseline audit; see the execution-order doc for current status per item.

---

## Context / snapshot

- `main` is the **delivered v1 baseline**. Latest commit: **2026‑07‑27**.
- The Phase‑2 spec was written **2026‑09‑09** (kickoff 2026‑09‑10) → it **post‑dates** the baseline.
- The baseline already contains a **live NewebPay** checkout ("newwebpay nearly done", 2026‑07‑24),
  but Phase 2 §5.1 wants **Phase 1 = simulated provider, Phase 2 = live cutover by config.**
  This live‑vs‑simulated conflict is the first thing to resolve.
- `node_modules` is **not installed** → nothing runs locally yet. The web app falls back to
  mock fixtures when `.env.local` is absent (`USE_MOCK = !NEXT_PUBLIC_SUPABASE_URL`).

---

## A. Phase 1 — what is already delivered (baseline)

Mapped to the spec's §3 + A1–A11. ✅ = present, ⚠️ = present but diverges from Phase 2, ❌ = missing.

| Item | Spec ref | Baseline state (evidence) |
| --- | --- | --- |
| Mobile / web / website / Supabase backend | §3 | ✅ `apps/{mobile,web,website}` + `supabase/`, 34 migrations, Tokyo ref `kezkrcyfnjlugkrcbwmy` |
| Discovery, browse & book | §3 / A4 | ✅ `features/booking`, `features/trainers`, booking FSM (`packages/shared/booking/state-machine.ts`) |
| Tier A/B/C qualification + cert review | §3 | ✅ `0026/0027` tier bands + competition gate |
| Admin review queue | §3 | ✅ `features/admin/admin-view.tsx` (cert approve/reject) |
| Rule‑based AI workout menu (composer) | §3 | ✅ `packages/shared/src/plan/` + `features/ai-plan` |
| Community & messaging | §3 | ✅ `conversations`/`messages` + `features/chat` (tab `comingSoon`) |
| Customer support entry points | §3 | ✅ `features/support` |
| A1 Official website source/assets | A1 | ✅ source present; Sep‑15 handover = delivery action |
| A2 User accounts (register/login/logout/reset/profile) | A2 | ✅ `features/auth` + auth routes (token‑hash reset) |
| A3 Partner accounts (profile/availability/order flow) | A3 | ✅ `studio` + `companion_listings`/`listing_offerings`/`availability` |
| A5 Admin account (manage test accounts, view data) | A5 | ⚠️ review‑queue admin only — **not** a full platform payout/account admin |
| A6 Test capacity (≥100 users / ≥30 partners) | A6 | ✅ schema + `0009_seed_demo_trainers`; mock path |
| A7 Payments — **live** NewebPay | A7 / B‑2 live | ⚠️ live NewebPay near‑complete (`lib/payments/newebpay.ts`, `api/payments/newebpay/{create,notify,return}`) — contradicts Phase‑1‑simulated intent |
| A8 AI feature reachable | A8 | ⚠️ reachable from Home (`/ai-plan`), **no Beta label**; composer is markdown single‑session |
| A9 Data export CSV | A9 | ✅ built 2026-09-15 (`0035_csv_export_support.sql`, not yet applied to live DB) |
| A10 Consent / legal pages | A10 | ✅ built 2026-09-15 — placeholder copy, real legal text still awaited from client (see `docs/phase2-execution-order.md` Stage 1) |
| A11 Backup & versioning | A11 | ❌ git only; no backup/restore scripts, no milestone tags |
| i18n zh+en / light+dark themes | §6 | ✅ `i18next`/`react-i18next` + `next-i18n-router`; theme plumbing |
| No secrets in source / no direct client table queries | §6.3 / A8 | ✅ env‑gated; SECURITY DEFINER RPCs |
| Existing tests | §8.4 | ✅ `plan‑composer.test.ts`, `newebpay.test.ts` (A‑2 byte‑identical test **not** present) |

---

## B. Phase 1 — what needs to be improved before Phase 2

### 🔴 Blockers (no client dependency — do first)

- [x] **Install dependencies & verify the baseline.** Done 2026-09-15: `yarn install` clean,
      `yarn web typecheck` clean (1 pre-existing unrelated error), `yarn web test` green
      (91 passing, 3 pre-existing unrelated failures in `forgot-password-form.test.tsx`).
- [ ] **Decide the simulated‑vs‑live provider strategy.** Still **open** — the user explicitly
      chose not to decide this yet (2026-09-15); do not start B-2 provider-abstraction work
      or assume an answer. `payments.provider` check was already relaxed to allow `simulated`
      alongside `newebpay` in `0035_csv_export_support.sql`, but no simulated implementation
      exists.
- [ ] **Promote the admin role** so the Phase‑2 admin can reach the payout/CSV/bank surfaces, not just the cert queue.
      (CSV export surface now exists and is admin-gated; payout/bank surfaces still don't exist — see Stage 3.)

### 📐 Scope A — Personalized Workout Plan Generator (Beta)

The baseline composer emits **markdown for one 60‑minute session** using **9 inputs**. Phase 2
requires a **structured 4‑week saved plan** + an **exercise database**. Several items are a **re‑scope**,
not an extension.

**Input model (A‑1) — diverges from baseline**
- [ ] Rework `packages/shared/src/enums/training.ts` to the spec's **exactly six** inputs. The baseline has
      two inputs the spec explicitly **excludes** — **`ageBand`** and the **`nutrition` boolean** — and option sets that differ:
      - Goals: baseline = `fat_loss, muscle_gain, endurance, flexibility, functional` (5) → spec =
        `muscle_gain, fat_loss, functional, general_fitness` (4). Drop `endurance`/`flexibility`, add `general_fitness`.
      - Locations: baseline = `home, full_gym, limited_gym` (3) → spec = `gym (full), home (dumbbells+bands), bodyweight only, outdoor` (4). Remap.
      - Frequency: baseline = `low/mid/high` buckets → spec = `every day / every 2 days / 3× / 2× / 1× per week` (5, incl. alternating rest).
      - Experience `beginner/intermediate/advanced` ✅; Gender+weight class ✅ (gender‑aware); Diet mode ✅.
- [ ] Remove `ageBand` + `nutrition` from `PlanSelection` (`plan-composer.ts`) and `ai-plan-view.tsx`;
      drop the `IF_YOUTH_CAUTION` branch from `plan-data.ts`.

**Composer & data model (A‑2)**
- [ ] Replace single‑session markdown with a **structured 4‑week `Plan` model** (weeks × training days × rest days × warm‑up/main/cool‑down groups × exercise refs).
- [ ] **Persist saved plans** per user; replace‑on‑update via A‑6.
- [ ] Enforce **10/40/10** per session in the structured model (not just prose).
- [ ] **Byte‑identical determinism test** (existing `plan-composer.test.ts` only does containment checks).
- [ ] **Network‑log test**: zero AI/LLM calls at generation (§8.4).
- [ ] **Full A‑1 combination‑matrix test**: every input combo → complete plan, no missing data.

**Exercise database (A‑5, A‑7)** — repo‑wide grep finds **no `exercises` table at all**
- [ ] New `exercises` table + seed **≥80 distinct exercises** across the 4 location/equipment sets, each with: thumbnail image, target muscles, zh+en name, 3–6 steps, 1–3 tips, sets×reps/duration, rest. **No empty fields.**
- [ ] Author content now; send draft to client **W3** for P‑7 approval (5‑business‑day SLA).

**UI (A‑3, A‑4, A‑6, A‑8)**
- [ ] Program overview (week tabs, day cards, session focus, 60 min, rest days).
- [ ] Daily workout screen (grouped warm‑up/main/cool‑down; name zh/en; sets×reps or duration; rest; thumbnail).
- [ ] Exercise detail page (name, muscles, image, steps, tips, zh+en).
- [ ] Update Workout Plan flow (A‑6) with **no regenerate button**; unchanged inputs → identical plan.
- [ ] **"Beta" label** (zh+en) on Home entry + all program screens; naming = "Personalized Workout Plan Generator (Beta)".
- [ ] i18n + light/dark QA, no layout breakage.

### 💰 Scope B — Payments & trainer payouts

Baseline ships live NewebPay checkout + a `payments` table, but with **no fee split, no provider
abstraction, no settlement, no payouts, no CSV, and no bank fields.**

**Order, record & status (B‑1, B‑3, B‑5)**
- [x] Fee‑split columns added (`0035_csv_export_support.sql`) AND now actually populated at
      order-creation time (`0037_settlement_scheduling.sql`, `compute_order_fee_split()`) —
      done 2026-09-15. **Rounding rule still `[pending]` client confirmation** — implemented
      as one isolated, named function so it's a one-line change once confirmed.
- [x] `provider_type` / `refund_status` / settlement fields (`service_completed_at`,
      `settlement_hold_until`, `settlement_status`, `settlement_eligibility_status`) — columns
      exist since `0035`. Still **not populated** by any settlement logic — that's Stage 3
      (trainer payout & settlement system), not yet started.
- [x] 30‑minute expiry of unpaid orders + release — done 2026-09-15 via pg_cron
      (`expire_stale_payment_attempts()`, `0037_settlement_scheduling.sql`), see
      `docs/phase2-execution-order.md` Stage 2a for the "release the slot" mechanism detail.

**Provider abstraction (B‑2)**
- [ ] Provider interface (`createAttempt`, `buildForm/redirect`, `verifyCallback`).
- [ ] **Simulated provider** (Phase 1): review → approve/decline test screen, no card data, clear test/beta label.
- [ ] **Live NewebPay provider** (Phase 2): wrap existing `lib/payments/newebpay.ts`; keep `create/notify/return`
      routes but dispatch through the abstraction.

**Order status views (B‑4)**
- [ ] User: own orders (amount + payment status). Trainer: own orders (payable 95%, eligibility, settlement status).
- [ ] Server‑side role enforcement.

**Settlement state machine & trainer balance (B‑6)**
- [ ] Background job: session end → **Service Completed** (auto; admin correct w/ reason + audit).
- [ ] 24h **hold** from Service Completed.
- [ ] Then **Eligible for Payout** iff paid, not cancelled, not refunded, no dispute/admin hold.
- [ ] `trainer_balances` = sum of eligible‑unsettled orders.
- [ ] Withdrawal request ≤ available balance (else clear error; appears in admin list immediately).

**Admin payout dashboard (B‑7, B‑8)** — depends on **P‑6 (unmet)**: `profiles`/`users` has **no bank fields**
      (repo‑wide grep for `bank` = 0).
- [ ] Model a bank‑details field on the trainer profile using the format the client specifies.
- [ ] B‑7 list: requests (date, trainer, amount, **masked** account, status, last‑updated); status filters; header totals.
- [ ] B‑8 detail: **full bank details (admin‑only)**, request timestamp, **full status history**.
      Workflow Requested→Processing→Paid; Rejected/Cancelled from Requested|Processing w/ reason.
      Admin corrections (undo) w/ reason + audit log.
- [ ] **Bank‑data protection:** masked everywhere except B‑8 detail; **never logged**; server‑side enforcement; log‑scan test (§8.4).

**CSV export (B‑9)**
- [ ] Admin exports for Users, Trainers, Bookings/orders
      (gross, platform‑fee rate/amount, processing‑fee rate/amount, trainer payable, payment status,
      refund status, service‑completion, settlement‑eligibility, settlement status), Withdrawals.
- [ ] Exclude full card numbers/CVV and **full bank account numbers** (masked only).

**Live cutover (B‑10)** — deferred to P‑2/3/4; config‑only switch; Phase‑1 records survive.

---

## Client prerequisites (§7) — baseline status

| ID | Item | Blocks | Baseline status |
| --- | --- | --- | --- |
| P‑1 | Company registration + 統一編號 | P‑2 → M4 | ☐ unmet |
| P‑2 | NewebPay corporate platform‑merchant + sandbox creds | B‑10 / M4 | ☐ unmet |
| P‑3 | NewebPay production creds | B‑10 cutover | ☐ unmet |
| P‑4 | NewebPay platform‑merchant spec | B‑10 design | ☐ unmet |
| P‑5 | Service price data confirmation | B‑1 | ☐ unmet |
| P‑6 | Bank account field format | B‑6, B‑7, B‑8 | ☐ **unmet — no bank fields modelled** |
| P‑7 | Exercise DB copy (zh) review/approval | A‑5, A‑7 | ☐ draft due W3 |
| P‑8 | Settlement rule confirmed | B‑6 | ☑ confirmed |
| Legal text | ToS / Privacy / risk / partner rules | A10 / M3 | ☐ unmet |

Only P‑1–P‑4 block M4 (B‑10). Phase 1 of Scope B (B‑1–B‑9) is otherwise unblocked.

---

## Verification gates before Phase 2 builds land

1. `yarn install` → `yarn web typecheck` clean + `yarn web test` green (baseline verified, §3).
2. **Recorded decision** on simulated‑vs‑live provider strategy (Blocker B‑2).
3. **P‑5, P‑6, and legal text received** (they shape B‑1, B‑6/B‑7/B‑8 schema and A10).
4. **W3 exercise‑copy draft sent** for P‑7 (5‑business‑day SLA).

Once these clear, Phase 2 maps onto the weekly plan:
W1 = Scope A model + exercise DB + composer; W2 = A‑1/A‑2 + determinism test;
W4 = A‑7–A‑8 + M1 staging; W5 = B‑1–B‑9 + M2 staging; W6 = M3 production.
