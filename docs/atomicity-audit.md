# Atomicity & Data-Integrity Audit

Audit date: 2026-10-05 · Project: Pacergo (Supabase `kezkrcyfnjlugkrcbwmy`) · Scope: every
database function that writes data, plus the web code that calls them in sequence.

Also covers the AI plan security review that preceded it (section 6), so all findings from
that work are in one place.

## 1. Summary

Every write function is a PL/pgSQL function, so each call is **one transaction** — a function
either fully succeeds or fully rolls back. Nothing in the audited code leaves a half-written
state *inside* a single call. The problems found are therefore **races** (two calls at once) and
**logic gaps** (a rule that lets money state go wrong), not partial writes.

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | **High** | `request_withdrawal` can over-withdraw (no lock; open requests not counted) | Fixed in `0001_init.sql` |
| 2 | **High** | Deleting an account cascades into other users' payments / withdrawals | Fixed in `0001_init.sql` |
| 3 | Medium | A late payment success on a cancelled booking is never refunded | Fixed in `0001_init.sql` |
| 4 | Medium | Settlement picks payments without row locks; lock-order inversion with the payment callback | Fixed in `0001_init.sql` |
| 5 | Low | `create_booking` duplicate check is check-then-insert (no unique index) | Fixed in `0001_init.sql` |
| 6 | Low | `mark_service_completed` can double-log if two runs overlap | Fixed in `0001_init.sql` |
| 7 | Low | `save_training_plan` has no cap on plan count or size | Fixed in `0001_init.sql` |

Live data at audit time was clean for all seven: 0 withdrawals, 0 duplicate open bookings,
0 paid payments sitting on a cancelled/declined booking (18 payments, 4 paid, 13 bookings).

## 2. High severity

### Issue 1 — `request_withdrawal` can over-withdraw

**Where:** `request_withdrawal(p_amount)`, `trainer_balance(uuid)`.

**What happens.** The function reads `trainer_balance()` and inserts a request, with no lock.
`trainer_balance()` sums payments that are *eligible and unsettled* — it does **not** subtract
withdrawals that are still `requested` or `processing`. A request only reduces the balance once an
admin marks it `paid` (that is when `apply_withdrawal_settlement` settles payments).

**Impact.** A trainer with a 3,000 balance can request 3,000 five times in a row (no concurrency
needed), or fire several requests at once. Each passes the check. Admins would then be asked to
pay out more than the trainer earned.

**Fix** (`backend/migrations/0001_init.sql`):
- New `trainer_available_balance(uuid)` = `trainer_balance` − sum of the trainer's open
  (`requested`/`processing`) withdrawals, never below 0. Internal only (execute revoked from
  `anon`/`authenticated`).
- `request_withdrawal` locks the trainer's `users` row (`for update`) before checking, so a second
  concurrent call waits, then sees the first request in the sum.
- `my_trainer_balance()` now returns the *available* balance, so the number shown in the app is
  the number that can actually be withdrawn.
- Error names are unchanged (`insufficient_balance`, `bank_details_missing`, …), so the existing
  UI messages keep working.

**Behaviour change to be aware of:** the balance shown to trainers drops by the amount of any
request in progress, and returns if an admin rejects or cancels it.

### Issue 2 — Deleting an account erases other people's money

**Where:** `delete_account()`, `delete_current_user()` (both `delete from auth.users`).

**What happens.** Foreign keys cascade: `auth.users → users → bookings (seeker_id / companion_id)
→ payments → payment_status_events, withdrawal_settlements`, and `users → withdrawal_requests`.
Nothing checked for money in flight.

**Impact.**
- A seeker who deletes their account deletes the payment the trainer was still owed.
- A trainer who deletes their account deletes unpaid earnings and any open withdrawal.
- Refund requests and in-progress payment attempts vanish with no trace.

**Fix** (same migration): new `assert_account_deletable(uuid)`, called by both delete functions,
raises `account_has_open_payments` while the user has any of:
- a withdrawal that is `requested` or `processing`;
- a payment attempt still in progress (`created`, `redirected`, `processing`, `awaiting_payment`);
- a paid order with a refund pending;
- a paid order the trainer has not been settled for yet.

It locks the user's bookings first, so a payment attempt cannot start between the check and the
delete (`create_newebpay_payment_attempt` locks the booking too). The web app maps the error to a
localized message (`profile:toast.accountDeleteBlocked`, en + zh).

**Known trade-off:** a seeker whose past order is paid but not yet settled to the trainer cannot
delete their account until the trainer is settled. That is deliberate (deleting would erase the
trainer's receivable), but it can feel long. The proper long-term fix is below.

**Tombstone:** do not switch to it yet. The deletion block is the right control while money
is in flight. A tombstone (keep the ledger, anonymize the person) is the right later design
so a seeker is not stuck until the trainer is paid out, and so tax records survive. It needs
its own FK and retention design; it is not a substitute for the guard above.

## 3. Medium severity

### Issue 3 — Late payment success on a cancelled booking

**Where:** `apply_newebpay_notification`.

A provider callback with SUCCESS can arrive after the user cancelled (the user paid at the
provider just before cancelling, or the callback was delayed). The function sets the payment to
`paid`, but the booking update keeps `cancelled`/`completed` untouched. `cancel_booking` only
requests refunds for payments that were *already* paid at cancel time. Result: money received, no
service, `refund_status = 'none'` — nobody is told to refund it. The same happens if two attempts
for one booking are both paid (an attempt older than 30 minutes can still succeed).

**Fix** (`0001_init.sql`): `apply_newebpay_notification` locks the booking before the payment.
When the next status is `paid` and the booking is `cancelled`/`declined`, or another payment
for the same booking is already `paid` with `refund_status = 'none'`, the new row is stored as
`paid` + `refund_requested` + `ineligible`, and a `payment_status_events` row is written
(`late_payment_on_closed_booking` or `duplicate_paid_attempt`). The booking is not revived.
`payments_one_paid_per_booking_idx` now allows that second paid row by covering only
`status = 'paid' and refund_status = 'none'`.

### Issue 4 — Missing row locks in settlement; lock-order inversion

**Fix** (`0001_init.sql`):
- `apply_withdrawal_settlement` locks the payments it will settle with `for update of pay`.
- `apply_newebpay_notification` locks the booking first, then the payments, matching
  `cancel_booking`.

## 4. Low severity

- **Issue 5 — `create_booking`:** partial unique index `bookings_one_open_per_pair_idx` on
  `(seeker_id, companion_id)` for `requested`, `pending_payment`, `payment_processing`, and
  `payment_failed`. A unique violation is mapped to the existing
  "you already have an open booking with this companion" error. Live data had no duplicates
  when the index was created.
- **Issue 6 — `mark_service_completed`:** the loop selects `for update of pay skip locked` and
  writes the event only if `service_completed_at` was still null.
- **Issue 7 — `save_training_plan`:** at most 100 plans per user (the user row is locked first)
  and 256 KB for the plan JSON and the snapshot. `update_training_plan` uses the same size cap.

## 5. Verified atomic and idempotent

| Operation | Why it is safe |
|---|---|
| `accept_booking`, `decline_booking` | One conditional `UPDATE … WHERE status = 'requested'`; "not found" → error |
| `cancel_booking`, `complete_booking` | Single transaction; status-guarded update, payments locked `FOR UPDATE` |
| `create_newebpay_payment_attempt`, `create_simulated_payment_attempt` | Lock booking and any in-flight attempt; refuse if already paid |
| `confirm_simulated_payment` | Locks the payment row, owner and state checks |
| `apply_newebpay_notification` (webhook) | Locks the payment; repeats on a `paid` payment are a no-op, so duplicate callbacks are safe |
| `admin_set_payment_status`, `admin_set_withdrawal_status`, `admin_set_payment_hold`, `admin_correct_service_completed` | Row locked `FOR UPDATE`, admin-gated |
| `save_onboarding_answers` | One upsert statement; invalid input is rejected before any write |
| `save_training_plan`, `update_training_plan`, `set_active_training_plan`, `delete_training_plan` | Single transaction; ownership via `auth.uid()` |
| `complete_workout`, `log_exercise_sets`, `submit_review` | Upserts on unique keys — idempotent |

### Application-side sequences (two calls in a row)

| Flow | Risk | Why it is acceptable |
|---|---|---|
| Create payment attempt → mark redirected (`lib/payments/provider.ts`) | Second call fails, attempt stays `created` | It expires after 30 minutes (`expire_stale_payment_attempts`), no money moves |
| Save profile → refresh active plan (`lib/plans.ts`) | Second call fails, plan is stale | Staleness is detected from the input signature / `PLAN_RULES_VERSION` and the user is offered an update |
| Read plan → regenerate → `update_training_plan` | Last write wins | Same user, same plan; no cross-user integrity impact |

## 6. Earlier AI plan security review — status

| Finding | Status |
|---|---|
| No range validation on profile / nutrition data | **Fixed** — `PROFILE_LIMITS` + sanitizers in `@pacergo/shared`, enforced in the DB by `validate_fitness_profile()` in `0001_init.sql` |
| PostGIS `st_estimatedextent()` executable by `anon`; `spatial_ref_sys` without RLS | **Blocked** — still owned by `supabase_admin` in `public`. The migration role cannot revoke execute or move the extension. Moving it would also retarget `users.location`. Needs a Supabase support / dashboard change, not a migration |
| Leaked-password protection disabled | **Blocked** — Auth API `PATCH .../config/auth` with `password_hibp_enabled` returned 403. Supabase documents this as a Pro-plan setting |
| `admin_*` functions gated by `is_platform_admin()` | **Verified** — all 12 |
| Service-role client reachable from the browser | **Fixed** — runtime guard in `lib/supabase/admin.ts` |
| Foreign keys without indexes | **Fixed** — 4 indexes |
| Unused indexes (16), multiple permissive policies on `payments` / `verifications` | Left as is (low value at current data size) |

## 7. Applying the fixes

Migrations live in `backend/migrations/`. Schema and functions — admin members, profile
setup, fitness-profile validation, and the money-safety fixes — are in `0001_init.sql`.
Policies stay in `0002_policies.sql`. The follow-up files that used to carry those changes
are folded in; remote history is repaired so only `0001` and `0002` remain applied. The
database is not reset.

After applying, verify (inside a transaction you roll back):
1. A trainer with an eligible balance of N can request N once; a second request fails with
   `insufficient_balance`.
2. `my_trainer_balance()` drops by the amount of an open request.
3. `delete_current_user()` raises `account_has_open_payments` for a user with a paid, unsettled
   order, and succeeds for a user with none.
