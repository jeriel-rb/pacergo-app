# Glossary — plan concepts in plain language

Use this when talking to clients or writing tickets. Code names are in backticks.

## People & levels

| Term | Meaning | Code |
| --- | --- | --- |
| **Beginner** | New to training | `no_experience` |
| **Basic** | Some experience (&lt; ~1 year) | `beginner` |
| **Intermediate / Advanced** | As labeled in onboarding | `intermediate` / `advanced` |

Beginner and Basic **must not** share the same sets×reps table anymore.

## Goals (live web onboarding)

| UI idea | Code | Intent |
| --- | --- | --- |
| Lose weight | `lose_weight` | Preserve muscle; manage fatigue; cardio optional if user opted in — **not** “hypertrophy + short rests” |
| Build muscle | `build_muscle` | Hypertrophy stimulus, stable compounds |
| Stay healthy | `stay_healthy` | Mixed strength + cardio + variety |
| Functional fitness | `functional` | Strength / power / conditioning mix (qualities on the profile; selection still evolving) |

### Naming trap (legacy)

Older mobile / A-1 enums use different ids:

| Legacy `TrainingGoal` | Live `OnboardingGoal` |
| --- | --- |
| `muscle_gain` | `build_muscle` |
| `fat_loss` | `lose_weight` |
| `general_fitness` | `stay_healthy` |
| `functional` | `functional` |

Do not mix these in one sentence without saying which surface.

## Mesocycle pieces

| Term | Meaning |
| --- | --- |
| **Mesocycle** | Our 4-week block |
| **Week-to-week exercises** | Same movement pattern, harder version later in the month (for example machine press → dumbbell press). “Fixed variety” is the only setting that keeps week 1’s exact list |
| **Dose** | Sets, reps, rest, effort (RIR) — what changes week to week |
| **RIR** | Reps in reserve — “how many more you could have done.” Stored as `rirTarget` on main lifts; UI surfacing is still thin |
| **Double progression** | Hit top of rep range → add load next time; otherwise chase reps at the same load |
| **Variety** | `fixed` / `balanced` = freeze skeleton; `dynamic` = allow week-to-week remix (opt-in novelty, not default progression) |

## Volume curves (“the ramp”)

How **sets** may change across the 4 weeks. This is **not** the main definition of progression (reps/load/effort come first).

| Curve | What it does | Who gets it |
| --- | --- | --- |
| **`FLAT`** | Same base sets all 4 weeks | Default — especially Beginner, fat loss, injuries, lack of time |
| **`MILD_RAMP`** | Weeks 1–2 base; week 3 +1 set on mains; week 4 either keeps +1 (Basic) or consolidates back (intermediate+) | Eligible Basic+ on build muscle / functional |
| **`CONSOLIDATE`** | Week-4 ease: drop the mid-block set add and/or raise RIR again | Intermediate+ after a mild ramp — **not** an automatic deload for beginners |
| **`FULL_RAMP`** | Old research name for “+sets every week” | **Not used** in live generation — deliberately rejected for consumer defaults |

Related code: `volumeCurveFor`, `weekSetDelta`, `setsForWeek`, `shouldConsolidateWeek4` in `mesocycle-rules.ts`.  
Deprecated shim: `progressionSets()` always returns `0` so old callers don’t double-count.

## Session structure

| Block | Role |
| --- | --- |
| **Warm-up Raise** | Easy cardio (bike → elliptical → row → incline walk) or short bodyweight Raise |
| **Warm-up mobility** | Arm circles, leg swings, bodyweight squat, etc. |
| **Main** | Working lifts for the day’s focus |
| **Cool-down** | Real stretches from `STRETCH_LIBRARY`, matched to trained muscles |
| **Cardio block** | Optional separate block only if user enabled cardio + picked types |

## Exercise classification

| Term | Meaning |
| --- | --- |
| **Pattern / compound** | Multi-joint main lift for a muscle family |
| **Isolation** | Single-joint accessory |
| **Skill / advanced** | Moves novices never get (e.g. muscle-ups) |
| **QA excluded** | In catalog for browsing but **banned** from AI plans until art/instructions are fixed |
| **Modality** | How it’s loaded: machine, cable, free weight, barbell, bodyweight… |
| **Focus** | Day theme: push, pull, legs, upper, lower, full_body |

## Splits & schedule

| Term | Meaning |
| --- | --- |
| **Split** | Recurring sequence of focuses across training days |
| **ai_custom** | “Let Pacergo pick the split” → `recommendSplit` |
| **ppl_full_body** | Retired UI option still supported in code for old answers |
| **Training days** | Which weekdays train (from frequency + optional day picks) |

## Live progression

| Term | Meaning |
| --- | --- |
| **recommendLoad** | Suggest next weight from last sets + effort (wired in web set logger) |
| **recommendSessionProgression** | Extends that with repeated-miss / fatigue → “reassess dose” (tested; **not fully wired in UI yet**) |
| **Effort feedback** | `too_light` / `just_right` / `too_heavy` |

## Versioning

| Term | Meaning |
| --- | --- |
| **PLAN_RULES_VERSION** | Integer stamped on every generated plan; bump when rules change output |
| **Plan refresh** | Regenerate under new rules; keep plan id when refreshing the active plan from profile |

## Nutrition (related, not the workout engine)

Onboarding body + goal also drive `calculateNutrition`. Goals must stay in sync with onboarding goal ids (including `functional`).
