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

Upgrade Pacergo’s **existing deterministic 4-week plan generator** so plans feel high-quality and progressive to the client, without replacing the architecture with classical LP / DUP / block periodization or LLM-invented workouts.

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

Research and the implementation brief use names such as `ProgressiveMesocycle`, `FULL_RAMP`, `GoalProfile`, `Engine A / Engine B`. **Those names are conceptual.** Implementers map them onto Pacergo’s real modules. Renaming is optional; behavior and tests are mandatory.

| Brief / research concept | Current Pacergo reality | Target role |
| --- | --- | --- |
| ProgressiveMesocycle | `generateTrainingPlan` + week loop in `generate-plan.ts` | Keep: frozen skeleton + progressive dose |
| Plan Composer (Engine A) | `generateTrainingPlan` | Enrich: goal/experience profiles, week scalars, duration trim, warm-up Raise |
| Training Progression (Engine B) | `recommendLoad` in `progression.ts` (+ effort feedback) | Expand: full stall/failure/fatigue rules; stay separate from composer |
| Volume curves `FLAT` / `MILD_RAMP` / `FULL_RAMP` | `progressionSets()` (+1 set weeks 3–4 for most users) | Replace default with `FLAT` / `MILD_RAMP` / `CONSOLIDATE`; restrict auto set-ramps |
| Goal profiles | Thin `repsFor(goal)` + obstacle overrides | Parameter tables per goal (shared pipeline) |
| Experience profiles | `SETS_REPS_BY_EXPERIENCE` (Beginner = Basic today) | Split Beginner vs Basic; gate complexity via existing `exercise-fit` |
| Exercise roles `PRIMARY`… | Partial: `exerciseRole` = `pattern` \| `isolation` \| `skill` | Extend roles; drive stability / trim priority |
| RIR schedule | Not on generated exercises (effort only via live feedback enums) | Optional internal/planner fields + copy; live path consumes actual effort |
| Fractional volume accounting | Not in generator (selection is muscle-slot based) | Introduce documented `primaryStimulusSets` / `secondaryStimulusSets` / `countedWorkingSets` if volume caps are enforced |
| Duration-aware generation | `mainExerciseCount(durationMin)` only | Estimate session length → trim accessories → revalidate |
| Deterministic fingerprint | `PLAN_RULES_VERSION` + `planInputsSignature` | Keep; bump rules version; document engine/version surface |
| Warm-up Raise chain | Fixed slugs / low-impact swap | Machine-aware Raise + mobility; keep `needsLowImpact` |
| Functional Fitness qualities | Legacy `plan-composer` has `functional`; live onboarding goals are 3-valued | Add Functional to live path (see §6) |

---

## 3. Current pipeline (audit map)

```text
OnboardingAnswers + TrainingPreferencesAnswers + GymEquipmentAnswers
+ ExerciseRecord[] (QA-filtered)
        ↓
recommendSplit / focusSequence          → split / day focuses
        ↓
poolFor / rankedPool / restrictToLevel → equipment + experience pool
        ↓
pickMain(week, variety)                → exercises (may rotate by variety)
        ↓
SETS_REPS_BY_EXPERIENCE + repsFor
+ progressionSets(week)                → sets/reps (+1 set W3–4)
        ↓
restSecFor / lightWorkRestSec          → rest
        ↓
warmupPool (fixed / low-impact)        → warm-up
selectCooldown                         → cool-down
optional cardio block                  → cardio
        ↓
GeneratedPlan { weeks[4], sessionDurationMin, rulesVersion }
```

**Live path (separate today)**

```text
Logged sets + EffortFeedback → recommendLoad → next weight suggestion
```

**Known gaps vs acceptance**

1. Weeks 1–2 often identical; progression ≈ set bump in weeks 3–4.  
2. `no_experience` and `beginner` share the same sets/reps.  
3. Goals barely change resistance programming (Fat Loss mainly forces high reps).  
4. Variety can change exercises week-to-week (conflicts with frozen-skeleton default).  
5. No session duration estimate/trim loop.  
6. Warm-up ignores available cardio machines.  
7. Live progression covers load steps only — not repeated failure, skipped sessions, or dose reassessment.  
8. Live AI-plan goals are `lose_weight` | `build_muscle` | `stay_healthy`; Functional exists only on the legacy authored composer.

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

1. Maintain exercise selection  
2. Progress reps within range  
3. Progress load when top of range is achieved  
4. Progress effort / RIR where appropriate  
5. Increase sets only when a volume curve + eligibility allow  
6. Density / rest only when the goal profile allows  

**Do not** simultaneously increase sets + reps + load unless an explicit combined rule fires and is tested.

**Default volume mode:** `FLAT` (or at most `MILD_RAMP` for eligible Basic+ hypertrophy users). Auto “more sets every week” (`FULL_RAMP`-style) is **not** default consumer behavior.

### 4.4 Four-week storyboard

| Week | Intent | Typical levers |
| --- | --- | --- |
| 1 | Base exposure | Moderate dose; leave reps in reserve (higher RIR / lighter effort cue) |
| 2 | Progression | Prefer extra reps / load guidance / mild effort tighten — not automatic +sets |
| 3 | Highest planned productive stimulus | Peak *dose within the consumer mesocycle*, not competition peaking |
| 4 | Conditional consolidation | Reduce sets and/or effort **only if** fatigue/dose rules trigger; else continue FLAT/mild hold |

Beginners: no automatic week-4 deload.

---

## 5. Experience profiles (Beginner ≠ Basic)

UI labels (en): **Beginner** = `no_experience`, **Basic** = `beginner`.

| Field | Beginner (`no_experience`) | Basic (`beginner`) | Intermediate | Advanced |
| --- | --- | --- | --- | --- |
| Sets / main exercise (base) | 2 | 3 | 3 | 4 |
| Compound rep range (default) | 12–15 | 10–12 | 8–12 | 6–10 or 8–10 |
| Effort / RIR cue | ~3–4 | ~2–3 | ~1–3 | ~1–2 |
| Volume curve eligibility | `FLAT` only | `FLAT` or `MILD_RAMP` | `FLAT` / `MILD_RAMP` | `FLAT` / `MILD_RAMP` (restricted ramp) |
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
| Functional Fitness | `functional` (**add to live onboarding + generator**) | Align with legacy `TrainingGoal.functional` / A-1 |

Adding `functional` to `OnboardingGoal` is **in scope** for this upgrade so the four profiles are real on the live path. i18n + onboarding UI options required.

### 6.2 Profile priorities

**Build Muscle**

- Hypertrophy stimulus, stable compounds, moderate–high hypertrophy reps, progressive reps/load, manageable fatigue.  
- Weekly set targets are **starting ranges**, not hard mandates to pad junk volume.

**Fat Loss**

- Preserve muscle and strength; manage recovery under deficit.  
- Layer cardio/conditioning via existing cardio answers — **do not** auto-shorten rests or auto-inflate RT fatigue because goal = fat loss.  
- RT progression stays conservative (FLAT preferred).

**Functional Fitness**

- Allocate exposure across internal qualities (metadata on exercises / slots):  
  `strength | hypertrophy | power | aerobic | anaerobic | locomotion | stability | movement_skill`  
- Not merely “more carries / unilateral / functional-looking moves.”  
- Power: low–moderate reps, explosive intent in cues, stop/reduce when quality rules say so; no mandatory %1RM.

**General Fitness**

- Mixed: strength + hypertrophy + cardiorespiratory + movement variety + manageable fatigue.  
- Distinct parameter set from Build Muscle (e.g. more conditioning budget, slightly lower RT peak dose, broader pattern coverage).

Implementation shape (illustrative — names flexible):

```ts
type GoalProfile = {
  id: OnboardingGoal;
  volumeCurveDefault: "FLAT" | "MILD_RAMP";
  compoundRepBias: "hypertrophy" | "strength_hypertrophy" | "mixed";
  allowRestDensityPush: boolean;
  conditioningBias: "optional" | "encouraged" | "required_if_equipment";
  qualityWeights?: Partial<Record<TrainingQuality, number>>; // functional / general
  fatigueSensitivity: "low" | "medium" | "high";
};
```

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

Always finish with simple mobility (existing arm circles / leg swings / bodyweight squat or equivalents).

**Who gets machine-first Raise by default:** Beginner, Basic, General Fitness, Fat Loss, and anyone with `needsLowImpact`. Intermediate/Advanced may keep a shorter Raise but still must not skip warm-up.

Bump `PLAN_RULES_VERSION` when warm-up output changes.

---

## 8. Exercise roles

Extend beyond `pattern | isolation | skill` to roles that drive engine behavior:

| Role | Stability | Duration trim order | Progression |
| --- | --- | --- | --- |
| PRIMARY | Frozen across weeks | Last to remove | Double progression focus |
| SECONDARY | Frozen preferred | Late | Standard |
| ACCESSORY | May swap/drop | First to remove | Lower priority |
| ISOLATION | May drop | Early | Higher-rep bias OK |
| POWER | Frozen if programmed | Careful | Quality/fatigue rules |
| CONDITIONING | Placement rules | Adjust before dropping primaries | Not RT double-progression |

Map existing `exerciseRole()` / isolation sets into this taxonomy; document the mapping in code comments + this spec’s appendix after implementation.

---

## 9. Volume accounting

If/when weekly volume caps or redistribution run:

```ts
primaryStimulusSets   // muscle is prime mover
secondaryStimulusSets // synergist contribution (documented weight, e.g. 0.5)
countedWorkingSets    // what the cap math uses (explicit formula)
```

**Documentation requirement:** each field’s meaning must be stated in code and in `docs/` — never implied as a lab-measured physiological unit.

Tests: chest press → chest + triceps; row → back + biceps; squat → quads + glutes; hinge → posterior chain; isolation → primary only. No double-full counting of one set as 1.0 for every muscle.

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

## 11. Frequency & recovery (softened)

| Rule | Class |
| --- | --- |
| Required major muscle completely absent | HARD |
| Only one weekly exposure | WARNING / preference |
| Two+ exposures where practical | PREFERENCE |
| Same-muscle hard exposures &lt; 24h | WARNING — generally avoid |
| 24–48h | Allowed depending on dose/split |
| ≥ 48h | PREFERENCE |

Do not treat “&lt;2 exposures = invalid” or “&lt;48h = invalid” as universal hard laws.

---

## 12. Training Progression (Engine B)

Keep and extend `packages/shared/src/plan/progression.ts`.

Deterministic responses for at least:

| Situation | Expected direction |
| --- | --- |
| Hit / exceed top of rep range at intended effort | Increase load next exposure |
| Inside range | Maintain load; chase reps |
| Below minimum reps | Do not increase load |
| Repeated below minimum | Reduce load and/or recommend dose reassessment |
| Effort too heavy / failure | Hold or decrease; no volume up |
| Effort too light without missed reps | Increase load (existing) |
| High fatigue / consolidation flag | Do not increase dose |
| Skipped sessions | Conservative resume (hold or slight reduce) — define exact table in impl plan |

Composer may emit **double-progression copy** (zh/en) so users without logs still know the rule.

---

## 13. Validation classes

Every rule is `HARD | WARNING | PREFERENCE` and tagged `evidence-supported | heuristic | implementation-constraint` in documentation.

Hard examples: invalid exercise, impossible equipment, zero coverage for a required major muscle, invalid set/rep numbers, contradictory constraints.  
Warnings: single exposure, 24–48h window, slightly suboptimal distribution.

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
| Build Muscle / 4d | Stable primaries; progressive reps/load/effort; volume not auto-escalating weekly |
| Fat Loss / 4d | Muscle retention; manageable RT fatigue; rests not auto-shortened solely by goal |
| Functional / 4d | Quality allocation across strength/power/conditioning/etc., not cosmetic exercise picks |
| General / 3d | Balanced strength/hypertrophy/cardio — distinct from Build Muscle |
| Beginner vs Basic | Different base sets and/or compound reps |
| Week 1 | Base dose |
| Week 2 | Progression via reps/load/effort preference |
| Week 3 | Highest planned productive stimulus |
| Week 4 | Conditional consolidation only |
| Top of rep range (live) | Increase load |
| Below minimum (live) | Hold/reduce |
| Repeated failure (live) | Reassess dose |
| High fatigue | Do not increase dose |
| 30-min limit | Trim low-priority work; stay near budget |
| Missing equipment | Deterministic substitution or drop slot |
| Same inputs | Identical output |
| Rules version bump | New fingerprint/output; refresh path works |
| Beginner + bike available | Easy bike (or next Raise) in warm-up |
| Low-impact user | No jumping Raise |

---

## 16. Implementation priority

**P0**

1. Progression hierarchy + restrict set-ramp defaults  
2. Keep composer vs live progression separation; expand live stall/failure rules  
3. Goal-profile corrections (incl. Fat Loss)  
4. Functional Fitness quality allocation + add `functional` to live goals  
5. Volume accounting semantics (if caps/redistribution land)  
6. Conditional week-4 consolidation  
7. Duration-aware generation  
8. HARD / WARNING / PREFERENCE validation  
9. Beginner ≠ Basic tables  
10. Warm-up Raise chain  

**P1**

11. Exercise roles expansion  
12. Frequency/recovery soft rules  
13. Fingerprint/version docs  
14. Property/invariant tests  

**P2**

15. General Fitness refinement polish  
16. RIR UX surfacing  
17. Overview UI “week progression” cues so identical names don’t read as “no progress”

---

## 17. Project documentation (required deliverable)

This upgrade must leave the repo with **durable docs**, not only a chat brief.

### 17.1 Specs & plans

| Doc | Location | Purpose |
| --- | --- | --- |
| This design spec | `docs/superpowers/specs/2026-10-08-progressive-mesocycle-engine-design.md` | Acceptance architecture |
| Implementation plan | `docs/superpowers/plans/2026-10-08-progressive-mesocycle-engine.md` | Task-level execution (after this spec is approved) |
| Research reports | `reports/*.md` + `research_notes/**` | Evidence / competitor synthesis (already started) |

### 17.2 Engine handbook (new)

Add `docs/plan-engine/README.md` (and short linked pages as needed) covering:

1. **Pipeline overview** — composer vs live progression diagram  
2. **Input contract** — onboarding fields that affect generation  
3. **Goal profiles** — priorities and what must *not* happen (esp. Fat Loss)  
4. **Experience tables** — Beginner vs Basic vs Intermediate vs Advanced  
5. **Week scalars & volume modes** — FLAT / MILD_RAMP / CONSOLIDATE eligibility  
6. **Progression hierarchy** — composer + live  
7. **Warm-up Raise fallback chain**  
8. **Exercise roles & substitution order**  
9. **Volume accounting definitions**  
10. **Validation severity** — HARD / WARNING / PREFERENCE  
11. **Versioning** — `PLAN_RULES_VERSION`, when to bump, plan refresh UX  
12. **Test matrix** — link to acceptance table + how to run `yarn workspace @pacergo/shared test`  
13. **Current↔conceptual name map** — §2 of this spec, kept in sync  

### 17.3 Code-level documentation

- Module header comments on `generate-plan.ts` and `progression.ts` pointing to the handbook  
- Goal/experience tables colocated with a one-line “evidence | heuristic | constraint” tag  
- No unexplained magic numbers for weekly set bumps  

### 17.4 Out of doc scope

- Marketing copy for the website  
- Medical advice disclaimers beyond existing product tone  

---

## 18. UI / product notes

- Plan overview should make week progression visible (badge or short “Week 2: progress reps/load” note) even when exercise names match.  
- Refresh banner when `rulesVersion` &lt; current.  
- Functional goal needs onboarding option + locales (zh/en).

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
| RIR not user-visible today | Start as internal/planner + effort feedback bridge; don’t fake precision |
| Duration estimator imprecise | Tolerance band; prefer trim over hard fail |
| Evidence vs heuristics | Tag every table; avoid claiming clinical law |

---

## 21. Success criteria

1. Acceptance matrix §15 passes in automated tests.  
2. Beginner ≠ Basic prescriptions.  
3. Fat Loss does not equal “Build Muscle + short rests.”  
4. Default plans do not escalate sets every week.  
5. Primary exercises stable across 4 weeks for normal users.  
6. Warm-up uses easy machine Raise when available for novice/general paths.  
7. `docs/plan-engine/` handbook exists and matches shipped behavior.  
8. `PLAN_RULES_VERSION` bumped; refresh path verified.

---

## 22. Approval

Please review this spec and reply with:

- **Approved** — proceed to implementation plan (`writing-plans`), or  
- **Changes** — list edits (especially Functional goal timing, exact Beginner/Basic numbers, or UI progression cues).

After approval, the next artifact is:

`docs/superpowers/plans/2026-10-08-progressive-mesocycle-engine.md`
