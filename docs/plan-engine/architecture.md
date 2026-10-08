# Architecture — how a plan is made

## End-to-end (web AI Plan)

```mermaid
flowchart TB
  subgraph Onboarding["Onboarding wizard"]
    O1[About you — goal, body, obstacle]
    O2[Training preferences — experience, days, duration, split, variety…]
    O3[Gym and equipment — type, kit, cardio]
  end

  O1 --> Save[save_onboarding_answers RPC]
  O2 --> Save
  O3 --> Save
  Save --> Profile[(user_onboarding + nutrition)]

  Profile --> Gen[generateTrainingPlan]
  Catalog[(exercises catalog + QA filter)] --> Gen
  Rules[mesocycle-rules — experience / goal / week dose] --> Gen

  Gen --> PlanJSON[GeneratedPlan — 4 weeks × 7 days]
  PlanJSON --> DB[(user_training_plans.plan JSON)]
  PlanJSON --> UI[Plan overview → daily workout → exercise detail]

  UI --> Log[Set logger]
  Log --> Rec[recommendLoad]
  Rec --> UI
```

## Composer pipeline (deterministic)

Same inputs + same catalog snapshot + same `PLAN_RULES_VERSION` → **identical** plan.

```mermaid
flowchart TD
  IN[Inputs: answers + prefs + gym + exercises] --> QA[Filter isAiEligible]
  QA --> SPLIT[focusSequence / recommendSplit]
  SPLIT --> POOL[poolFor — equipment + experience + muscles]
  POOL --> PICK[pickMain — frozen unless variety = dynamic]
  PICK --> DOSE[setsForWeek + compoundReps + rirTarget + restSecFor]
  DOSE --> WARM[Warm-up Raise chain + mobility]
  WARM --> COOL[selectCooldown from STRETCH_LIBRARY]
  COOL --> TRIM[trimMainToDuration if over budget]
  TRIM --> OUT[GeneratedPlan weeks 1–4]
```

### What each stage means for the product

| Stage | Product meaning |
| --- | --- |
| QA filter | Only exercises with art + instructions + muscles that passed QA |
| Split | Which days are push / pull / legs / upper / lower / full body |
| Pool | What the user can actually do with their kit and level |
| Pick | Which exercises fill the session — **stable across weeks by default** |
| Dose | Sets, reps, rest, planned RIR for that week |
| Warm-up | Easy machine Raise when cardio types exist; else mobility / short impact |
| Cool-down | Real stretches matched to muscles trained |
| Trim | Drop lowest-priority accessories if the session would overrun duration |

## Week storyboard (mesocycle)

```mermaid
flowchart LR
  W1[Week 1 — base dose<br/>higher RIR] --> W2[Week 2 — progress<br/>reps / load / effort]
  W2 --> W3[Week 3 — highest planned<br/>stimulus]
  W3 --> W4[Week 4 — hold or<br/>conditional consolidate]
```

Progression hierarchy (composer + live):

1. Keep exercises  
2. Add reps in range  
3. Add load when top of range is hit  
4. Tighten effort / RIR  
5. Add sets only if `MILD_RAMP` applies  
6. Change rest density only when the goal profile allows  

**Default is not “more sets every week.”**

## Data shapes

```mermaid
classDiagram
  class GeneratedPlan {
    weeks[4]
    sessionDurationMin
    rulesVersion
  }
  class GeneratedWeek {
    weekIndex
    days[7]
  }
  class GeneratedDay {
    dayIndex
    isRestDay
    session?
  }
  class GeneratedSession {
    focus
    warmup[]
    main[]
    cooldown[]
    cardio?
  }
  class GeneratedExercise {
    slug
    name
    sets
    reps
    restSec
    rirTarget?
  }
  GeneratedPlan --> GeneratedWeek
  GeneratedWeek --> GeneratedDay
  GeneratedDay --> GeneratedSession
  GeneratedSession --> GeneratedExercise
```

## Module map (code)

| Module | Responsibility |
| --- | --- |
| `generate-plan.ts` | Orchestrates the composer |
| `mesocycle-rules.ts` | Experience tables, goal profiles, volume curves, warm-up Raise |
| `exercise-fit.ts` | Rank / restrict exercises by experience and modality |
| `exercise-meta.ts` | Isolation / timed / difficulty / advanced-skill lists |
| `exercise-qa.ts` | Hard exclude list for bad art/instructions |
| `stretch-library.ts` | Cool-down stretch picks |
| `split-recommendation.ts` | Suggested split from answers |
| `progression.ts` | Live load recommendation |
| `plan-inputs.ts` | Signature / refresh when profile changes |
| `plan-composer.ts` + `plan-data.ts` | **Legacy mobile** authored plans |
| `apps/web/src/lib/plans.ts` | Save / refresh / activate plans against Supabase |

## Versioning & refresh

```mermaid
sequenceDiagram
  participant User
  participant Overview as Plan overview
  participant Gen as generateTrainingPlan
  participant DB as user_training_plans

  User->>Overview: Opens saved plan
  Overview->>Overview: Compare plan.rulesVersion vs PLAN_RULES_VERSION
  alt older rules
    Overview->>User: Offer update
    User->>Gen: Confirm refresh
    Gen->>DB: Replace plan JSON same id
  end
```

Logged workouts stay attached to the plan id when the active plan is regenerated from the fitness profile (`refreshActivePlanFromProfile`).
