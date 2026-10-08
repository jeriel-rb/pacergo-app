# Encode ProgressiveMesocycle as IF→THEN rules

A deterministic 4-week auto-generated workout plan should follow one hybrid model—**ProgressiveMesocycle**: a frozen weekly skeleton (split, training days, primary exercises, warm-up structure) plus progressive overload expressed only through scheduled set counts, RIR targets, rest/density, and double-progression load instructions—not classical linear peaking, daily undulating periodization, multi-block athletic sequencing, or feedback-gated Renaissance Periodization (RP) mesocycles. Meta-analyses and ACSM’s 2026 position-stand synthesis show that when progressive overload is present, **periodization model choice is not reliably superior** to nonperiodized training for hypertrophy in healthy adults, while undulating designs help strength mainly in **trained** lifters ([ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [Grgic et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28848690/); [Moesgaard et al. 2022](https://pubmed.ncbi.nlm.nih.gov/35044672/)). Given identical inputs, exercise catalog snapshot, and rules, the engine must emit the same plan; generation-time decisions use only onboarding proxies, never LLM judgment or live soreness/RPE branches. Week 4 is **not** always a deload: newer trials find no hypertrophy advantage for forced unload/cessation in short blocks and sometimes favor continuous training for strength, so mild consolidation is **conditional** for higher-dose intermediates—correcting earlier Pacergo notes that leaned toward a −40–50% week-4 cut as if it were evidence law ([Coleman et al. 2024](https://peerj.com/articles/16777/); [Bell et al. Delphi 2023](https://link.springer.com/article/10.1186/s40798-023-00633-0)).

## Progressive overload on a frozen skeleton beats classical periodization for consumer months

**Model comparison (section 1).** Linear periodization (LP: volume↓ / intensity↑ across a long program), weekly undulating periodization (WUP), daily undulating periodization (DUP), Issurin-style block sequencing (accumulation → transmutation → realization), double progression, progressive-overload-plus-recovery hybrids, and RP-style MAV ramps all exist in the literature, but they are not equally encodeable at generation time without 1RM or live feedback. ACSM 2026, synthesizing many reviews, states that complex periodization **did not consistently** change outcomes for average healthy adults when progressive overload was present ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/)). Grgic’s hypertrophy meta found LP versus DUP essentially null (**SMD −0.02**), and Moesgaard’s volume-equated analysis found periodized training better for **1RM** (ES 0.31) but **not hypertrophy** (ES 0.13, p = 0.27), with undulating advantages for strength **absent in untrained** lifters (ES 0.06) ([Grgic 2017](https://pubmed.ncbi.nlm.nih.gov/28848690/); [Moesgaard 2022](https://pubmed.ncbi.nlm.nih.gov/35044672/); [Harries 2015](https://journals.lww.com/nsca-jscr/Fulltext/2015/04000/Systematic_Review_and_Meta_analysis_of_Linear_and.35.aspx)). Zourdos and colleagues explicitly warn that periodization model choice is of **little importance in novices**, who should prioritize technique, adherence, and avoiding overtraining ([JSCR 2016](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx)). Block periodization is built for sport peaking across sequential quality blocks spanning roughly **2–6 / 2–4 / 1–2 weeks**; a single 4-week consumer plan *is* one mesocycle unit, not three athletic blocks ([NSCA hierarchical cycles](https://www.nsca.com/education/articles/kinetic-select/hierarchical-structure-of-periodization-cycles/); [periodization review](https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/)). Mixed-session training has even outperformed block for hypertrophy and bench 1RM in trained men, undercutting “block by default” for gym hypertrophy ([Bartolomei 2023](https://pubmed.ncbi.nlm.nih.gov/36727999/)).

**Encodeability ranking** for a fully prescribed consumer generator therefore places **progressive overload on a frozen template** first (week_index → set_delta, RIR_target, rest_delta), **double progression** second as user-executed load logic (ACSM 2-for-2 / +2–10% when exceeding target reps), a **mild linear volume/effort ramp within one quality** third, and fixed intra-week intensity undulation only as an optional strength accent for intermediates. Full DUP load tables, multi-block sequencing, and RP’s recovery-gated +1–3 sets/week are **low** for generation-time defaults: they need %1RM or live scores the composer does not have ([ACSM 2009 progression](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf); [RP Volume Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)). Resolve the ACSM 2009 vs 2026 tension by taking **2026 for model choice** (consistency over periodization theater) and **2009 for concrete operators** (rep bands, rest bands, 2–10% load bumps) where 2026 is silent on micro-prescriptions.

**Week storyboard vs law.** A gentle baseline → progress → higher productive dose → optional easier week is **coach practice and software UX**, not a physiologic requirement that week 3 be a named “peak.” Progressive overload and rising volume or effort across weeks are evidence-backed; an exact W1=12 / W2=14 / W3=16 / W4=8 calendar is an **engineering table**, not an ACSM mandate ([Schoenfeld 2017 dose-response](https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197); [Israetel SCJ 2020](https://journals.lww.com/nsca-scj/fulltext/2020/10000/mesocycle_progression_in_hypertrophy__volume.2.aspx)). NSCA teaching to manipulate **one major stressor at a time** supports not stacking large set jumps and large RIR drops the same week for novices ([NSCA TSAC module](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf)).

**Week 4 deload contradiction (resolved).** Prior Pacergo progression notes correctly preferred progressive overload and optional intermediate unload, but overstated a mandatory or strongly evidence-backed week-4 **−40–50%** set cut. Coleman et al. 2024 found mid-block **training cessation** in a 9-week high-volume program produced **similar hypertrophy** versus continuous training and **worse lower-body strength** for the deload arm; authors note short/moderate programs in young participants often **do not require deloads** ([PeerJ e16777](https://peerj.com/articles/16777/)). A 2026 Scientific Reports within-subject study found mid/end volume-frequency reductions did not hinder hypertrophy/strength-endurance versus continuous training—useful as “deloads are not harmful,” not as “deloads are superior” ([Nature Sci Rep](https://www.nature.com/articles/s41598-026-40612-5)). Bell’s Delphi and survey work show coaches commonly deload every **~4–8 weeks** for about a week by cutting volume/effort while often keeping frequency—but that is **experiential practice**, not proof of superior adaptations in unsupervised 4-week apps ([Sports Med Open 2023](https://link.springer.com/article/10.1186/s40798-023-00633-0); [survey 2024](https://link.springer.com/article/10.1186/s40798-024-00691-y)). Therefore: **never always-deload week 4**; true beginners with low weekly dose **progress or hold**; intermediate+ with high planned peak weekly sets may get **mild** consolidation (e.g. −20–30% sets **or** +1–2 RIR), not full cessation and not an invented −40–50% “science threshold.” Unsupported claims that must not appear as HARD physiologic rules include “everyone deloads week 4,” “intermediate always −40–50%,” and “week-4 deload improves hypertrophy versus continuous training in 4-week apps.”

**Recommended hybrid name in code/docs:** `ProgressiveMesocycle` = `FrozenSplit + ProgressiveOverload(double_progression_copy, RIR_schedule, optional_set_ramp) + ConditionalMildWeek4HoldOrUnload`. Default path must **never** do week-to-week goal hopping, exercise remix as progression, mandatory W4 deload, %1RM tables without 1RM, or RP autoregulation branches at generation time.

## Variables, goal profiles, and mathematical week scalars

**Inputs and variable schema (section 2).** The generator needs a small hard-input set plus optional soft inputs. Gender, diet mode, and calorie targets shape nutrition copy and low-impact BMI gates, not the resistance-training skeleton itself. Pacergo’s live fingerprint already treats goal, experience, days, duration, gym type, and equipment as plan-shaping ([ACSM ≥2×/week all major groups](https://acsm.org/resistance-training-guidelines-update-2026/); [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)).

| Variable | Definition | Ranges | Role | Depends on | Evidence label |
| --- | --- | --- | --- | --- | --- |
| `goal` | User training intent | `build_muscle`, `fat_loss`, `functional`, `general_fitness` (map `stay_healthy`→general, `lose_weight`→fat_loss) | input | — | product |
| `experience` | Training status | `no_experience`, `beginner`, `intermediate`, `advanced` | input | — | heuristic overlay on ACSM novice/int/adv |
| `daysPerWeek` | RT sessions/week | 2–7 | input | — | NSCA bands |
| `trainingDays` | Weekday indices | subset of 0–6, length = daysPerWeek | input | daysPerWeek | product |
| `durationMin` | Session length | 15–90, step 5 | input | — | product |
| `gymType` / `equipment` | Available tools | enum + id list | input / constraint | — | product |
| `exercisePool` | QA-eligible catalog snapshot | ExerciseRecord[] | input | — | product |
| `lowImpact` | Soften impact/skill | boolean | calculated | injuries, age≥50, BMI≥30 | product heuristic |
| `split` | Weekly template | full_body, upper_lower, ppl, ppl_upper, ppl_upper_lower | calculated | days, experience, goal, equipment, consecutive days, duration | NSCA+Hevy practice |
| `weeklyHardSetsPerMuscle` | Primary dose | ~6–20 consumer | calculated | goal × experience | ACSM/Schoenfeld mixed |
| `setsPerExercise` | Working sets | 1–4 consumer | output | experience, weekly target, exercise count | ACSM 1–3 novice |
| `repsLow` / `repsHigh` | Rep band | 5–20 by goal | output | goal, experience, obstacle | ACSM practice |
| `rirTargetWeek` | Effort without 1RM | 0–4 | calculated | week, experience, goal | RIR practice |
| `restSec` | Between working sets | 30–300 | output | goal, heaviness, timer band | ACSM 2009 practice |
| `mainExerciseCount` | Main-block slots | 3–7 | calculated | duration, experience, obstacle | product ~8–10 min/ex |
| `setDeltaWeek` | Extra sets vs W1 | 0–2 | calculated | week, experience, obstacle | product heuristic |
| `deloadFlag` | Mild W4 unload | bool | calculated | experience≥intermediate ∧ high V | practice/heuristic |
| `varietyMode` | Rotation policy | fixed / balanced / dynamic | input | — | prefer **fixed** for 4-wk |
| `patternWeights` | Pattern preference | 0–1 per pattern | input via goal profile | goal | heuristic |
| `cardioBias` | Extra aerobic work | none / optional / default-on | output | goal, toggle | practice |
| `fatigueBudget` | Concurrent stress soft cap | low/med/high | constraint | cardio, days, deficit | heuristic |
| `loadRecommendation` | Next-session kg | from logs | post-gen output | logged sets + effort | double-progression practice |

**Architecture:** one shared engine + goal parameter profiles (and experience overlays). No separate periodization engines per goal. Soft optional inputs: prioritize/exclude muscles, variety, rest-timer band, cardio toggle/placement, split override (must stay frequency-compatible).

**Mathematical 4-week progression (section 3).** Let `V₀ = baseWeeklyHardSets(goal, experience)` after clamps. Choose a volume curve `C ∈ {FLAT, MILD_RAMP, FULL_RAMP, RAMP_THEN_HOLD}` from experience × goal × fatigue flags. For each week `w ∈ {1,2,3,4}`:

`weekly_sets(w) = clamp(V₀ + Δ_C(w), MV_floor, consumer_cap)`

`rir(w) = RIR_table[experience, goal, w, consolidate?(w)]`

`sets_per_exercise(w, ex) = allocate(weekly_sets(w), exposures, exercise_count)` with optional `+setDelta` only on main pattern lifts when the curve adds sets.

| Curve | Who | Relative weekly sets | Class |
| --- | --- | --- | --- |
| `FLAT` | True beginner; strength; high cardio/deficit | W1–W4 = `V` | soft / reasonably supported |
| `MILD_RAMP` | Beginner+ / hypertrophy | `V, V, V+1, V+1` (mains) | soft / coaching |
| `FULL_RAMP` | Intermediate+ hypertrophy, ≥3 d, no deficit | `V, V+1, V+2, V+2` capped | heuristic / coaching |
| `RAMP_THEN_HOLD` | Intermediate+ wanting mild consolidation | `V, V+1, V+2, V or V+1` | heuristic |

**IF→THEN week operators (deterministic):**

| IF | THEN |
| --- | --- |
| `experience ∈ {no_experience, beginner}` | Use `FLAT` or at most +1 set by W3–4; RIR stays ≥2–3; **no** required deload |
| `experience ≥ intermediate` ∧ goal = build_muscle ∧ days≥3 ∧ ¬high_fatigue | Allow `MILD_RAMP` or `FULL_RAMP`; RIR may tighten to ~1–2 late |
| Raising sets **and** dropping RIR hard same week ∧ novice | Raise **only one** stressor |
| `weekly_sets` would exceed consumer cap (~16–20) | Stop adding sets; progress via reps/load/RIR instead |
| `deloadFlag = true` | W4 mild unload: sets × 0.7–0.8 **or** RIR +1–2; keep exercises/frequency |
| `deloadFlag = false` | W4 = hold peak dose or continue mild progress |
| Load unknown | Emit double-progression text; do **not** invent weekly %1RM ladders |

Double progression (generation emits instruction; user or logger applies): stay in `[repsLow, repsHigh]` at target RIR; when last-set reps ≥ `repsHigh` for **two consecutive** sessions, increase load ~**2–5%** upper / ~**5–10%** lower (ACSM 2–10% / NSCA 2-for-2) ([Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9/); [NASM progressive overload](https://www.nasm.org/resource-center/blog/training/progressive-overload-explained-programming-progress-for-every-client)).

**Goal-specific logic as GLOBAL + GOAL PARAMS + GOAL PROGRESSION (section 4).** Keep the same frozen split and progression machinery; change parameters only.

**GLOBAL_RULES (all goals):** `weeks = 4`; freeze split, weekdays, primary compounds, warm-up structure; default variety **fixed** for compounds across the block; primary dose = `weeklyHardSetsPerMuscle`; redistribute when days/minutes change—never multiply per-session volume × days; multi-joint before single-joint; same-muscle spacing prefer ≥48 h / 1–3 days between hard exposures; consumer cap avoid defaulting >~18–20 hard sets/muscle/week; raise one major stressor at a time for novices ([Schoenfeld frequency 2016/2019](https://pubmed.ncbi.nlm.nih.gov/30558493); [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/)).

**Experience × weekly hard sets defaults (consumer):**

| Experience | Weekly hard sets/muscle | Sets/exercise | Sessions/wk | Label |
| --- | --- | --- | --- | --- |
| no_experience | 6–10 | 1–2 | 2–3 | MV–MEV practice + ACSM novice |
| beginner | 8–12 | 2–3 | 2–4 | toward ACSM ~10 |
| intermediate | 10–16 | 2–4 | 3–5 | ACSM/Schoenfeld + caps |
| advanced | 12–18 (cap ~20) | 3–4 | 4–6 | diminishing returns; avoid 30–40 defaults |

**GOAL_PARAMS (profile deltas):**

| Parameter | Build Muscle | Fat Loss | Functional | General Fitness | Strength accent (internal) |
| --- | --- | --- | --- | --- | --- |
| `primaryObjective` | hypertrophy | hypertrophy + endurance_density | mixed_function | mixed_general | strength |
| Weekly sets | NE 6–10 … Adv 12–18 | same or −10–20% if cardio high | NE 6–8 … Adv 10–14 | NE 6–10 … Adv 10–16 | 6–12 on primaries |
| Compound reps | 8–12 (exp-scaled) | 10–15 | 6–12 (+ timed loco) | 10–15 | 5–8 primaries |
| Rest compounds | 90–180 s | 60–90 s | 60–120 s | 60–120 s | 180–300 s |
| Cardio default | off / toggle | on 15–20 min after | mixed 10–20 min | on 10–20 min easy–mod | off |
| Pattern bias | muscle coverage | same + density | ↑ hinge, carry, loco, unilateral | balanced + core | compounds early |
| Failure proximity | RIR → ~1 late | leave more in tank (~2) | ≥2 on skill/power | ≥2–3 | compounds ~2–4 RIR |

Fat loss does **not** get a separate periodization engine: same skeleton as build muscle, denser rests/higher reps, cardio/NEAT bias, and a tighter fatigue budget under deficit ([circuit RT meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC8145598/); ACSM endurance rest **&lt;90 s**). Functional and general stay on the same engine; functional biases multi-planar/carry/loco and optional power accents (ACSM power **30–70% 1RM**, fast concentrics, low–moderate volume for function) ([ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/)). Strength is an **internal** `primaryObjective` (optional top sets for intermediate+ build_muscle, or future “get stronger” goal)—not a mandatory fifth onboarding goal and not a 4-week peaking cycle for MVP.

**GOAL_PROGRESSION scalars:**

| Week | Build Muscle | Fat Loss | Functional | General |
| --- | --- | --- | --- | --- |
| 1 | base sets, RIR ~3 | base, RIR ~3 | base, technique RIR≥2 | base, RIR ~3 |
| 2 | hold sets, RIR ~2 | hold; denser rest OK | hold patterns | hold |
| 3 | +1 set if allowed | +1 set **or** +cardio min, not both | +load/density | +0–1 set |
| 4 | +1 set **or** mild unload if int+ & high V | hold or mild unload if int+ | hold | hold / adherence |

## Exercise selection, volume, intensity, and conditional recovery

**Exercise-selection rules (section 5).** Guidelines require all major muscle groups **≥2×/week**; engines operationalize that via split templates whose slots cover push, pull, squat/knee-dominant, hinge/hip-dominant, plus a small accessory/core budget—not novel patterns invent per goal ([ACSM 2026 infographic](https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf); [Schoenfeld frequency](https://reference.medscape.com/medline/abstract/27102172); [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work)).

**Days → split (deterministic table):**

| Days/wk | Novice / limited eq / ≤30 min | Intermediate+ hypertrophy |
| --- | --- | --- |
| 1–2 | full_body | full_body |
| 3 | full_body (UL if ≥3 consecutive days) | PPL if non-consecutive & equipment OK; else FB/UL |
| 4 | upper_lower | upper_lower (advanced optional ppl_upper) |
| 5 | upper_lower | ppl_upper_lower |
| 6–7 | upper_lower (recover) | PPL ×2 |

Hard per-split coverage: full body ≥1 push, ≥1 pull, ≥1 knee, ≥1 hinge; upper ≥1 press + ≥1 pull; lower ≥1 knee + ≥1 hip. Goal changes dose and reps, not whether major patterns exist. Keep **core exercises fixed** across all 4 weeks (Hevy “Consistent” / `routine-engine` 4-week hold); systematic variety belongs at **block boundaries (~4–12 weeks)**, not random weekly remixes that hinder overload visibility ([Kassiano/Schoenfeld 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/); [NSCA PTQ 9.1](https://www.nsca.com/contentassets/dbfde28fefcd4d438039109fe8f68172/ptq-9.1.1-building-a-balanced-and-symmetrical-physique-is-regional-hypertrophy-possible.pdf); [routine-engine](https://github.com/sugarshaneaz/routine-engine)).

**Order and ratios:** compounds / pattern roles before isolations (HARD for strength priority; practice for hypertrophy—meta shows order affects **strength** more than hypertrophy) ([Nunes 2020](https://pubmed.ncbi.nlm.nih.gov/32077380/)). There is **no** validated fixed compound:isolation ratio; soft heuristic ~60–80% of main slots compounds once MJ coverage exists. Reject a push day of only flyes/laterals when a press exists in the pool.

**Substitution chain (deterministic, never invent):** (1) same pattern / same primary muscle + role; (2) filter AI-eligible, equipment, skill, exclude, low-impact; (3) rank staple → stability preference → slug lexicographic; (4) climb one stability rung or pair press↔press / pull↔pull; (5) if still empty, **drop slot** rather than invent; squat/hinge must not fake-substitute with unrelated patterns ([routine-engine](https://github.com/sugarshaneaz/routine-engine)). QA excludes and missing instructions/illustration are hard filters.

**Anti-redundancy / balance:** ≤1 exercise from the same redundancy class per session (flat press, incline/vertical press, horizontal pull, vertical pull, knee squat/lunge, hip hinge, elbow flexion/extension, calf)—second slot only as isolation or explicitly different angle. Weekly pull pattern slots ≥ press slots − 1 when alternatives exist. Soft: rear-delt/upper-back when pressing high; avoid stacking two heavy axial hinges same day for novices.

**Volume rules (section 6).** Represent dose as **`weekly_effective_sets[muscle]`**, counting only stimulative working sets (approx. **5–30 reps**, challenging load, prescribed **0–4 RIR**); warm-ups do not count ([Schoenfeld 2017](https://pubmed.ncbi.nlm.nih.gov/27433992/); [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth); [Pelland meta-regression](https://pubmed.ncbi.nlm.nih.gov/41343037)). Pick one counting mode and freeze it: **Mode A fractional** (primary 1.0, synergist 0.5) or **Mode B direct-only** (prime mover)—both defensible; evidence does not mandate which for UX.

| Landmark | Software meaning | Default band | Evidence class |
| --- | --- | --- | --- |
| MV | Retention / deep unload floor | ~4–6 | coaching (RP ~6); low-dose detectability ~4 |
| MEV | Week-1 growth start | beginners ~6–10; experienced ~8–12 | coaching + ACSM ~10 maximizing |
| MAV | Useful progression zone | ~10–16 consumer; up to ~12–20 int+ | ACSM/Baz-Valle/Schoenfeld mid-band; name = coaching |
| Consumer cap | Do-not-exceed unsupervised | ~16–20 | diminishing returns ~18–20; HARD adherence |

**IF** true beginner **THEN** start near MV–low MEV (~6–10). **IF** hypertrophy-oriented and ≥ beginner **THEN** target average ~10–14 across the block. **IF** computed sets > 20 for any muscle **THEN** clamp and redistribute. Do **not** treat third-party muscle-by-muscle RP MRV tables (e.g. “back 25”) as peer-reviewed constants. Unconditional “+sets every week” is **not** required—flat volume with load/reps/RIR progression is valid, especially for beginners ([ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/)).

**Intensity and effort rules (section 7).** Without known 1RM, prescribe **rep range + RIR + double-progression copy**; density (shorter rest) is a secondary lever mainly for fat-loss framing. Training to failure is **not necessary**; ACSM 2026 proposes ~**2–3 RIR** as adequate effort while noting exact RIR targets remain under-specified ([ACSM PDF materials](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf); [Helms RIR-RPE](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/); [Robinson/Pelland 2024](https://link.springer.com/article/10.1007/s40279-024-02069-2)). Progression priority: (1) reps within range, (2) load when top cleared (2-for-2), (3) sets only on scheduled ramp weeks under cap, (4) stop load progression on pain/form flags or consolidation weeks.

**Prescribed RIR schedules (PARAMETER tables, not physiology law):**

| Experience | W1 | W2 | W3 | W4 progress | W4 consolidate |
| --- | --- | --- | --- | --- | --- |
| True beginner | 3–4 | 3 | 2–3 | 2–3 | 3–4 |
| Beginner | 3 | 2–3 | 2 | 1–2 | 3 |
| Intermediate+ | 2–3 | 2 | 1–2 | 1 | 2–3 |

**IF** true beginner **THEN** never prescribe 0 RIR / failure on compounds. **IF** `FLAT` volume **THEN** prefer RIR tightening as the progressive-effort lever. **IF** `FULL_RAMP` **THEN** keep RIR change ≤1 step/week. Strength goal: keep compounds ~**2–4 RIR** all weeks; accessories may follow hypertrophy table.

**Recovery / consolidation (section 8).** Generation-time fatigue proxies are **static only**: experience, days/week, session minutes, goal, injury/age/BMI/low-impact, self-reported high cardio or deficit, prior volume self-report. Session RPE history, soreness scores, sleep/HRV, bar velocity, and RP pump scoring are **LIVE FEEDBACK**—out of scope for the prescribed composer.

Conditional W4 rules (generation-time):

| IF | THEN | Class |
| --- | --- | --- |
| experience ∈ {no_experience, beginner} ∨ weekly sets ≤ ~MEV | W4 = progress or hold; **no** mandatory deload | soft / reasonably supported |
| experience ≥ intermediate ∧ curve ∈ {MILD_RAMP, FULL_RAMP} ∧ avg weekly sets ≥ ~12–14 | Optional mild consolidation: sets × **0.7–0.8** **or** RIR +1–2; keep frequency/exercises | soft / coaching practice |
| goal = strength | Prefer **not** full cessation in W4 of a short block | soft (Coleman strength finding) |
| injuries / high life-stress flags | Bias toward hold/unload | soft safety heuristic |

**Do not invent** as HARD: always-deload-everyone, HRV/readiness % gates at signup, “missed reps ≥2 → auto-deload” without logs, or claims that W4 deload **increases** hypertrophy vs continuous in ≤9-week blocks.

Same-muscle spacing: prefer **≥48 h** between hard same-muscle sessions; **&lt;24 h** identical hard upper-body sessions should be hard-avoided in template design; consecutive calendar days are OK when splits partition muscles (PPL/UL) ([Miranda 2018](https://journals.lww.com/nsca-jscr/fulltext/2018/12000/repetition_performance_and_blood_lactate_responses.6.aspx); [Fitbod algorithm](https://fitbod.me/blog/fitbod-algorithm/); Pacergo consecutive-day → UL/PPL).

## Rule engine pipeline, validation, and evidence classification

**Formal pipeline pseudocode (section 9).** Comprehensive generation-time algorithm (no LLM, no live feedback):

```text
function generateFourWeekPlan(inputs, exerciseDB, rulesVersion):
  assert deterministicFingerprint(inputs, exerciseDB, rulesVersion)

  # 1. Normalize inputs
  goal      ← mapGoal(inputs.goal)           # stay_healthy→general_fitness, etc.
  profile   ← GOAL_PROFILES[goal]
  exp       ← inputs.experience
  lowImpact ← computeLowImpact(inputs.constraints)
  pool      ← filterPool(exerciseDB,
                 eligible=true, equipment=inputs.equipment,
                 skill≤exp, lowImpact, excludeMuscles)

  # 2. Structure (frozen for all weeks)
  split     ← recommendSplit(inputs.daysPerWeek, inputs.trainingDays,
                 exp, goal, equipment, durationMin)
  weekdays  ← inputs.trainingDays
  focuses   ← focusSequence(split, weekdays)   # same every week
  assert noConsecutiveSameFocusHardOverlap(focuses, weekdays)

  # 3. Dose targets
  V0        ← baseWeeklyHardSets(profile, exp)
  V0        ← applyFatigueBudget(V0, cardio, deficit, injuries)
  V0        ← clamp(V0, MV_floor(exp), CONSUMER_CAP)   # ~16–20
  curve     ← chooseVolumeCurve(exp, goal, V0, fatigue)
  deload    ← (exp ≥ intermediate) ∧ (peakSets(curve,V0) ≥ 12–14)
                 ∧ ¬(goal = strength ∧ prefer_continuous)
  # beginners: deload = false always at generation time

  # 4. Session skeleton (week-invariant compound identities)
  variety   ← inputs.varietyMode ?? FIXED
  for each focus in unique(focuses):
    slots[focus] ← fillPatternSlots(focus, pool, profile.patternBias,
                      mainExerciseCount(duration, exp, obstacle),
                      variety=FIXED_compounds)
    slots[focus] ← orderCompoundsBeforeIsolations(slots[focus])
    slots[focus] ← enforceAntiRedundancy(slots[focus])
    if unfilled_required_slot: trySubstitute(...) else dropSlot(...)

  warmupTpl ← buildWarmup(lowImpact, equipment, duration)
  cooldown  ← stretchesOnly(trainedMuscles(slots))

  # 5. Emit four weeks
  plan ← []
  for w in 1..4:
    Vs   ← weeklySets(V0, curve, w, deload)
    rir  ← rirTarget(profile, exp, w, consolidate=(deload ∧ w=4))
    rest ← restSec(profile, heaviness)
    for each day in weekdays:
      session ← copy(slots[focuses[day]])
      for each exercise in session.main:
        exercise.sets ← allocateSets(Vs, exposures, role, setDelta(w, curve))
        exercise.reps ← repRange(profile, exp, role, obstacle)
        exercise.rir  ← rir
        exercise.rest ← rest
        exercise.progCopy ← DOUBLE_PROGRESSION_TEXT(reps, rir)
      session.warmup ← warmupTpl
      session.cooldown ← cooldown
      if profile.cardioDefault.enabled:
        session.cardio ← cardioBlock(profile, w)  # optional min bump W3 fat_loss
      plan.append(week=w, day=day, session)

  # 6. Validate or reject
  issues ← validate(plan, inputs, pool)
  if any HARD in issues: fail(issues) else return {plan, softWarnings=issues}

  # Load kg is NOT assigned here; recommendLoad(...) is a separate live loop
```

**Validation constraints (section 10).** Hard-reject vs soft-warn:

| Check | Severity | Reject / warn when |
| --- | --- | --- |
| Eligibility | HARD | Main/warmup/cooldown slug in QA_EXCLUDED, missing muscles, no instructions/illustration |
| Equipment | HARD | Empty intersection with user equipment (bodyweight OK if empty set) |
| Experience/skill | HARD | Novice plan contains advanced-skill slugs when easier alternatives exist |
| Duplicates | HARD | Same slug twice in one session main block |
| Redundancy class | HARD/soft | Two same-class compounds → hard; two same-class isolations → soft |
| Coverage | HARD | Weekly major-muscle frequency &lt; 2 for non-excluded groups, or required pattern slot empty when pool had fills |
| Push/pull balance | soft→hard | Weekly press ≫ pull by ≥2 slots with pull alternatives → hard |
| Duration feasibility | HARD | Estimated minutes ≫ durationMin + tolerance (~120%) |
| Prescription sanity | HARD | Timed slug with pure rep scheme; sets &lt; 1; novice isolation as 1–3RM |
| Progression identity | soft (hard if product promises fixed) | Compounds change under variety=fixed |
| Local volume | soft | Weekly sets/muscle ≫ ~20 without advanced flag; same-muscle hard &lt;24 h |
| Cooldown purity | HARD | Non-stretch strength moves in cooldown |
| Determinism | HARD | Same fingerprint → different plan (CI property) |
| W4 deload claim | soft hygiene | Plan must not label mild unload as “mandatory evidence-based deload” for beginners |

**Hard vs soft vs parameter vs heuristic (section 11).** Classification for every important rule:

| Rule | Class |
| --- | --- |
| Same inputs + DB + rules ⇒ same plan | HARD |
| QA / instructions / illustration eligibility | HARD |
| Equipment availability | HARD |
| Advanced skill blocked for novices when alternatives exist | HARD |
| Low-impact exclusions (injury/age/BMI policy) | HARD (product policy) |
| Excluded muscles | PARAMETER → HARD filter |
| Days/week → split default table | HARD table; PARAMETER override if frequency-compatible |
| Consecutive full-body avoidance | HARD |
| ≥2×/week major muscle coverage | HARD (soft only if user excluded muscle) |
| `weekly_effective_sets` primary dose; redistribute not multiply | HARD |
| Warm-ups exclude from weekly set counts | HARD |
| Consumer cap ~16–20 sets/muscle/week | HARD clamp (engineering justified by diminishing returns) |
| Never prescribe failure on novice compounds | HARD |
| No %1RM ladders without 1RM | HARD |
| Generation uses only onboarding proxies | HARD |
| Cooldown = stretch library only | HARD |
| Pattern-preserving substitution; squat/hinge non-fake-sub | HARD process |
| Redundant same-class compounds in one session | HARD |
| Compound before isolation (strength priority) | HARD; hypertrophy accessories soft/heuristic |
| Fixed compounds across 4 weeks | HARD default; PARAMETER (`variety`) |
| Prefer ≥48 h same-muscle spacing | SOFT (HARD if consecutive FB same focus) |
| Push/pull weekly balance | SOFT with HARD floor when alternatives exist |
| Volume curve choice (FLAT / MILD / FULL) | SOFT / HEURISTIC |
| Exact W1–W4 set integers | PARAMETER / HEURISTIC |
| RIR staircase values | PARAMETER / coaching |
| Conditional mild W4 unload | SOFT / coaching (not always-on) |
| RP MV/MEV/MAV/MRV labels | PARAMETER named coaching framework |
| Compound:isolation ~2:1 | HEURISTIC |
| Exact push:pull set ratio 1:1 | HEURISTIC |
| Staple lists / popularity tie-breakers | HEURISTIC after hard filters |
| Duration → exercise count | PARAMETER driving HARD count bounds |
| Rest second bands (hypertrophy 90–180) | PARAMETER / ACSM 2009 practice (2026 weaker) |
| Fat-loss density rest −15–30 s | PARAMETER secondary |
| Internal strength accent | PARAMETER / assumption |
| Seeded PRNG among equals | AVOID; prefer total order (slug/staple) |

**Evidence audit (section 12).** Important rules with evidence grade:

| Rule / claim | Evidence | Sources | Notes |
| --- | --- | --- | --- |
| Periodization not consistently superior when overload present (avg adults) | A | [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) | Prefer for model choice |
| LP ≈ DUP for hypertrophy | A | [Grgic 2017](https://pubmed.ncbi.nlm.nih.gov/28848690/) | |
| UP strength edge mainly in trained | A | [Moesgaard 2022](https://pubmed.ncbi.nlm.nih.gov/35044672/) | Novices: ignore DUP priority |
| Novice periodization model little importance | B | [Zourdos 2016](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx) | |
| Progressive overload / 2–10% when exceeding target | A (ACSM 2009 grade B operator) | [ACSM 2009](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf) | Mechanics keep; model choice follow 2026 |
| ≥2×/week per major muscle | A | ACSM 2026; [Schoenfeld frequency](https://reference.medscape.com/medline/abstract/27102172) | HARD coverage |
| Frequency indifferent when volume equated | A | [Schoenfeld 2019](https://pubmed.ncbi.nlm.nih.gov/30558493) | Split = schedule preference |
| ~10 weekly sets/muscle practical hypertrophy target | A | ACSM 2026; [Schoenfeld 2017](https://pubmed.ncbi.nlm.nih.gov/27433992/) | Soft target |
| Diminishing returns ~18–20 weekly sets | A/B | ACSM 2026; [Baz-Valle 2022](https://jhk.termedia.pl/A-Systematic-Review-of-the-Effects-of-Different-Resistance-Training-Volumes-on-Muscle,158681,0,2.html) | Cap justification |
| Failure not required; ~2–3 RIR adequate | A direction; exact RIR under-specified | ACSM 2026 | Tables = parameters |
| RIR usable for load prescription | B | [Helms](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/); [Lovegrove 2022](https://journals.lww.com/nsca-jscr/fulltext/2022/10000/repetitions_in_reserve_is_a_reliable_tool_for.4.aspx) | Novices less accurate |
| Order matters for strength &gt; hypertrophy | B | [Nunes 2020](https://pubmed.ncbi.nlm.nih.gov/32077380/) | |
| Fixed exercises ~4–12 wk for overload visibility | C/E aligned | [Kassiano 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/); [Hevy](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [routine-engine](https://github.com/sugarshaneaz/routine-engine) | Practice-strong |
| 48–72 h before repeating hard same-muscle work | B + practice | [Miranda 2018](https://journals.lww.com/nsca-jscr/fulltext/2018/12000/repetition_performance_and_blood_lactate_responses.6.aspx); Fitbod | Soft spacing |
| Always W4 deload improves hypertrophy in short blocks | **Contradicted / unsupported** | [Coleman 2024](https://peerj.com/articles/16777/) | Do not encode as HARD |
| Pre-planned deload every ~4–8 weeks | C | [Bell Delphi](https://link.springer.com/article/10.1186/s40798-023-00633-0) | Conditional mild OK |
| RP MV≈6, +1–3 sets/week if recovering | C | [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) | Feedback-gated; not generation law |
| Exact W1–W4 set tables | E | Product tables informed by A/C | Never claim clinical standard |
| Frequency→FB/UL/PPL maps | E (practice-strong) | Hevy; NSCA frequency bands | Template, not ACSM “PPL law” |
| Compound:isolation fixed ratio | Weak / heuristic | Not in ACSM/NSCA primary tables | Soft only |
| Push:pull exact 1:1 | Weak / heuristic | Coach practice | Soft floor only |

## Final representation for implementers

**A. Conceptual model.** `ProgressiveMesocycle`: one frozen 4-week mesocycle skeleton; progressive overload via scheduled dose scalars (sets, RIR, rest) and user-executed double progression; goal differences are parameter profiles only; week-4 recovery is conditional mild consolidation, never universal deload; classical DUP/block/%1RM peaking and live RP autoregulation are out of default generation scope.

**B. Variable / schema (TypeScript-shaped).**

```ts
type Goal = "build_muscle" | "fat_loss" | "functional" | "general_fitness";
type Experience = "no_experience" | "beginner" | "intermediate" | "advanced";
type EvidenceLabel = "evidence" | "practice" | "heuristic" | "assumption";
type VolumeCurve = "FLAT" | "MILD_RAMP" | "FULL_RAMP" | "RAMP_THEN_HOLD";

type PlanEngineInputs = {
  goal: Goal;
  experience: Experience;
  daysPerWeek: 2 | 3 | 4 | 5 | 6 | 7;
  trainingDays: number[];      // 0=Mon..6=Sun
  durationMin: number;         // 15–90
  gymType: "large_gym" | "small_gym" | "garage_gym" | "bodyweight_only";
  equipment: string[];
  exercisePool: ExerciseRecord[];
  constraints: { obstacle: string | null; age: number | null; heightCm: number | null; weightKg: number | null };
  soft?: {
    prioritizeMuscles?: string[];
    excludeMuscles?: string[];
    variety?: "fixed" | "balanced" | "dynamic";
    restTimerMin?: number; restTimerMax?: number;
    addCardio?: boolean; cardioTypes?: string[]; cardioPlacement?: "before" | "after" | "between";
    splitOverride?: SplitId;
  };
};

type GoalProfile = {
  id: Goal;
  primaryObjective: "hypertrophy" | "strength" | "endurance_density" | "mixed_function" | "mixed_general";
  weeklyHardSetsPerMuscle: Record<Experience, [number, number]>;
  reps: { compounds: [number, number]; isolation: [number, number] };
  rir: { week1: number; week4Progress: number; week4Consolidate: number };
  restSec: { compound: [number, number]; isolation: [number, number] };
  cardioDefault: { enabled: boolean; minutes: [number, number]; placement: "before" | "after" | "between" };
  patternBias: Partial<Record<MovementPattern, number>>;
  progression: { curveDefault: VolumeCurve; setDeltaByWeek: [number, number, number, number]; deloadWeek4Eligible: boolean };
  labels: Record<string, EvidenceLabel>;
};

type WeekDose = {
  weekIndex: 1 | 2 | 3 | 4;
  weeklyHardSetsPerMuscle: number;
  setDeltaVsWeek1: number;
  rirTarget: number;
  restSecCompound: number;
  consolidate: boolean;
};
```

**C. Deterministic core rules (compact IF→THEN).**

1. IF same `(inputs, exercisePool snapshot, rulesVersion)` THEN identical plan.  
2. IF composing THEN freeze `split`, `trainingDays`, primary compounds, warm-up template for weeks 1–4.  
3. IF selecting model THEN `ProgressiveMesocycle` only (not DUP/block/WUP default).  
4. IF setting dose THEN `weekly_effective_sets[muscle] = f(goal, experience)` then allocate across exposures.  
5. IF days or duration change THEN redistribute weekly sets; NEVER multiply session volume × days.  
6. IF `experience ∈ {no_experience, beginner}` THEN `FLAT` (±0–1 set), RIR ≥2–3, `deloadFlag=false`.  
7. IF `experience ≥ intermediate` AND hypertrophy AND recovering proxies OK THEN allow mild/full set ramp under cap.  
8. IF raising volume AND tightening RIR hard same week AND novice THEN change only one stressor.  
9. IF any muscle weekly sets &gt; consumer_cap THEN clamp; progress load/reps/RIR instead.  
10. IF prescribing intensity without 1RM THEN emit `[repsLow–repsHigh] + RIR + double-progression copy`.  
11. IF beginner compounds THEN never prescribe failure (0 RIR).  
12. IF `deloadFlag` THEN week 4 mild unload (sets ×0.7–0.8 OR RIR+1–2); ELSE hold/progress.  
13. IF filling slots THEN pattern coverage → compounds before isolations → anti-redundancy → substitute chain → drop empty.  
14. IF variety default THEN fixed compounds for the 4-week block.  
15. IF goal differs THEN apply `GoalProfile` parameter deltas only; do not change mesocycle model.  
16. IF validating THEN hard-reject eligibility/equipment/duplicates/coverage/duration/cooldown/determinism violations.  
17. IF live logs exist later THEN optional overlay for 2-for-2 loads / reactive deload; do not require logs for v1 prescription.

**D. Pseudocode** — see pipeline in section 9; treat `recommendLoad` / RP-style +sets-from-soreness as post-generation overlays, not part of `generateFourWeekPlan`.

## Conclusion

The machine-implementable answer is not “pick LP, DUP, or block,” but a single **ProgressiveMesocycle** rule system: freeze the skeleton, dose with weekly hard sets and RIR, progress with small scheduled scalars plus double-progression instructions, and specialize goals only through parameter profiles. The largest correction versus earlier Pacergo progression work is epistemic hygiene on week 4—**conditional mild consolidation**, not a universal unload dressed up as physiology—while keeping the correct core insight that consistency and progressive overload beat periodization theater for unsupervised 4-week consumer plans. Exact integer tables remain labeled engineering parameters informed by ACSM/Schoenfeld/NSCA evidence; shipping them as named constants with evidence tags is how the product stays deterministic without pretending product convenience is clinical law.
