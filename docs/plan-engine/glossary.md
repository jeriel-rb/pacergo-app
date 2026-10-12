# Glossary — plan concepts in plain language

Use this when talking to clients or writing tickets. Code names are in backticks.

## People & levels

Plan answers and `users.experience_level` use the same words. Generation reads the plan answer.

| Pick | Stored value | Base dose |
| --- | --- | --- |
| **Beginner** | `beginner` | 2×12–15 |
| **Basic** | `basic` | 3×10–12 |
| **Intermediate** | `intermediate` | 3×8–12 |
| **Advanced** | `advanced` | 4×6–10 |

`save_profile_setup` and `save_onboarding_answers` copy the plan answer onto the public column. A blank plan answer does not write a public level. Generation fills a missing experience with the Basic scheme.

## Goals (live web onboarding)

| UI idea | Code | Intent |
| --- | --- | --- |
| Lose weight | `lose_weight` | Preserve muscle; manage fatigue; cardio optional if user opted in — **not** “hypertrophy + short rests” |
| Build muscle | `build_muscle` | Hypertrophy stimulus, stable compounds |
| Stay healthy | `stay_healthy` | Mixed strength + cardio + variety |
| Functional fitness | `functional` | Same set ramp as build muscle, with a machine preferred in the warm-up |

### Goal id surfaces

Mobile plan chips and the web onboarding form use different goal ids for the same picks:

| Mobile `TrainingGoal` | Web `OnboardingGoal` |
| --- | --- |
| `muscle_gain` | `build_muscle` |
| `fat_loss` | `lose_weight` |
| `general_fitness` | `stay_healthy` |
| `functional` | `functional` |

Do not mix these in one sentence without saying which surface.

## Mesocycle pieces

| Term | Meaning |
| --- | --- |
| **Mesocycle** | Our 4-week block. The overview opens on the week since `created_at`, counted at Taipei midnight and wrapped onto weeks 1–4. Editing the plan does not move that date. A new plan starts at week 1. A `?week=` link keeps the week you opened a day from |
| **Week-to-week exercises** | Same movement pattern, harder version later in the month (for example machine press → dumbbell press). `fixed` variety keeps week 1’s exact list and sizes the time-budget trim with week-1 sets so later weeks do not drop accessories. If the user prioritised a muscle, the climb stays among that muscle’s prioritised lifts |
| **Dose** | Sets, reps, and rest. Sets are the only number the generator changes by week, and only on a mild ramp |
| **Double progression** | Hit top of rep range → add load next time; otherwise chase reps at the same load. This happens in the set logger from what was logged, not as a number stored on the plan |
| **Variety** | `fixed` = same lifts all four weeks; `balanced` (default) = the lead lift rotates each week (a novice climbs machine → free weight → barbell; intermediate and advanced start on the staple lift), split and day structure stay put; `dynamic` = the same rotation, plus a bigger rotation of accessories when a focus repeats in a week |

## Volume curves (“the ramp”)

How **sets** may change across the 4 weeks. Reps stay on the experience table. Load changes after a logged workout, in the set logger.

| Curve | What it does | Who gets it |
| --- | --- | --- |
| **`FLAT`** | Same base sets all 4 weeks | Default — especially Beginner, fat loss, injuries, lack of time |
| **`MILD_RAMP`** | Weeks 1–2 base; week 3 +1 set on mains; week 4 either keeps +1 (Basic) or consolidates back (intermediate+) | Eligible Basic+ on build muscle / functional |
| **Week-4 consolidation** | Drop the mid-block set add so week 4 matches weeks 1–2 | Intermediate and advanced after a mild ramp. Beginner and Basic keep the extra set. Not a deload |

Related code: `volumeCurveFor`, `weekSetDelta`, `setsForWeek`, `shouldConsolidateWeek4` in `mesocycle-rules.ts`.

## Session structure

| Block | Role |
| --- | --- |
| **Warm-up Raise** | Easy cardio (bike → elliptical → row → incline walk) or short bodyweight Raise |
| **Warm-up mobility** | One drill matched to the day (a warm-up is exactly two moves with the Raise): arm circles before upper-body days, leg swings before leg days, a bodyweight squat on full-body days. Never repeated in the cool-down |
| **Main** | Working lifts for the day’s focus |
| **Cool-down** | Real stretches from `STRETCH_LIBRARY`, matched to trained muscles |
| **Cardio block** | Optional separate block only if user enabled cardio + picked types. Treadmill means an incline walk for novices, low-impact users and BMI < 18.5; none at BMI < 16 |

## Exercise classification

| Term | Meaning |
| --- | --- |
| **Pattern / compound** | Multi-joint main lift for a muscle family |
| **Isolation** | Single-joint accessory |
| **Skill / advanced** | Moves novices never get (e.g. muscle-ups) |
| **Difficulty tier** | 1 foundational, 2 intermediate (the default for an unreviewed exercise), 3 challenging. Drives the difficulty ceiling for novices |
| **Difficulty ceiling** | The hardest tier a person may be given for a muscle; see [Architecture → Guard rails](./architecture.md#guard-rails--what-the-generator-refuses-to-do) |
| **Movement family** | Exercises that train the same pattern (pull-up and chin-up, hip thrust and glute bridge…). A session takes one of each |
| **Accessory** | Single-joint work, core and grip — sequenced after the compound lifts |
| **QA excluded** | In catalog for browsing but **banned** from AI plans until art/instructions are fixed |
| **Modality** | How it’s loaded: machine, cable, free weight, barbell, bodyweight… |
| **Focus** | Day theme: push, pull, legs, upper, lower, full_body |

## Splits & schedule

| Term | Meaning |
| --- | --- |
| **Split** | Recurring sequence of focuses across training days |
| **ai_custom** | “Let PacerGo pick the split” → `recommendSplit` |
| **ppl_full_body** | Retired UI option still supported in code for old answers |
| **Training days** | Which weekdays train (from frequency + optional day picks) |

## Live progression

| Term | Meaning |
| --- | --- |
| **recommendLoad** | Suggest next weight from last sets + effort (wired in web set logger) |
| **recommendSessionProgression** | Same suggestion as `recommendLoad`, except two misses in a row lower the weight. The set logger calls this. |
| **Effort feedback** | `too_light` / `just_right` / `too_heavy` |

## Versioning

| Term | Meaning |
| --- | --- |
| **PLAN_RULES_VERSION** | Integer stamped on every generated plan; bump when rules change output |
| **Plan refresh** | Regenerate under new rules; keep plan id when refreshing the active plan from profile |

## Nutrition and companion ranking

These answers are used. They do not change which exercises a plan contains.

| Answer | Used for |
| --- | --- |
| Gender | Calorie estimate. Mifflin–St Jeor uses `+5` for male and `−161` for female. `other` produces no calorie target. |
| Day-to-day activity (`low` / `moderate` / `high`) | The same calorie estimate, as the multiplier on that base. |
| Main sport (`primaryActivity`) | Companion ranking. The sport scores above city and experience. `other` adds no sport score. |
| Goal, age, height, weight | Calories and protein, and also the plan (goal, and body size for low-impact and walking). |

`calculateNutrition` is the calorie and protein step. Goal ids there match the plan, including `functional`.

`low_motivation` and `lack_of_equipment` do not change the plan or the calories. The equipment list is what limits the exercises. The obstacle the client picked, including low motivation, is shown to the trainer on that client's session. It is not on the trainer's public profile.
