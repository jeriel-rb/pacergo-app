# Progressive Mesocycle Engine — Design Spec

**Date:** 2026-10-08  
**Status:** Implemented (P0 core) — 2026-10-08  
**Workspace:** `packages/shared` (plan generator + live progression), consumed by `apps/web` AI Plan  
**Related research:**
- [`reports/Deterministic workout plan progression.md`](../../../reports/Deterministic%20workout%20plan%20progression.md)
- [`reports/4 week plan rule engine.md`](../../../reports/4%20week%20plan%20rule%20engine.md)
- Notes under [`research_notes/Deterministic workout plan progression/`](../../../research_notes/Deterministic%20workout%20plan%20progression/)
- Notes under [`research_notes/4 week plan rule engine/`](../../../research_notes/4%20week%20plan%20rule%20engine/)

---

## 1. Purpose

Upgrade PacerGo’s **existing deterministic 4-week plan generator** so plans feel high-quality and progressive to the client, without replacing the architecture with classical LP / DUP / block periodization or LLM-invented workouts.

**Client problems this resolves**

| Client complaint | Target behavior |
| --- | --- |
| Weeks look identical / no real progression | Stable exercise skeleton; weeks differ by reps / load guidance / effort / conditional volume |
| Week 1 should feel lighter; later weeks harder (same experience level) | Explicit week storyboard + progression hierarchy (not “+1 set every week”) |
| Beginner vs Basic prescriptions look the same | Distinct experience tables (`no_experience` ≠ `beginner`) |
| Goals don’t feel different enough | Shared engine + goal profiles (Fat Loss ≠ “hypertrophy + short rests”) |
| Session length ignored until “too long” | Duration is a generation constraint |
| Beginner warm-up too aggressive | Easy machine Raise when equipment exists; no new onboarding question |

**Non-goals**

- Do not throw away `generateTrainingPlan` for a new periodization philosophy.
- Do not require live performance data to *compose* a 4-week plan.
- Do not auto-deload every beginner in week 4.
- Do not remix primary exercises every week as the definition of “progression.”

---

## 2. Naming note (brief vs codebase)

Research and the implementation brief use names such as `ProgressiveMesocycle`, `FULL_RAMP`, `GoalProfile`, `Engine A / Engine B`. **Those names are conceptual.** Implementers map them onto PacerGo’s real modules. Renaming is optional; behavior and tests are mandatory.

| Brief / research concept | Current PacerGo reality | Target role |
| --- | --- | --- |
| ProgressiveMesocycle | `generateTrainingPlan` + week loop in `generate-plan.ts` | Keep: frozen skeleton + progressive dose |
| Plan Composer (Engine A) | `generateTrainingPlan` | Enrich: goal/experience profiles, week scalars, duration trim, warm-up Raise |
| Training Progression (Engine B) | `recommendLoad` in `progression.ts` (+ effort feedback) | Expand: full stall/failure/fatigue rules; stay separate from composer |
| Volume curves `FLAT` / `MILD_RAMP` | `volumeCurveFor` returns one of those two. Week 4 easing is `shouldConsolidateWeek4`, not a third curve | `FLAT` is the default. `MILD_RAMP` is Basic+ on build muscle or functional, except injuries and lack of time |
| Goal profiles | `GoalProfile`: `preferHigherReps`, `conditioningBias` | Those two fields are what generation reads |
| Experience profiles | `EXPERIENCE_SCHEME` | Beginner (`no_experience`) and Basic (`basic`) use different sets and reps |
| Exercise roles `PRIMARY`… | `exerciseRole` is `pattern` \| `isolation` \| `skill` | Formal PRIMARY/ACCESSORY roles were not built |
| Effort target on each exercise | Removed. It was written into the plan and no screen showed it | Do not add it back unless a screen asks the user to stop short of failure |
| Fractional volume accounting | Not built. One exercise is one set | Do not add fractional muscle-set fields unless a product decision asks for volume caps |
| Duration-aware generation | Session length trims the tail of the main list | Keep |
| Deterministic fingerprint | `PLAN_RULES_VERSION` plus `planInputsSignature` | Bump the version when generation output changes |
| Warm-up Raise chain | Machine chain, then one drill matched to the day | Keep |
| Functional fitness | Live goal `functional` | Same mild ramp as build muscle, machine warm-up when available |

---

## 3. Shipped pipeline

```text
OnboardingAnswers + TrainingPreferencesAnswers + GymEquipmentAnswers
+ ExerciseRecord[] (QA-filtered by isAiEligible)
        ↓
recommendSplit / focusSequence          → split / day focuses
        ↓
poolFor / rankedPool                    → equipment + experience + difficulty ceiling
        ↓
pickMain(week, variety, priority)       → exercises (one per movement family)
        ↓
setsForWeek + compoundRepsFor + restSecFor
        ↓
warm-up Raise chain · selectCooldown · optional cardio block
        ↓
trimMainToDuration → compoundsFirst
        ↓
GeneratedPlan { weeks[4], sessionDurationMin, rulesVersion }
```

**Live path (separate)**

```text
Logged sets + EffortFeedback → recommendLoad → next weight suggestion
```

The pre-implementation audit that used to sit here listed eight gaps (identical weeks 1–2, Beginner = Basic tables, no duration trim, warm-up ignoring machines, Functional only on the legacy composer, …). All are closed; the guard rails added since are in [`docs/plan-engine/architecture.md`](../../plan-engine/architecture.md#guard-rails--what-the-generator-refuses-to-do).

---

## 4. Target architecture

### 4.1 One shared composer, two engines

```text
┌─────────────────────────────────────────────────────────┐
│  PLAN COMPOSER  (generation-time, pure, deterministic)  │
│  inputs → goal profile → experience profile → split     │
│  → exercise skeleton → week dose scalars → warm-up      │
│  → duration trim → validate → GeneratedPlan             │
└─────────────────────────────────────────────────────────┘
                          ≠
┌─────────────────────────────────────────────────────────┐
│  TRAINING PROGRESSION  (session-to-session, logged)     │
│  previous performance → next load/reps/hold/reduce      │
│  → stall / fatigue / skip handling                      │
└─────────────────────────────────────────────────────────┘
```

Composer **must not** call live progression. Live progression **must not** rewrite the 4-week skeleton unless the user regenerates the plan.

### 4.2 Frozen skeleton (feature, not bug)

For unchanged equipment and no safety flags:

```text
Week1 primary exercise set
== Week2 == Week3 == Week4
```

Default variety behavior for this upgrade: **consistent skeleton** (treat prior “balanced/dynamic weekly remix” as opt-in novelty, not default progression). Primary / pattern lifts stay fixed; accessories may be removed for duration/fatigue, not randomly remixed each week.

### 4.3 Progression hierarchy (P0)

Composer and live engine both respect:

1. Maintain exercise selection (`fixed`), or step the lead lift up the equipment ladder (`balanced`, `dynamic`)
2. Progress reps within range after a logged workout
3. Progress load when the top of the range is achieved (`recommendLoad`)
4. Increase sets only when `MILD_RAMP` applies
5. Rest follows the user’s timer range. Build muscle rests slightly longer. No goal shortens rest

**Do not** add an effort target, a fatigue dial, or a density flag onto the goal profile. Those were added and removed because nothing read them, and no screen asked the user.

**Default volume mode:** `FLAT` (or `MILD_RAMP` for eligible Basic+ on build muscle or functional). Adding a set every week is not the default.

### 4.4 Four-week storyboard

| Week | Intent | What the generator changes |
| --- | --- | --- |
| 1 | Base | Base sets from the experience table |
| 2 | Same dose | Same sets. Ladder variety may change the lead lift |
| 3 | Highest planned sets | +1 set only on `MILD_RAMP` |
| 4 | Hold, or drop the extra set | Intermediate and advanced on a mild ramp go back to the base set count. Beginner and Basic keep the extra set |

Beginners: no automatic week-4 deload.

---

## 5. Experience profiles (Beginner ≠ Basic)

Onboarding labels (en): **Beginner** = plan answer `no_experience`, **Basic** = plan answer `basic`. The public column stores those picks as `beginner` and `basic`. A stored plan `beginner` is still read as Basic.

| Field | Beginner (`no_experience`) | Basic (`basic`) | Intermediate | Advanced |
| --- | --- | --- | --- | --- |
| Sets / main exercise (base) | 2 | 3 | 3 | 4 |
| Compound rep range (default) | 12–15 | 10–12 | 8–12 | 6–10 |
| Volume curve eligibility | `FLAT` only | `FLAT` or `MILD_RAMP` | `FLAT` / `MILD_RAMP` | `FLAT` / `MILD_RAMP` |
| Exercise pool | Prefer machines / guided / foundational | Allow more free-weight compounds | Full intermediate pool | Advanced pool |
| Week-4 auto consolidate | Off | Off unless fatigue flags | Conditional | Conditional |

Isolation / timed work keep existing `repsForExercise` overrides unless a goal profile says otherwise.

**Acceptance:** generating with only experience flipped Beginner ↔ Basic must change sets and/or compound reps (test-locked).

---

## 6. Goal profiles (shared engine)

### 6.1 Goal ID mapping

| Product goal | Live onboarding id (target) | Notes |
| --- | --- | --- |
| Build Muscle | `build_muscle` | Exists |
| Fat Loss | `lose_weight` | Exists — rewrite profile semantics |
| General Fitness | `stay_healthy` | Exists — must not be “lite hypertrophy” only |
| Functional Fitness | `functional` | Live on onboarding and in the generator. Same id as legacy `TrainingGoal.functional` |

### 6.2 Profile priorities

**Build Muscle**

- Hypertrophy stimulus, stable compounds, moderate–high hypertrophy reps, progressive reps/load, manageable fatigue.  
- Weekly set targets are **starting ranges**, not hard mandates to pad junk volume.

**Fat Loss**

- Preserve muscle and strength; manage recovery under deficit.  
- Layer cardio/conditioning via existing cardio answers — **do not** auto-shorten rests or auto-inflate RT fatigue because goal = fat loss.  
- RT progression stays conservative (FLAT preferred).

**Functional fitness** uses the same mild set ramp as build muscle, and prefers a machine in the warm-up. It does not allocate a session across strength, power, and conditioning qualities.

**Stay healthy** prefers higher reps at Beginner and a machine in the warm-up. Its set count stays flat.

Implementation shape (illustrative — names flexible):

```ts
type GoalProfile = {
  id: OnboardingGoal;
  preferHigherReps: boolean;
  conditioningBias: "optional" | "encouraged";
};
```

`preferHigherReps` widens the rep range for lose weight, and for stay healthy at Beginner. `conditioningBias: "encouraged"` prefers a machine in the warm-up. There is no quality-weight map, fatigue sensitivity, or rest-density flag.

---

## 7. Warm-up (client MVP ask)

No new onboarding question. Reuse equipment + `needsLowImpact` + experience.

**Structure:** Raise → dynamic mobility → (optional) note that first compound uses lighter rehearsal / live warm-up sets when weights are logged.

**Raise preference (first available):**

1. `cycling_stationary`  
2. `elliptical`  
3. `rowing` (keep easy)  
4. `treadmill` as **easy walk** (not hard run)  
5. Else if low-impact: march / step-touch style bodyweight Raise  
6. Else if healthy: short jumping-jack / high-knees only as brief Raise  

Then **one dynamic drill matched to the day**, so a warm-up is exactly two moves (a client rule): arm circles before a push or pull, leg swings before legs, a bodyweight squat before a full-body day, and so on (`WARMUP_DRILLS_BY_FOCUS`). Drills the user cannot do (band drills without bands) are skipped, and a stretch used as the drill is not repeated in the cool-down. (The research suggests a Raise plus 2–4 drills; two is the product decision.)

**Who gets machine-first Raise by default:** Beginner, Basic, General Fitness, Fat Loss, and anyone with `needsLowImpact`. Intermediate/Advanced may keep a shorter Raise but still must not skip warm-up.

Bump `PLAN_RULES_VERSION` when warm-up output changes.

---

## 8. Exercise roles and fractional volume — not in the engine

The October brief described PRIMARY / SECONDARY / ACCESSORY roles and fractional set-counting (`primaryStimulusSets`, and so on). Neither was built. Duration trim drops the tail of the exercise list. A set counts as one set for the exercise, not as a fraction of each muscle. Do not add those fields unless a product decision asks for them.

---

## 10. Session duration constraint

```text
build candidate session
→ estimateDuration(sets, reps, rest, transitions, warm-up allowance)
→ if over budget: drop lowest-priority ACCESSORY/ISOLATION, reconsider conditioning
→ redistribute required volume if caps exist
→ validate
→ emit
```

Duration influences generation; hard-fail only when even a minimal valid session cannot fit.

---

## 11. Frequency warnings — not emitted

The October brief listed HARD / WARNING / PREFERENCE classes for missing muscles and rest between the same muscle. The generator does not emit those classes. It picks a split, avoids repeating a movement family inside one session, and soft-avoids lifts already used that week.

---

## 12. Training Progression (Engine B)

Keep and extend `packages/shared/src/plan/progression.ts`.

Deterministic responses for at least:

| Situation | Expected direction |
| --- | --- |
| Hit the top of the rep range, or effort was too light | Increase load (`recommendLoad`, shown in the set logger) |
| Inside the range | Keep the load |
| Below the minimum reps | Do not increase load |
| Too heavy and short of the range | Decrease load |
| Two misses in a row | `recommendSessionProgression` lowers the weight. The set logger shows that reason |

The generator does not print double-progression instructions on the plan. The set logger does, from the last logged sets.

---

## 13. Validation classes — not emitted

Rules are enforced inside `generateTrainingPlan` (equipment, difficulty ceiling, one movement family, duration trim). The plan JSON does not carry HARD / WARNING / PREFERENCE tags.

---

## 14. Determinism & versioning

Same inputs + same exercise catalog snapshot + same `PLAN_RULES_VERSION` (+ any new engine constant version if introduced) → **byte-identical** `GeneratedPlan` (existing test style).

- Bump `PLAN_RULES_VERSION` for any output-changing rule change.  
- Plan overview already offers refresh for older `rulesVersion` — keep that UX.  
- Document version meaning in project docs (§17).

---

## 15. Acceptance matrix (contract)

| Scenario | Expected behavior |
| --- | --- |
| Build Muscle / 4d | Mild set ramp in weeks 3–4 for Basic; intermediate and advanced drop the extra set in week 4. Ladder variety may change the lead lift |
| Fat Loss / 4d | Flat sets. Rests are not shortened because the goal is fat loss |
| Functional / 4d | Same mild ramp as build muscle, plus a machine warm-up when one is available |
| Stay healthy / 3d | Flat sets. Higher reps at Beginner. Distinct from build muscle |
| Beginner vs Basic | Different base sets and compound reps |
| Week 1–2 | Base sets |
| Week 3 | +1 set only on a mild ramp |
| Week 4 | Intermediate and advanced on a mild ramp return to the base set count |
| Top of rep range (live) | Increase load |
| Below minimum (live) | Hold/reduce |
| Repeated failure (live) | `recommendSessionProgression` lowers the weight after two misses and the set logger shows that reason |
| 30-min limit | Trim low-priority work; stay near budget |
| Missing equipment | Deterministic substitution or drop slot |
| Same inputs | Identical output |
| Rules version bump | New fingerprint/output; refresh path works |
| Beginner + bike available | Easy bike (or next Raise) in warm-up |
| Low-impact user | No jumping Raise |

---

## 16. Status

P0 (progression hierarchy, goal profiles, Functional goal, conditional week-4 consolidation, duration-aware generation, Beginner ≠ Basic tables, warm-up Raise chain) and the invariant tests are shipped. `recommendSessionProgression` runs in the set logger. Still open — tracked in [`docs/plan-engine/debt-and-cleanup.md`](../../plan-engine/debt-and-cleanup.md): formal exercise roles, and week labels on the plan overview. An effort target on each exercise was removed; no screen showed it.

---

## 17. Documentation

The engine handbook lives in [`docs/plan-engine/`](../../plan-engine/README.md) and is the source of truth for shipped behaviour; this spec records the design intent. Keep the §2 name map in sync with the code.

---

## 18. UI / product notes

- Plan overview should make week progression visible (badge or short “Week 2: progress reps/load” note) even when exercise names match.  
- Refresh banner when `rulesVersion` &lt; current.  
- Functional is an onboarding goal in zh and en.

---

## 19. Testing strategy

- Extend `@pacergo/shared` Vitest/Jest suites under `packages/shared/src/__tests__/`.  
- Keep determinism tests.  
- Replace obsolete “weeks 1–2 identical content + +1 set in 3–4” expectations with the new storyboard.  
- Add acceptance-matrix cases from §15.  
- Property/invariant checks from the implementation brief where practical.  
- Run baseline suite before behavior changes; update conflicting tests deliberately with rationale in the PR.

---

## 20. Risks & limitations

| Risk | Mitigation |
| --- | --- |
| Client still equates “different” with “new exercises” | UI progression cues + copy; optional accessory novelty later, not primary remix |
| Functional goal adds onboarding scope | Ship goal id + profiles together; reuse legacy functional copy where possible |
| Duration estimator imprecise | Tolerance band; prefer trim over hard fail |
| Evidence vs heuristics | Tag every table; avoid claiming clinical law |

---

## 21. Success criteria

1. Acceptance matrix §15 passes in automated tests.  
2. Beginner ≠ Basic prescriptions.  
3. Fat Loss does not equal “Build Muscle + short rests.”  
4. Default plans do not escalate sets every week.  
5. Split, training days and warm-up structure stable across 4 weeks; the lead lift climbs the equipment ladder (machine → free weight → barbell) and `fixed` variety keeps week 1.  
6. Warm-up uses easy machine Raise when available for novice/general paths.  
7. `docs/plan-engine/` handbook matches shipped behavior.  
8. `PLAN_RULES_VERSION` bumped; refresh path verified.
