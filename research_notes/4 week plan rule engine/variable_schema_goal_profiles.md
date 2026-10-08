# Variable schema and goal-specific parameter profiles for a deterministic 4-week plan engine

Evidence labels used on numeric defaults below: **evidence** (position stand / meta-analysis), **practice** (widely used coaching / ACSM 2009 tables still in textbooks), **heuristic** (product or coach convention without a trial mandate), **assumption** (engineering choice for TypeScript determinism).

Architecture constraint for all inferences: **one shared engine** + **goal parameter profiles** (and experience overlays). No separate periodization engines per goal.

---

## What inputs does the generator need?

### Takeaway
A deterministic 4-week composer needs a small **hard-input** set (goal, experience, days/week + weekdays, session duration, equipment/gym type, exercise catalog, injury/low-impact constraints) plus optional **soft inputs** (muscle prioritize/exclude, variety, rest-timer band, cardio toggle). Gender/weight/nutrition affect diet copy and low-impact BMI gates, not the RT skeleton itself.

### Cited Findings
- ACSM 2026: healthy adults should train **all major muscle groups ≥2×/week**; the best program is one that is **sustainable**; consistency matters more than complex periodization. — [ACSM 2026 guidelines announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)
- NSCA frequency teaching: frequency depends on **training status**, recovery between same-muscle sessions (**1–3 days**, never >3 for novices), and total workload including cardio/job stress. — [NSCA Determination of Resistance Training Frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)
- PacerGo live generator fingerprint (`planInputsSignature`) already treats as plan-shaping: **goal, obstacle, age, height, weight (BMI), experience, daysPerWeek, trainingDays, durationMin, gymType, equipment**. Gender/activity/nutrition are intentionally excluded from the fingerprint. — codebase: `packages/shared/src/plan/plan-inputs.ts`
- PacerGo onboarding goals (live generator): `lose_weight | build_muscle | stay_healthy`. Older authored composer goals: `muscle_gain | fat_loss | functional | general_fitness`. — `packages/shared/src/onboarding/onboarding-types.ts`; `packages/shared/src/enums/training.ts`
- PacerGo soft inputs already collected: exclude/prioritize muscles, workoutSplit, variety (`fixed|balanced|dynamic`), rest timer min/max, addCardio + cardioTypes + placement. — `packages/shared/src/onboarding/onboarding-types.ts`; `generate-plan.ts`

### Inferences
- **Required hard inputs (TypeScript):**
  ```ts
  type PlanEngineInputs = {
    goal: "build_muscle" | "fat_loss" | "functional" | "general_fitness"; // map stay_healthy→general_fitness, lose_weight→fat_loss, muscle_gain→build_muscle
    experience: "no_experience" | "beginner" | "intermediate" | "advanced";
    daysPerWeek: 2 | 3 | 4 | 5 | 6 | 7;
    trainingDays: number[]; // 0=Mon..6=Sun, length = daysPerWeek
    durationMin: number;    // 15–90, step 5
    gymType: "large_gym" | "small_gym" | "garage_gym" | "bodyweight_only";
    equipment: string[];    // catalog equipment ids
    exercisePool: ExerciseRecord[]; // QA-eligible catalog snapshot
    constraints: {
      obstacle: "lack_of_time" | "injuries" | ... | null;
      age: number | null;
      heightCm: number | null;
      weightKg: number | null; // BMI for needsLowImpact
    };
  };
  ```
- **Optional soft inputs:** prioritize/exclude muscles, variety, restTimerMin/Max, addCardio, cardioTypes, cardioPlacement, explicit split override.
- **Not required for RT skeleton:** diet mode, gender, calorie targets (nutrition layer), logged history (load progression after logging is a separate loop — PacerGo already has `recommendLoad`).
- **Exercise pool** is an input, not a constant: equipment + experience + low-impact + muscle focus filters are constraints applied at generation time.

### Gaps
- No ACSM/NSCA checklist names “session duration minutes” as a primary FITT variable with exact cutoffs; minute budgets are product constraints.
- PacerGo’s dual goal enums (onboarding 3-value vs composer 4-value) need an explicit product mapping before a unified schema ships.

---

## Complete variable schema: definition, ranges, role, dependencies

### Takeaway
Model the engine as **global rules** (frozen skeleton, weekly hard sets as primary dose, compounds before isolations) plus **variables** with roles `input | calculated | constraint | output`. Goal profiles only retarget intensity band, rest density, cardio bias, movement-pattern weights, and progression scalars—not separate mesocycle models.

### Cited Findings
- ACSM 2026 strength: heavier loads **≥80% 1RM**, **2–3 sets/exercise**, full ROM, compounds early, **≥2 sessions/week**. Hypertrophy: **≥~10 weekly sets/muscle** (dose-response); diminishing returns beyond ~**2–3 sets/exercise** (strength) and ~**18–20 weekly sets** (hypertrophy). Periodization/failure/equipment type did **not consistently** change outcomes for average adults. — [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [ACSM PPT deck](https://www.acsm.org/wp-content/uploads/2026/03/Pronouncement-ppt-deck_resistance-training-ps.pdf)
- ACSM 2009 (still the detailed programming tables): strength rest **3–5 min**; hypertrophy rest **1–2 min**; muscular endurance rest **<90 s**, reps **>15**, loads **~40–60% 1RM**; novice hypertrophy **70–85% 1RM, 8–12 reps, 1–3 sets**; 2-for-2 load progression **+2–10%**. — [Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9); [PubMed ACSM 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- Schoenfeld et al. 2017 volume meta: graded dose-response; categorical **10+ weekly sets/muscle** showed largest hypertrophy category effect; each extra weekly set ≈ **+0.37%** size gain (ES +0.023). — [Schoenfeld volume meta (J Sports Sci)](https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197)
- Schoenfeld et al. 2019 frequency meta: when volume is **equated**, frequency does **not** meaningfully change hypertrophy; choose frequency by preference/schedule. Earlier 2016 analysis: **≥2×/muscle/week** better than 1× when volume equated across 1–3 d. — [PubMed 2019 frequency](https://pubmed.ncbi.nlm.nih.gov/30558493); [Schoenfeld 2016 frequency PDF](https://instituteofmotion.com/wp-content/uploads/2019/02/schoenfeld-frequency.pdf)
- Helms / Zourdos RIR-based RPE: RPE 10 = 0 RIR, 9 = 1 RIR, 8 = 2 RIR; novices less accurate far from failure—use conservatively. — [Helms et al. RIR-RPE PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)
- Proximity-to-failure: training to failure increases acute neuromuscular fatigue vs **1–3 RIR**; stopping short still supports adaptations. — [PMC proximity-to-failure study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9908800/)
- Circuit/meta fat-loss RT: greater fat-mass reduction with **low–moderate loads** and **short inter-exercise rest (10–30 s)** in resistance circuit meta-analysis. — [PMC circuit RT meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC8145598/)
- PacerGo live variables today: `SETS_REPS_BY_EXPERIENCE`, `progressionSets(+1 wk3–4)`, `restSecFor` (heaviness + goal), `mainExerciseCount` from duration, focus sequences, variety rotation, optional cardio block 15–20 min. — `packages/shared/src/plan/generate-plan.ts`

### Inferences

#### Global rules (all goals share)
| Rule | Value | Label |
| --- | --- | --- |
| Mesocycle length | 4 weeks, all weeks emitted at once | **practice** / PacerGo `WEEKS_PER_PLAN` |
| Freeze across weeks | split, training weekdays, primary compounds, warm-up structure | **evidence** (ACSM consistency) + prior PacerGo research report |
| Primary dose knob | `weeklyHardSetsPerMuscle` | **evidence** (Schoenfeld volume; ACSM ≥10) |
| Redistribute on frequency change | do not multiply per-session volume × days | **practice** / SBS-style |
| Raise one stressor/week | volume **or** intensity **or** frequency | **heuristic** |
| Exercise order | multi-joint → single-joint; higher neural demand first | **practice** (ACSM 2009) |
| Same-muscle spacing | ≥48 h preferred; 1–3 days between exposures | **evidence/practice** (Better Health / NSCA) |
| Consumer volume cap | avoid defaulting >~18–20 hard sets/muscle/week | **evidence** (ACSM diminishing returns) |
| Deload | optional week-4 unload for intermediate+ only; beginners usually no hard deload | **practice** (RP) / **heuristic** for apps |

#### Variable dictionary (implementable)

| Variable | Definition | Allowed values / ranges | Role | Depends on | Default label |
| --- | --- | --- | --- | --- | --- |
| `goal` | User-facing training intent | build_muscle, fat_loss, functional, general_fitness (+ internal strength) | **input** | — | product |
| `experience` | Training status tier | no_experience, beginner, intermediate, advanced | **input** | — | maps ACSM novice/int/adv **heuristic** |
| `daysPerWeek` | RT sessions/week | 2–7 | **input** | — | NSCA bands **evidence** |
| `trainingDays` | Which weekdays | subset of 0–6 | **input** | daysPerWeek | PacerGo defaults **heuristic** |
| `durationMin` | Session length | 15–90 | **input** | — | PacerGo **heuristic** |
| `equipment` / `gymType` | Available tools | enum + id list | **input** / **constraint** | — | product |
| `lowImpact` | Soften impact/skill | boolean | **calculated** | injuries, age≥50, BMI≥30 | PacerGo **heuristic** (cautious) |
| `split` | Weekly template | full_body, upper_lower, ppl, ppl_upper, ppl_upper_lower | **calculated** | days, experience, goal, equipment, consecutive days, duration | NSCA+Hevy-like **heuristic** |
| `muscleExposuresPerWeek` | Times a muscle is trained | 1–6 | **calculated** | split × days | target ≥2 **evidence** |
| `weeklyHardSetsPerMuscle` | Stimulative sets/week | ~6–20 (consumer) | **calculated** | goal × experience | ACSM/Schoenfeld/RP **mixed** |
| `setsPerExercise` | Working sets | 1–4 (consumer) | **output** | experience, weekly target, exercise count | ACSM 1–3 novice **evidence** |
| `repsLow`/`repsHigh` | Target rep band | 5–20 depending goal | **output** | goal, experience, obstacle | ACSM tables **practice** |
| `intensityCue` | Effort without known 1RM | RIR 0–4 or %1RM if known | **output** | goal, week, experience | RIR **practice**; %1RM **evidence** when available |
| `restSec` | Between working sets | 30–300 s | **output** | goal profile, exercise heaviness, user timer band | ACSM 2009 bands **practice**; ACSM 2026 weaker on rest for hypertrophy |
| `exerciseOrder` | Slot sequence | compounds → accessories → core | **constraint** | focus muscles | ACSM **practice** |
| `mainExerciseCount` | Exercises in main block | 3–7 | **calculated** | duration, experience, obstacle, priority | PacerGo ~8–10 min/ex **heuristic** |
| `patternWeights` | Preference among squat/hinge/push/pull/carry/loco | 0–1 weights | **input** via goal profile | goal | **heuristic** |
| `cardioBias` | Extra aerobic work | none / optional / default-on; minutes | **output** | goal, user toggle | fat-loss/general **practice** |
| `weekIndex` | 1–4 | progression scalar key | **input** (loop) | — | product |
| `setDeltaWeek` | Extra sets vs week 1 | 0–2 | **calculated** | week, experience, obstacle | PacerGo +1 wk3–4 **heuristic** |
| `rirTargetWeek` | Planned RIR by week | e.g. 3→2→2→1 | **calculated** | week, experience, goal | **heuristic** (safe without 1RM) |
| `deloadFlag` | Volume cut week | bool, usually week 4 | **calculated** | experience≥intermediate | RP **practice** |
| `fatigueBudget` | Soft cap on concurrent stress | low/med/high | **constraint** | cardio bias, days, deficit goal | NSCA total stress **heuristic** |
| `recoveryDays` | Rest / light days | 7 − training days | **calculated** | trainingDays | product |
| `varietyMode` | Exercise rotation policy | fixed / balanced / dynamic | **input** | — | PacerGo; research prefers **fixed** for 4-wk **heuristic** |
| `loadRecommendation` | Next-session kg | from logs | **output** (post-gen) | previous sets + effort | PacerGo double-progression **practice** |

#### Suggested TypeScript profile shape
```ts
type EvidenceLabel = "evidence" | "practice" | "heuristic" | "assumption";

type GoalProfile = {
  id: "build_muscle" | "fat_loss" | "functional" | "general_fitness";
  /** Internal RT objective driving intensity band — not always user-facing. */
  primaryObjective: "hypertrophy" | "strength" | "endurance_density" | "mixed_function" | "mixed_general";
  weeklyHardSetsPerMuscle: { no_experience: [number, number]; beginner: [number, number]; intermediate: [number, number]; advanced: [number, number] };
  reps: { compounds: [number, number]; isolation: [number, number] };
  rir: { week1: number; week4: number }; // stop short of failure
  restSec: { compound: [number, number]; isolation: [number, number] };
  cardioDefault: { enabled: boolean; minutes: [number, number]; placement: "before" | "after" | "between" };
  patternBias: Partial<Record<"squat"|"hinge"|"horizontal_push"|"horizontal_pull"|"vertical_push"|"vertical_pull"|"carry"|"loco"|"core", number>>;
  progression: { setDeltaByWeek: [number, number, number, number]; deloadWeek4: boolean };
  labels: Record<string, EvidenceLabel>;
};
```

### Gaps
- ACSM 2026 found rest interval did **not consistently** affect hypertrophy—older 1–2 min hypertrophy rest remains useful practice, not a hard 2026 mandate.
- No peer-reviewed “fatigue budget” unit for consumer apps; treat as engineering constraint.
- Exact mapping of PacerGo slug catalog → movement patterns is incomplete in shared code (muscle tokens exist; pattern ontology is partly implicit).

---

## What ACSM / NSCA / meta-analysis numbers exist for frequency, sets/muscle/week, and reps by goal and experience?

### Takeaway
Convergent numbers: train muscles **≥2×/week**; hypertrophy practical target **~10 weekly sets/muscle** (useful gains from lower; diminishing returns ~18–20); strength favors **≥80% 1RM, 2–3 sets**, compounds first; novices **2–3 d full-body**, intermediates **3–4 d** (often UL), advanced **4–6 d** splits. Reps for consumer hypertrophy/general sit mostly in **8–12** (novice) with endurance/fat-loss density shifting **12–15+**.

### Cited Findings
- **Frequency (muscle groups):** ≥2×/week all major groups (ACSM 2026); Schoenfeld 2016: 2× > 1× for hypertrophy volume-equated; Schoenfeld 2019: frequency indifferent when weekly volume equated. — [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/); [Schoenfeld 2016](https://instituteofmotion.com/wp-content/uploads/2019/02/schoenfeld-frequency.pdf); [PubMed 2019](https://pubmed.ncbi.nlm.nih.gov/30558493)
- **Session frequency by status (NSCA / ACSM 2009):** novice **2–3**; intermediate **3–4** (FB or UL); advanced **4–6** (splits). Trained clients **cannot progress** on only 1–2 d/wk (maintenance). — [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/); [Medscape ACSM](https://www.medscape.com/viewarticle/717047_4)
- **Weekly sets (hypertrophy):** ACSM 2026 ~**10 sets/muscle/week**; Schoenfeld 2017 dose-response with **10+** category largest; ACSM notes plateau ~**18–20** weekly sets. RP coaching landmarks: MV ≈ **6**, MEV near MV for beginners. — [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/); [Schoenfeld volume](https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197); [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- **Sets/exercise:** ACSM 2026 advise **≥2 sets/exercise**; diminishing returns beyond **~2–3** for strength. ACSM 2009 novice **1–3** sets. — [PMC ACSM 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [Medscape](https://www.medscape.com/viewarticle/717047_9)
- **Reps / load by objective (ACSM 2009):** strength novice–int **8–12 @ 60–70%**, advanced cycle **1–6 @ 80–100%**; hypertrophy novice/int **8–12 @ 70–85%**; endurance **>15 @ ~40–60%**. ACSM 2026 strength emphasis **≥80% 1RM**. — [PubMed 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/); [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/)
- **Rest (ACSM 2009):** strength **3–5 min**; hypertrophy **1–2 min**; endurance **<90 s**. — [PubMed 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/)

### Inferences
**Experience × weekly hard sets/muscle (consumer defaults — label mix):**

| Experience | Weekly hard sets/muscle | Sets/exercise | Sessions/wk (RT) | Label |
| --- | --- | --- | --- | --- |
| no_experience | 6–10 | 1–2 | 2–3 | MV–MEV **practice** (RP) + ACSM novice volume |
| beginner (<~1 yr proxy) | 8–12 | 2–3 | 2–4 | toward ACSM ~10 **evidence** |
| intermediate | 10–16 | 2–4 | 3–5 | ACSM/Schoenfeld **evidence** + caps |
| advanced | 12–18 (cap ~20) | 3–4 | 4–6 | diminishing returns **evidence**; avoid 30–40 defaults |

**Rep ranges by goal (compounds; isolations +0–3 reps):** see goal-profile section below.

### Gaps
- ACSM “intermediate ≈ ~6 months consistent RT” ≠ marketing “beginner/<1 yr”; PacerGo’s four tiers are **heuristic** overlays on three ACSM statuses.
- Muscle-specific RP tables vary by site/version; software should use global defaults + caps, not per-muscle dogma.
- Few trials isolate **exactly 4-week** unsupervised app blocks.

---

## How should Fat Loss differ from Build Muscle without a separate periodization model?

### Takeaway
Keep the **same frozen split, weekly hard-set targets (± small), and progressive-overload loop** as Build Muscle; change **density** (slightly higher reps, shorter rest), **cardio/NEAT bias**, and **fatigue budget** (deficit + cardio → stay nearer MEV). Do **not** invent a separate fat-loss periodization engine.

### Cited Findings
- Fat loss is primarily an **energy deficit** problem; RT’s job is to retain muscle while cardio/steps raise expenditure—prior PacerGo progression research already concluded RT structure should match hypertrophy/general fitness. — prior report `reports/Deterministic workout plan progression.md`; [NASM recovery / fat-loss stress note](https://www.nasm.org/resource-center/blog/active-recovery-vs-rest)
- Resistance **circuit** meta: greater fat-mass reduction with **low–moderate intensity** and **10–30 s** rests between exercises; **2–3 sessions/week** common in effective protocols. — [PMC circuit RT meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC8145598/)
- ACSM 2009 muscular endurance / metabolic work: higher reps, **<90 s** rest—useful density template, not a mandatory “fat loss phase.” — [PubMed ACSM 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- PacerGo already differs fat loss vs muscle mainly by **reps 12–15**, **shorter rest** (`fromGoal -0.1`), optional **cardio block**, and authored composer **CIRCUIT** schemes—not a different week-structure engine. — `generate-plan.ts`; `plan-data.ts` `fat_loss` → `CIRCUIT`

### Inferences
**Fat Loss profile deltas vs Build Muscle (same engine):**

| Parameter | Build Muscle | Fat Loss | Label |
| --- | --- | --- | --- |
| `primaryObjective` | hypertrophy | hypertrophy + endurance_density | **assumption** |
| weekly hard sets | experience table | same or **−10–20%** if high cardio | **heuristic** (total stress) |
| compound reps | 8–12 (exp-scaled) | **10–15** | **practice** |
| rest compounds | 90–180 s | **60–90 s** (novices avoid 10–30 s circuits) | circuit meta **evidence** for short rest; consumer safety **heuristic** |
| cardioDefault | off / user toggle | **on** 15–20 min after or separate days | PacerGo **practice** |
| RIR | 2→1 across block | 2–3 (leave more in tank under deficit) | **heuristic** |
| progression | +set mid-block / RIR tighten | same skeleton; prefer load/reps over aggressive set ramps if deficit | **heuristic** |
| split | may prefer PPL when experienced muscle-builder | prefer **full_body** at 3 d (PacerGo already) | PacerGo **heuristic** + adherence |

### Gaps
- No ACSM mandate that “fat loss = circuit only”; traditional hypertrophy + walking can be equally valid.
- Exact rest seconds for non-circuit straight sets in a deficit are under-specified; short-rest circuit data should not force HIIT every session for beginners.

---

## How should Functional Fitness and General Fitness differ from hypertrophy/strength in parameters only?

### Takeaway
Both remain on the **same 4-week frozen-skeleton engine**. Functional biases **multi-planar / carry / loco / power-ish concentric intent** and mixed densities; General Fitness biases **balanced push–pull–legs + default moderate cardio + mobility**, mid-rep, mid-rest. Neither needs Olympic-lift periodization or CrossFit competition peaking inside one consumer month.

### Cited Findings
- ACSM 2026: **power** work (moderate loads **30–70% 1RM**, fast concentrics, low–moderate volume) enhances **physical function**; nontraditional tools (bands, bodyweight, home) effective. — [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/); [ACSM PPT](https://www.acsm.org/wp-content/uploads/2026/03/Pronouncement-ppt-deck_resistance-training-ps.pdf)
- ACSM 2026: for average adults, complex periodization and failure training are often unnecessary; function improves from consistent RT. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)
- PacerGo authored `functional` copy targets Hyrox/CrossFit-style mixed work; `general_fitness` is “cardio + strength + mobility,” nothing maximal. — `plan-data.ts` `GOAL_INTRO` / `GOAL_NOTES`
- Live onboarding collapses functional/general into `stay_healthy` today—parameter profiles must **re-expand** if product restores four goals. — `OnboardingGoal`

### Inferences

| Parameter | Build Muscle | Functional | General Fitness | Label |
| --- | --- | --- | --- | --- |
| primaryObjective | hypertrophy | mixed_function | mixed_general | **assumption** |
| weekly sets/muscle | 8–16 by exp | **6–12** (lower isolation volume) | **6–12** | **heuristic** (adherence) |
| compound reps | 8–12 | **6–12** (+ optional timed loco) | **10–15** | **practice** |
| rest | 90–180 s | **60–120 s** mixed | **60–120 s** | **heuristic** |
| patternBias | hypertrophy muscle coverage | ↑ hinge, carry, loco, unilateral, monostructural | balanced patterns + core | PacerGo intent **heuristic** |
| power accents | rare | 0–2 drills/session if not lowImpact | rare | ACSM power-for-function **evidence** (gated) |
| cardioDefault | optional | mixed intervals **or** steady 10–20 min | default light–mod **10–20 min** | **practice** |
| isolation share | higher | lower | moderate | **heuristic** |
| progression | volume/RIR | skill-stable + density/load | gentle volume + adherence | **heuristic** |
| failure proximity | 1–2 RIR late weeks | ≥2 RIR (technique) | ≥2–3 RIR | **practice** |

### Gaps
- “Functional fitness” has no single ACSM FITT table; Hyrox/CrossFit programming is sport-specific and **not** fully transferable to unsupervised novices.
- PacerGo live generator does not yet specialize `stay_healthy` beyond experience tables—functional vs general is mostly authored-content era.

---

## When is Strength useful as a separate internal training objective vs subsumed?

### Takeaway
Expose **Strength as an internal `primaryObjective`**, not necessarily a fifth user-facing goal. Use it when the user explicitly wants strength, or as a **minority accent** (e.g. first compound in lower RIR / heavier cue) inside Build Muscle for intermediate+. For true beginners and Fat Loss / General Fitness defaults, **subsume strength under hypertrophy-rep progressive overload**—ACSM 2026 still gets large strength gains from consistent RT without maximal peaking.

### Cited Findings
- ACSM 2026 distinguishes prescriptions: strength ← **≥80% 1RM, 2–3 sets**, compounds early, ≥2×/week; hypertrophy ← **volume ≥10 sets/week**. — [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/)
- ACSM 2009: advanced strength uses **1–6 RM**, **3–5 min** rest; novices still grow strength on **8–12**. — [PubMed 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- Starting Strength NLP: fixed template **3×5** for novices—shows strength-first can be simple, but is a different product narrative than hypertrophy apps. — [Starting Strength programs](https://startingstrength.com/article/programs)
- ACSM 2026: complex periodization not consistently superior for average healthy adults. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)
- PacerGo has **no** user-facing Strength goal; muscle_gain schemes are labeled “strength” in copy but use hypertrophy-ish 8–12 style menus. — `plan-data.ts` `STRENGTH` scheme + `TrainingGoal`

### Inferences
- **Use internal Strength when:** (1) future onboarding adds “get stronger,” (2) intermediate+ Build Muscle wants a top-set or primary compound in **5–8 reps / RIR 1–2 / rest ≥150 s**, (3) Functional needs a strength floor under power/carry work.
- **Subsume when:** no_experience/beginner; Fat Loss; General Fitness; no load logging / unknown 1RM (prefer double-progression in 8–12).
- **Do not** run a separate 4-week peaking cycle (intensity↑ volume↓ linear periodization) for MVP—ACSM 2026 + novice evidence argue against it for this audience.

### Gaps
- Without logged 1RMs, “≥80% 1RM” must be approximated via RIR/rep-max charts—accuracy is limited for novices ([Helms RIR accuracy](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)).

---

## Experience tiers and day-count → split mappings: evidence-backed vs heuristic?

### Takeaway
**Evidence-backed:** novices 2–3× full-body nonconsecutive; intermediates 3–4× (FB or upper/lower); advanced 4–6× splits; keep ≥~48 h / 1–3 days between same-muscle stressors; prefer ≥2 exposures/muscle/week. **Heuristic (product):** exact Hevy-like tables (2→FB, 4→UL, 5→PPL+UL), PacerGo’s consecutive-day and limited-equipment overrides, and treating `no_experience` vs `beginner` as distinct set/rep rows.

### Cited Findings
- NSCA: beginner **2–3**/wk full body nonconsecutive; intermediate **3** FB or **4** split; advanced **4–6**, sometimes 3-on/1-off. — [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/); [NSCA TSAC module PDF](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf)
- ACSM 2009: novice 2–3; intermediate 3–4; advanced 4–6 for hypertrophy/strength tracks. — [Medscape](https://www.medscape.com/viewarticle/717047_4)
- Schoenfeld 2019: split choice can follow **preference** if weekly volume held. — [PubMed 2019](https://pubmed.ncbi.nlm.nih.gov/30558493)
- PacerGo `recommendSplit`: ≤2 FB; 3 FB (PPL if trained muscle-builder & not simple); 4 UL (PPL+upper if advanced muscle); 5 PPL+UL; 6–7 PPL twice; novices/limited equipment/≤30 min stay simple; fat loss keeps 3-day FB; 3+ consecutive days avoid repeating FB. — `split-recommendation.ts`
- Prior research notes map Hevy Trainer: 1–3 FB, 4 UL, 5–6 PPL variants. — `research_notes/Deterministic workout plan progression/periodization_rules.md` / consumer report

### Inferences
**Recommended deterministic table (label each cell):**

| Days/wk | no_exp / beginner | intermediate | advanced + build_muscle | Label |
| --- | --- | --- | --- | --- |
| 2 | full_body | full_body | full_body | **evidence** (NSCA novice floor) |
| 3 | full_body | full_body or UL if consecutive days | PPL if non-consecutive & equipment OK else FB | FB **evidence**; PPL **heuristic** |
| 4 | upper_lower | upper_lower | upper_lower or ppl_upper | UL **evidence** (ACSM int.); ppl_upper **heuristic** |
| 5 | upper_lower | ppl_upper_lower | ppl_upper_lower | **heuristic** (volume distribution) |
| 6–7 | upper_lower (recover) | PPL ×2 | PPL ×2 | **heuristic**; watch recovery **evidence** |

**Experience tier proxies (heuristic mapping onto ACSM):**
- `no_experience` ≈ untrained / long layoff (ACSM novice, technique-first)
- `beginner` ≈ <1 year / some gym (still novice–early intermediate)
- `intermediate` ≈ ACSM intermediate (~6+ months consistent)
- `advanced` ≈ multi-year, recovers well (still consumer-capped volume)

### Gaps
- No trial validates PacerGo’s exact consecutive-day → UL/PPL switch; it is sound recovery logic but **heuristic**.
- 6–7 day consumer RT lacks strong adherence evidence for novices; prefer discouraging in UI even if schema allows.

---

## Goal-specific parameter profiles (shared engine)

### Takeaway
Implement four user-facing profiles + optional internal Strength accent. Numbers below are defaults for TypeScript tables; every numeric claim is labeled.

### Cited Findings
- Synthesized from ACSM 2009/2026, Schoenfeld volume/frequency metas, NSCA frequency, circuit fat-loss meta, Helms RIR, and PacerGo current behavior cited in sections above.

### Inferences

#### GLOBAL_RULES (shared)
1. `weeks = 4`; freeze split, days, primary lifts (`variety` default **fixed** for new rule engine — **heuristic** divergence from PacerGo default `balanced`).
2. `weeklyHardSets = f(goalProfile, experience)` then allocate across exposures.
3. Progression: beginners mostly **flat sets + RIR/copy**; basic/intermediate **+1 set weeks 3–4**; optional week-4 **~40–50% set cut** only if `experience ≥ intermediate` (**practice**/RP).
4. Load progression after logging: double-progression / PacerGo `recommendLoad` (**practice**).
5. Low-impact & injuries → higher reps, no plyos, no progression set bump (PacerGo today).

#### Profile: Build Muscle (`primaryObjective: hypertrophy`)
| Field | Default | Label |
| --- | --- | --- |
| weeklyHardSets | NE 6–10, Beg 8–12, Int 10–16, Adv 12–18 | **evidence**/practice |
| reps compounds | NE/Beg 12–15 or 8–12; Int 8–12; Adv 6–12 | ACSM **practice** |
| RIR W1→W4 | 3→2→2→1 | **heuristic** |
| rest compounds | 90–180 s | ACSM hypertrophy **practice** |
| cardioDefault | off | **assumption** |
| progression.setDeltaByWeek | [0,0,1,1] | PacerGo **heuristic** |
| deloadWeek4 | false unless int+ | **practice** |

#### Profile: Fat Loss (`primaryObjective: hypertrophy` + density)
| Field | Default | Label |
| --- | --- | --- |
| weeklyHardSets | same as Build Muscle or −10% if cardio on | **heuristic** |
| reps compounds | 10–15 (force 12–15 if injuries) | PacerGo + endurance **practice** |
| RIR W1→W4 | 3→2→2→2 | **heuristic** (deficit) |
| rest compounds | 60–90 s (isolations 45–75) | circuit meta **evidence** (scaled up for safety) |
| cardioDefault | on, 15–20 min after RT | PacerGo **practice** |
| progression | same as muscle; avoid stacking set+RIR aggressiveness | **heuristic** |
| split bias | FB at 3 d | PacerGo **heuristic** |

#### Profile: Functional Fitness (`primaryObjective: mixed_function`)
| Field | Default | Label |
| --- | --- | --- |
| weeklyHardSets | NE 6–8, Beg 8–10, Int 8–12, Adv 10–14 | **heuristic** (lower isolation) |
| reps | 6–12 strength-skill + timed loco slots | ACSM power/function **evidence** (partial) |
| RIR | ≥2 always on skill/power | **practice** |
| rest | 60–120 s; longer after heavy carries | **heuristic** |
| patternBias | ↑ hinge, carry, loco, unilateral; ↓ pure isolation | PacerGo functional intent **heuristic** |
| cardioDefault | mixed 10–20 min or interval finishing piece | **heuristic** |
| power accents | 0 if lowImpact; else ≤2 low-complexity | ACSM **evidence** gated by **assumption** |
| progression | hold exercises; progress load/density | **evidence** (consistency) |

#### Profile: General Fitness (`primaryObjective: mixed_general`)
| Field | Default | Label |
| --- | --- | --- |
| weeklyHardSets | NE 6–10, Beg 8–12, Int 8–14, Adv 10–16 | toward ACSM ~10 **evidence** |
| reps | 10–15 | **practice** |
| RIR | 2–3 flat or mild tighten | **heuristic** |
| rest | 60–120 s | **heuristic** |
| patternBias | balanced push/pull/legs + core | **assumption** |
| cardioDefault | on 10–20 min easy–mod | PacerGo general_fitness **practice** |
| mobility | cooldown stretches already; keep | PacerGo **practice** |
| progression | +0–1 set by week 4; prioritize adherence | ACSM **evidence** |

#### Internal Strength accent (not a user goal unless product adds it)
| Field | Default | Label |
| --- | --- | --- |
| when | int+ & (build_muscle optional top sets OR explicit strength goal) | **assumption** |
| reps primary compounds | 5–8 | ACSM strength **practice** |
| rest | 180–300 s | ACSM **practice** |
| sets/exercise | 2–3 | ACSM 2026 **evidence** |
| weekly sets/muscle | 6–12 (quality > junk volume) | **heuristic** |
| RIR | 1–3 | **practice** |

#### Goal-specific progression rules (same levers, different scalars)
| Week | Build Muscle | Fat Loss | Functional | General |
| --- | --- | --- | --- | --- |
| 1 | base sets, RIR 3 | base, RIR 3 | base, technique RIR≥2 | base, RIR 3 |
| 2 | hold sets, RIR 2 | hold, denser rest OK | hold patterns | hold |
| 3 | +1 set (if allowed) | +1 set **or** +cardio min, not both | +load/density | +0–1 set |
| 4 | +1 set or mild unload if int+ | hold or unload if int+ | hold | hold / celebrate adherence |

### Gaps
- Functional “carry/loco” depends on catalog coverage; missing slugs force silent fallback to hypertrophy patterns.
- Strength accent without velocity or 1RM remains a cueing/rep-band approximation.

---

## PacerGo reverse-engineering: current variables/goals and align vs diverge

### Takeaway
PacerGo already implements a **coach-template 4-week deterministic composer** with experience-gated sets/reps, split recommendation, rest-by-heaviness, optional cardio, low-impact gates, and +1 set in weeks 3–4. Align the new schema with these rails; **diverge** where research says weekly hard sets, RIR schedule, fixed variety, and four goal profiles should be first-class—not only side effects of reps/rest hacks.

### Cited Findings
- Live goals: `lose_weight | build_muscle | stay_healthy`. Composer-era goals: `muscle_gain | fat_loss | functional | general_fitness`. — `onboarding-types.ts`; `enums/training.ts`
- Live scheme table: `no_experience/beginner → 2×12–15`; `intermediate → 3×10–12`; `advanced → 4×8–10`. Fat loss forces `12–15`; injuries force `12–15`. — `generate-plan.ts` `SETS_REPS_BY_EXPERIENCE` / `repsFor`
- Progression: `progressionSets` → +1 main-lift set weeks 3–4 unless `lack_of_time` or `injuries`. `PLAN_RULES_VERSION = 10`. — `generate-plan.ts`
- Rest: `restSecFor` maps heaviness from reps + exercise type + goal (`build_muscle +0.1`, `lose_weight -0.1`) into user timer band (default 60–180 s). — `generate-plan.ts`; `REST_TIMER_RECOMMENDED_SEC`
- Split: `recommendSplit` frequency/experience/goal/equipment/duration/consecutive-day rules. — `split-recommendation.ts`
- Fingerprint inputs listed in plan-inputs section. Soft plan settings (variety, rest timer, cardio, muscle focus) persist via `applyProfileToPlan`. — `plan-inputs.ts`
- Authored composer differs more by goal (STRENGTH vs CIRCUIT schemes, functional/general menus) than the live AI-eligible generator does. — `plan-data.ts`
- Post-session load loop: `recommendLoad` double-progression with effort feedback. — `progression.ts`
- Prior synthesis: freeze skeleton; progress dose; enrich week scalars; prefer Consistent variety for 4 weeks. — `reports/Deterministic workout plan progression.md`

### Inferences
**Align (keep):**
- 4-week emit-all-weeks model; deterministic pure function; experience tiers; equipment-filtered pool; low-impact; split recommender structure; per-exercise rest; optional cardio block; logged `recommendLoad`.

**Diverge (schema upgrade rationale):**
| Area | PacerGo today | Proposed schema | Rationale |
| --- | --- | --- | --- |
| Goals | 3 live / 4 authored | unify 4 profiles + map `stay_healthy`→general, `lose_weight`→fat_loss | product completeness |
| Weekly sets/muscle | implicit via exercises×sets×exposures | **explicit** primary dose | ACSM/Schoenfeld **evidence** |
| Variety default | `balanced` rotates accessories | default **fixed** for 4-wk block | progressive overload visibility **heuristic**/prior report |
| RIR | not emitted | week RIR targets in profile | consumer intensity without 1RM **practice** |
| Strength | copy-only | internal objective / accents | ACSM strength vs hypertrophy split **evidence** |
| Fat loss | reps+rest+cardio only | add fatigue budget vs cardio | NSCA total stress **heuristic** |
| Functional/general | weak in live generator | patternBias + cardioDefault profiles | match authored intent without new engine |
| Advanced sets | 4 sets default | often 3 + weekly-set cap | ACSM diminishing returns **evidence** |

### Gaps
- No single doc in-repo enumerates movement-pattern slots for the live catalog; schema’s `patternBias` needs a catalog tagging pass.
- Whether product keeps both plan-composer (`plan-data`) and `generateTrainingPlan` long-term is undecided—schema should target the live generator path.

---

## Cross-cutting gaps for the report writer

- Exact W1–W4 set schedules are **not** mandated by ACSM/NSCA; treat RP-like ramps as **practice/heuristic**.
- ACSM 2026 softens several 2009 micro-variable prescriptions (rest, periodization, failure); prefer 2026 for “what matters,” 2009 for implementable bands when 2026 is silent.
- Unsupervised injury handling is a **heuristic** filter, not medical exercise prescription.
- All URLs above should be re-checked if the Position Stand HTML paywall text differs from the PMC full text.
