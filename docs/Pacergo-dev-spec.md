# PacerGo Phase 2 - Dev Spec & Requirements

**Version:** 1.0 | **Date:** 2026-09-09 | **Kickoff:** 2026-09-10

**Owner:** Jeriel (dev lead) | **Client contact:** Aerion Tsai (蔡翊陽)

**Stack:** Web app (existing Pacergo codebase), Supabase backend, Vercel hosting, NewebPay (藍新金流)

**Languages:** zh-TW default + EN | **Themes:** light + dark | **Platform:** web only

# 1. Project Summary

Deliver two scope items on the Pacergo web app, end to end:

- **Scope A:** Personalized Workout Plan Generator (Beta). Deterministic, rule-based, full 4-week plan.
- **Scope B:** NewebPay per-order payments + trainer payout administration. Phase 1 simulated, Phase 2 live cutover.

Plus: production Beta environment, admin tooling, CSV export, consent pages, backups, documentation, handover.

No mobile app work. No new features beyond this document.

# 2. Timeline & Milestones

| Milestone | Contents | Target date | Notes |
| --- | --- | --- | --- |
| **Kickoff** | Effective start | **Thu 2026-09-10** |  |
| **Website handover** | Existing official website: full source, assets, deployment notes delivered to client | **Tue 2026-09-15** | 3 business days after kickoff |
| **M1** | Scope A (A-1 to A-8) complete on **staging** | **Thu 2026-10-08** |  |
| **M2** | Scope B Phase 1 (B-1 to B-9) complete on **staging**, simulated payments | **Thu 2026-10-15** |  |
| **M3** | **Production release**, free Beta. Both scopes live, payments simulated | **Tue 2026-10-20** | Starts 30-day bug-fix window |
| **M4** | Live NewebPay cutover (B-10) | Contingent. Start ASAP after P-2, P-3, P-4 received. Finish ≤ 8 weeks after last item received | Starts separate 30-day bug-fix window |

## Weekly plan

| Week | Dates | Focus |
| --- | --- | --- |
| W1 | Sep 10 - Sep 16 | Website handover. Scope A data model, exercise DB schema, composer extension. Start exercise content authoring (80+ exercises). |
| W2 | Sep 17 - Sep 23 | A-1 questionnaire, A-2 composer + determinism test. Continue content. |
| W3 | Sep 24 - Sep 30 | A-3, A-4, A-5 screens. A-6 update flow. Send exercise copy draft to client (P-7). |
| W4 | Oct 1 - Oct 8 | A-7 content complete, A-8 Beta label/themes/i18n QA. **M1 to staging Oct 8.** Start B-1 to B-3 in parallel. |
| W5 | Oct 9 - Oct 15 | B-4 to B-9. Payment provider abstraction. **M2 to staging Oct 15.** |
| W6 | Oct 16 - Oct 20 | Production deploy, Beta env seeding, admin account, backups. **M3 production Oct 20.** |
| Post-M3 | Oct 20 - Nov 19 | 30-day bug-fix window for M1 to M3 scope. Weekly updates continue. |
| M4 | TBD | When P-2/P-3/P-4 arrive: implement live provider, sandbox test, joint walkthrough, config-only cutover. |

**Dates are outer limits.** Deliver earlier when possible. Early delivery does not shorten acceptance or warranty windows.

**Client review deadlines (they owe you):**

- Exercise DB copy (P-7): approval/comments within **5 business days** of receiving draft.
- Each milestone: test + written defect list within **10 business days** of ready notice. Silence = deemed accepted.

# 3. Baseline (Already Delivered, v1)

Verify these work before Phase 2 work. No rework owed, only bug fixes.

- Mobile app, web app, marketing website, Supabase backend
- Companion discovery and booking
- Tier qualification and certification review (Tiers A/B/C)
- Admin review queue
- Existing rule-based AI workout menu (plan composer to be extended)
- Community and messaging
- Customer support entry points

**Platform items (confirm present in Beta):**

| ID | Item | Requirement |
| --- | --- | --- |
| A1 | Official website | Source, assets, deployment notes handed over Sep 15 |
| A2 | User accounts | Register, login, logout, password reset (if architecture supports), profile |
| A3 | Partner accounts | Register, personal/service profile, availability, agreed order flow |
| A4 | Browse & book | Users browse partners/services, complete core booking flow |
| A5 | Admin | Highest-level admin account for client: manage test accounts, view core data |
| A6 | Test capacity | ≥100 general test accounts + ≥30 partner accounts creatable. Not a concurrency guarantee. |
| A7 | Payments | Per-order NTD. Phase 1 simulated, Phase 2 live NewebPay. See Scope B. |
| A8 | AI feature | Personalized Workout Plan Generator (Beta). See Scope A. |
| A9 | Data export | CSV. See B-9. |
| A10 | Consent | Terms, privacy, risk notice, partner-rule pages. Checkboxes, version dates, consent records. Client supplies legal text; dev implements only. |
| A11 | Backup & versioning | Basic data backup, weekly updates, milestone version tags |

# 4. Scope A - Personalized Workout Plan Generator (Beta)

## 4.1 Core principles

- **Deterministic, rule-based.** No live AI/LLM calls at request time. Ever.
- **Pre-generated content** from curated exercise DB + rule-based composer (extend existing composer).
- **Full plan up front.** All 4 weeks, every day, every exercise visible immediately. Nothing drip-released.
- **Read-only plan.** No progress tracking, no completion state, no streaks, no history.
- **Same inputs → byte-identical plan.** Different plan only by changing inputs.
- **Naming:** "Personalized Workout Plan Generator (Beta)". UI copy must not imply live/conversational AI coach.
- **Free Beta** for all users. No paywall, no gating.
- Design reference: "Kilo" app. Inspiration only, simplified adaptation. No clone owed.

## 4.2 Requirements

### A-1 · Onboarding questionnaire

Single guided flow. Exactly six inputs, exactly these options:

1. **Goal:** muscle gain 增肌 / fat loss 減脂 / functional fitness 功能性 (Hyrox·CrossFit) / general fitness 綜合體能
2. **Experience:** beginner / intermediate / advanced
3. **Training frequency:** every day / every 2 days / 3× per week / 2× per week / 1× per week
4. **Location & equipment:** gym (full equipment) / home (dumbbells + bands) / bodyweight only / outdoor
5. **Gender and weight class:** existing gender-aware classes
6. **Diet mode:** existing diet-mode options

No other inputs. No age, height/weight numbers, injury flags, session duration, target areas, free text.

**DoD:** All 6 inputs selectable with exactly listed options. Answers persist to user profile. Flow completable under 2 minutes. Works in zh-TW and EN.

### A-2 · Plan generation & saved plan

- Deterministic composer produces complete 4-week program from A-1 answers.
- Saved to user account. Viewable on return until replaced via A-6.
- Session structure: 10 min warm-up / 40 min main / 10 min cool-down = 60 min.
- Sessions per week and rest-day placement follow chosen frequency (e.g. every 2 days → alternating).
- Exercises only from curated DB, filtered by location/equipment.

**DoD:** Same answers → byte-identical plan across sessions and devices (**automated test required**). Saved plan viewable after logout/login without re-answering. Zero network calls to any AI/LLM during generation (verifiable in network logs). Every session respects 10/40/10.

### A-3 · Program overview screen

- Week 1 to 4 tabs (or equivalent).
- One card per training day: day label, session focus (upper / lower / full body / conditioning), duration (60 min).
- Rest days visibly marked.
- Read-only. No per-day status or check-off.

**DoD:** User navigates all 4 weeks and opens any day immediately after questionnaire. Layout matches chosen frequency exactly.

### A-4 · Daily workout screen

- Ordered exercise list grouped: warm-up / main / cool-down.
- Per exercise: name (zh/en), sets × reps (or duration for timed work), rest between sets, thumbnail image.

**DoD:** Every exercise row shows name, sets×reps/duration, rest, image. Every day opens with complete data.

### A-5 · Exercise detail page

Opened from A-4. Shows:

- Exercise name
- Target muscle groups
- One static illustration/photo
- Step-by-step text instructions (3 to 6 steps)
- 1 to 3 safety/form tips
- zh-TW + EN

**DoD:** Every exercise in shipped DB has complete detail page (image, muscles, steps, tips) in both languages. No empty fields in production data.

### A-6 · Update Workout Plan

- User re-opens questionnaire, changes one or more inputs, confirms via "Update Workout Plan" (更新訓練菜單).
- System produces deterministic plan for new inputs. Replaces saved plan.
- **No regenerate/re-roll control anywhere.** Confirming with unchanged inputs yields identical plan.

**DoD:** Changed input + confirm → deterministic plan for new inputs, replaces saved plan. Unchanged inputs + confirm → identical plan. No separate regenerate control exists.

### A-7 · Exercise content database

- **Minimum 80 distinct exercises** across the 4 location/equipment settings.
- Each: image, muscles, instructions, tips in zh-TW + EN.
- Must cover every A-1 combination without repeats feeling immediate.
- Dev authors. Client reviews copy (P-7). Send draft early (target W3).

**DoD:** ≥80 exercises live in production. Each A-1 combination generates complete 4-week plan with no missing exercise data.

### A-8 · Platform delivery, Beta labeling, naming

- Web app only. zh-TW default + EN. Light + dark themes.
- "Beta" label visible in both languages on feature entry point and program screens.
- Naming per 4.1.
- **No direct client-side table queries introduced.**

**DoD:** Feature reachable and fully functional on web app. No direct client-side table queries. Both themes and both languages render without layout breakage. Beta label visible. Naming compliant.

## 4.3 Scope A exclusions (do not build)

| ID | Excluded |
| --- | --- |
| A-X1 | Live / conversational AI, free-text Q&A, on-demand generation, regeneration from unchanged inputs |
| A-X2 | Exercise video content. Static images only. |
| A-X3 | Camera / computer vision, form analysis, rep counting |
| A-X4 | Wearables, Apple Health, Google Fit, heart-rate devices |
| A-X5 | Nutrition tracking, food logging, macros |
| A-X6 | Workout social: plan sharing, leaderboards, feeds |
| A-X7 | Custom / manual plan editing, user-authored exercises, drag-and-drop, session duration or body-part selection |
| A-X8 | Offline mode, downloadable programs |
| A-X9 | Program lengths other than 4 weeks |
| A-X10 | Progress / completion tracking, streaks, history, statistics. Zero per-user workout-state data. |
| A-X11 | Mobile app delivery |
| A-X12 | Paid AI subscription, promotional credits, gating |

# 5. Scope B - NewebPay Per-Order Payments & Trainer Payout Admin

## 5.1 Core principles

- **Per-order direct payment only.** No points, no wallet, no stored value, no subscriptions.
- Flow: user selects trainer/service/date/time → system creates NTD order from listed price → user pays that order → platform records everything → after service, Pacergo settles trainer manually by bank transfer outside platform.
- **Platform fee rule (business logic):** platform service fee = 5% of order price, deducted from trainer side. Customer pays displayed price. Trainer payable = 95%. Rounding rule must be documented.
- Third-party processing fee: record actual rate/amount where provider exposes it. Not added to checkout, not deducted from trainer 95%.
- **All funds go to client's own NewebPay account.** Developer never receives funds.
- **No notifications of any kind** (no email, push, LINE). Admin list/detail views are single source of truth.
- Two-phase delivery behind a **payment-provider abstraction**:
    - **Phase 1 (M2/M3):** simulated provider. Full order, payment-record, payout-admin system (B-1 to B-9). No real money. Records are real.
    - **Phase 2 (M4):** swap simulated provider for live NewebPay (B-10). No change to rest of system.
- NewebPay classified Pacergo as **platform collection-and-payout model (平台代收代付)**. Client must obtain corporate platform-merchant account. Design order/payout data model for this structure from day one so cutover requires no restructuring.
- Assumed integration pattern: signed trade request → hosted payment page → server notify (NotifyURL) + browser ReturnURL. Review against NewebPay spec (P-4) when received. Material deviation (sub-merchant onboarding APIs, mandated payout reporting, different API family) = change request, not defect.

## 5.2 Requirements

### B-1 · Order creation from booking

- After user selects trainer/service/date/time in existing booking flow, create NTD order: gross amount, platform fee (5%), trainer payable (95%).
- Service prices from trainer service data (P-5).
- Unpaid orders auto-expire after **30 minutes** (or gateway-defined window) and release time slot.

**DoD:** Order record has correct gross / 5% / 95% for agreed test prices (rounding documented). Unpaid order expires after 30 min, slot bookable again.

### B-2 · Checkout flow

Built behind provider abstraction.

- **Phase 1 (simulated):** order review → simulated payment screen with explicit approve / decline test controls → success or failure screen. Clearly labeled test/beta. No card data collected.
- **Phase 2 (live):** NewebPay hosted payment page with correctly signed trade request per platform-merchant spec (P-4). Redirect out, return after payment. Credit card baseline; other methods only as enabled on account.

**DoD:** Phase 1: simulated payment completes end-to-end including declined path, confirms real booking. Phase 2: sandbox test-card payment completes end-to-end, trade signature validates per NewebPay spec.

### B-3 · Payment confirmation & records

- Server-side confirmation endpoint (simulated callback Phase 1; NewebPay NotifyURL Phase 2).
- Verifies authenticity. **Idempotent**: duplicate notifies do not double-confirm.
- Payment record per order with fields: order ID, user, trainer, service, date/time, gross amount, platform-fee rate/amount, third-party processing fee rate/amount (where available), trainer payable, payment status, refund status, service-completion status, settlement-eligibility status, settlement status, provider trade number, method, timestamps, **provider type (simulated vs live)**.
- Payment statuses: processing / success / failed / cancelled-expired.
- Browser ReturnURL handling separate from authoritative server notify. **Booking confirms only on verified server-side confirmation.**

**DoD:** Booking confirms only on verified server confirmation, never browser return alone. Replayed notify creates no duplicates. Full payment record exists for every test case. Simulated records distinguishable from live.

### B-4 · Order status views

- Users: own orders with amount + payment status in account area.
- Trainers: own orders with payable amount (95%), settlement-eligibility status, settlement status.
- Read-only. Access enforced server-side.

**DoD:** Each role sees exactly its own orders with correct amounts/statuses. Server-side enforcement.

### B-5 · Cancellation & refund status recording

- Statuses: cancelled, refund requested, refunded. Set by admin action only.
- Actual refund executed manually by client in NewebPay console (or simulated equivalent). Platform records state only.
- Cancellation policy rules are client's business rules. This phase = status recording only.

**DoD:** Admin moves order through cancellation/refund statuses. User and trainer views reflect current status. Cancelled/refunded orders excluded from settlement eligibility and trainer available balance.

### B-6 · Trainer earnings, settlement eligibility, withdrawal request

State machine per order:

1. **Service Completed (automatic).** After booked session end time passes. Authorised admin may manually correct (no-show, reschedule error). Correction requires reason note, logged in status history.
2. **Settlement hold.** 24 hours from Service Completed timestamp.
3. **Eligible for Payout (automatic after hold).** Only if all hold at that time and thereafter: (a) payment succeeded; (b) not cancelled; (c) not refunded; (d) no unresolved dispute or admin hold. Order failing any condition is not (or ceases to be) eligible until resolved.

Flow: session ends → Service Completed → 24h hold → Eligible for Payout.

Trainer available balance = sum of eligible, unsettled orders. Trainer can submit withdrawal request ≤ available balance.

**DoD (agreed test scenarios):**

- Session end time passes → order auto-marked Service Completed.
- During 24h hold, amount absent from trainer available balance.
- After hold, amount auto-added if paid and no cancellation/refund/dispute/admin hold.
- Cancelled/refunded/disputed/admin-hold orders never count.
- Admin manual correction updates balance, logs reason + admin identity.
- Trainer balance figures always match underlying order records.
- Withdrawal request above balance rejected with clear error.
- Submitted withdrawal request appears in admin list (B-7) immediately.

### B-7 · Admin payout dashboard - list

Within existing `/admin` (admin-gated):

- Withdrawal-request list: request date, trainer name, amount, **masked bank account**, status, last-updated.
- Filter by status: Requested / Processing / Paid / Rejected-Cancelled / All.
- Header totals: count + sum of Requested; count + sum of Processing.

**DoD:** All requests shown with correct data. Each filter returns exactly matching rows. Totals equal sum of filtered rows. Account numbers masked in list. Non-admins blocked server-side.

### B-8 · Admin payout detail, status workflow, corrections

- Detail view: trainer profile link, amount, **full bank details (authorised admin only)**, request timestamp, full status history.
- Workflow: Requested → Processing → Paid. Plus Rejected / Cancelled from Requested or Processing, required reason note.
- Admin performs actual transfer outside platform. Platform tracks by status only.
- Each change logs timestamp + acting admin.
- **Corrections:** authorised admin can revert erroneous status via UI (e.g. undo Processing/Paid), required reason note, recorded in history. **No DB edits by developer needed.**
- **Bank-data protection:** full details only in B-8 detail view. Masked elsewhere. Never written to application logs. Server-side enforcement.

**DoD:** Valid transitions incl. Rejected/Cancelled and corrections available in UI with required reason notes. Every change logged with time, admin, reason; full history visible. Full bank details render only in admin detail view. Bank details absent from app logs in test scenarios.

### B-9 · CSV export

From `/admin`:

- **Users**
- **Trainers**
- **Bookings/orders:** gross amount, platform-fee rate/amount, processing fee rate/amount (where available), trainer payable, payment status, refund status, service-completion status, settlement-eligibility status, settlement status
- **Withdrawal requests** (masked account numbers)

Excludes: full card numbers, CVV, any sensitive payment data (none stored). Excludes full bank account numbers.

**DoD:** Each export downloads with listed columns, matches on-screen data for test scenarios. No full bank account numbers in exports.

### B-10 · Live NewebPay cutover (M4, contingent)

Once P-2 (sandbox credentials), P-3 (production credentials), P-4 (spec) received:

- Implement live NewebPay provider per platform-merchant spec.
- Verify in NewebPay test environment.
- **Joint sandbox test session with client** before cutover.
- Cut over to production **by configuration only**.
- Phase 1 order/payout records survive unchanged.

**DoD:** Joint sandbox walkthrough completed and confirmed by client. Production switch is config-only. Phase 1 records survive cutover unchanged.

## 5.3 Scope B exclusions (do not build)

| ID | Excluded |
| --- | --- |
| B-X1 | Purchasable points, point packages |
| B-X2 | Stored-value wallet, top-ups, cash balance. Trainer earnings = ledger of amounts owed, not spendable. |
| B-X3 | Subscriptions, recurring billing, 定期定額, entitlements |
| B-X4 | Automated payouts, split payments, escrow, API bank transfers |
| B-X5 | Notifications (email, push, LINE) for payments or payouts |
| B-X6 | e-Invoice (電子發票), tax withholding, tax calculations |
| B-X7 | Refund / chargeback automation |
| B-X8 | Apple IAP, Google Play Billing |
| B-X9 | Multi-currency. TWD only. |
| B-X10 | Mobile checkout or mobile payout views |
| B-X11 | Company registration, business number, NewebPay merchant application (client's job) |
| B-X12 | Dispute resolution tooling. Dispute/admin-hold = manual admin flag + reason note only. |

# 6. Platform-Wide Requirements

## 6.1 Beta environment (M3)

- Multi-user, suitable for closed market validation.
- ≥100 general test-user accounts + ≥30 partner accounts creatable. Account capacity, not concurrency guarantee.
- Client gets highest-level admin account: manage test accounts, view core data.
- Real Beta users and partners may be onboarded.
- Client may demo to investors/partners.

## 6.2 Consent & legal pages (A10)

- Pages: Terms of Service, Privacy Policy, exercise/service risk disclosure, partner cooperation & conduct rules.
- Consent checkboxes, version dates, consent records stored.
- **Client supplies all legal wording.** Dev implements pages, checkboxes, versioning, records only.

## 6.3 Security & data

- No secrets, env vars, or passwords in source code.
- No full card numbers, CVV, or sensitive payment data stored.
- Bank details: masked everywhere except B-8 detail; never logged.
- All role-based access enforced server-side.
- No direct client-side table queries.
- No malware, backdoors, undisclosed remote-control mechanisms.

## 6.4 Infrastructure & cost control

- Vercel, Supabase, AI API (none at runtime for Scope A), NewebPay, email/SMS.
- **Use free tiers during closed Beta where practical.**
- **Any paid plan, upgrade, or recurring charge requires client's prior written approval.**
- Notify client before any free-tier limit or budget threshold is expected to be hit.
- Production accounts owned or admin-controlled by client/PacerGo where practicable.

## 6.5 Backups & versioning

- Basic data backup mechanism in place.
- Repo backup **at least weekly**.
- Git tag at each major milestone (M1, M2, M3, M4). Preserve full history, all branches, all tags.

## 6.6 Excluded platform-wide

Enterprise load testing, 24/7 maintenance, uptime guarantees, SLAs, complex BI/management reports, major rewrites, unlisted new features.

# 7. Client Prerequisites (Dependencies)

Track receipt dates. Delays here extend timeline, not attributable to dev.

| ID | Item | Blocks | Needed by | Received |
| --- | --- | --- | --- | --- |
| P-1 | Company registration + 統一編號 | P-2 → M4 | ASAP | ☐ |
| P-2 | Corporate NewebPay platform-merchant approval + sandbox credentials | B-10 / M4 | Before M4 start | ☐ |
| P-3 | NewebPay production credentials | B-10 / M4 cutover | Before cutover | ☐ |
| P-4 | NewebPay platform-merchant requirements + technical spec docs | 5.1 spec review, B-10 | Next joint meeting | ☐ |
| P-5 | Service price data confirmation (v1 fields usable, or price list per trainer service) | B-1 | Start of Scope B (~Oct 8) | ☐ |
| P-6 | Bank account field format for manual transfers | B-6, B-7 | Start of Scope B (~Oct 8) | ☐ |
| P-7 | Review/approval of exercise DB copy (zh-TW names, instructions, tips) | A-5, A-7 | During Scope A; 5 business days after draft | ☐ |
| P-8 | Settlement rule confirmed (Service Completed → 24h hold → Eligible) | B-6 | Confirmed | ☑ |
| Legal text | Terms, privacy, risk notice, partner rules | A10 | Before M3 | ☐ |

Phase 1 of Scope B (B-1 to B-9) is **not blocked** by P-1 to P-4. Only B-10/M4 depends on them.

If P-2/P-3/P-4 not received within 12 months of kickoff (by 2027-09-10), M4 becomes a separate change request.

# 8. Engineering Process

## 8.1 Repository

- Web App source in GitLab repo controlled by Jeriel until Full Closing.
- Weekly backups. Full Git history, branches, tags preserved.
- Milestone tags: `m1-staging`, `m2-staging`, `m3-production`, `m4-live`.
- At handover: mirror complete repo (history, branches, tags, build/deploy config) to client-designated GitHub Organization.

## 8.2 Environments

- **Staging:** M1, M2 delivery. Client testing.
- **Production:** M3 onward. Free Beta. Simulated payments until M4.

## 8.3 Cadence

- **Weekly progress / version update** to client. Every week, no exceptions.
- Milestone ready notice → client 10-business-day test window.
- Written technical questions answered within 5 business days.

## 8.4 Testing minimums

- Automated determinism test for A-2 (same inputs → byte-identical plan).
- Network-log verification: zero AI/LLM calls during plan generation.
- Idempotency test for B-3 notify replay.
- Access-control tests: user/trainer/admin isolation server-side.
- Log scan: no bank details in app logs.
- i18n + theme QA: both languages, both themes, no layout breakage.
- Full A-1 combination matrix generates complete plans (no missing data).

# 9. Acceptance & Defect Procedure

- **Per requirement:** meets DoD → client marks Accepted (date + initials). DoD is the **sole test**.
- **Per milestone:** client has **10 business days** to test and accept or report defects in writing (email suffices).
- **Defect = failure to meet a DoD. Nothing else.**
- **Deemed acceptance:** no written defect report within 10 business days → accepted.
- **Beta/pilot use ≠ acceptance.** Client must still report defects in writing within window.
- **Defect loop:** fix → resubmit affected requirements → 10-day window restarts for those only.
- Milestone accepted when all its requirements accepted (or deemed).
- **Overall MVP Acceptance = M3 accepted.** M4 is separate and not a precondition.
- Requests beyond a Specification (incl. approximating more Kilo features) = **change request, never defect**.

# 10. Warranty / Bug-Fix Windows

| Trigger | Duration | Covers |
| --- | --- | --- |
| M3 acceptance | 30 days | M1 to M3 delivered scope |
| M4 acceptance | 30 days | B-10 live NewebPay integration |

**Covered:** reproducible software defects causing deviation from a DoD.

**Not covered:** new requirements, third-party outages/changes (NewebPay, Supabase, hosting), misuse, client-side config, modifications by anyone other than dev.

M4 delay does not extend M3 warranty.

# 11. Change Requests

- Either party proposes in writing (email ok).
- Dev responds with schedule impact.
- Binds only when both confirm in writing.
- Accepted changes appended as numbered items (A-9, B-11, ...) with own Accepted lines.
- Business-rule changes (e.g. fee model) do not alter already-accepted requirements; resulting tech work = change request.

# 12. Handover Deliverables (Full Closing Checklist)

Prepare progressively. All items required at handover.

- [ ]  All website + Web App repos, branches, version tags, build instructions
- [ ]  Complete repo mirrored to client GitHub Org (full history, branches, tags, build/deploy config)
- [ ]  Frontend, backend, APIs, DB schema, migrations
- [ ]  Domain, DNS, SSL, cloud hosting, DB owner/admin access transferred
- [ ]  Auth, payment dashboard, webhooks, AI API, email/SMS/notification service accounts transferred
- [ ]  All env vars, secrets inventory, secure transfer method
- [ ]  Deployment, rollback, backup, restore procedures documented
- [ ]  Test accounts, admin accounts, role/permission matrix
- [ ]  Known bugs, technical limitations, unfinished items, follow-up recommendations
- [ ]  Third-party packages, open-source components, commercial services, licenses, recurring fees list
- [ ]  Architecture diagram, DB relationship diagram
- [ ]  At least one recorded technical handover meeting
- [ ]  List of all material contributors + IP chain-of-title evidence (contributor assignments if any)

# 13. Advisory Scope (Post-Delivery, Reference Only)

After delivery, ongoing role is **advisory only**:

- Months 1 to 12: one meeting/month, ≤2h. One extra urgent session/quarter. Written questions ≤5 business days.
- Months 13 to 24: one meeting/quarter, ≤1h. Written questions ≤7 business days.
- Covers: architecture review, payment-integration guidance, infra/scaling direction, security direction, handover, fundraising tech due diligence.
- **Does not cover:** writing/reviewing code, debugging, PR review, hotfixes, deployments, engineer management, vendor negotiation, maintenance, on-call. Separate quote required.

# Quick Reference

- **Determinism rule:** identical inputs → identical plan. Always. No exceptions.
- **Payment rule:** confirm booking only on verified server-side notify. Never on browser return.
- **Settlement rule:** session end → Service Completed → 24h hold → Eligible (if paid, not cancelled/refunded/disputed/held).
- **Fee rule:** customer pays listed price. Platform 5%. Trainer 95%. Processing fee absorbed from platform 5%.
- **Data rule:** no card data stored. Bank details masked except admin detail. Nothing in logs.
- **Cost rule:** free tiers. No paid upgrades without written client approval.
- **Provider rule:** abstraction layer. Simulated now. Live later by config only.