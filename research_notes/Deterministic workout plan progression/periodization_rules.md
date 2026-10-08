# Deterministic / rule-based workout periodization for 4-week consumer plans

## What week-1 → week-4 progression schemes are standard for novices in a short mesocycle?

### Takeaway
For novices in a ~4-week block, evidence and coach education converge on **simple progressive overload within a fixed session structure**—not elaborate phase changes. Standard software-friendly patterns are: (1) add load via the 2-for-2 / double-progression rule, (2) add ~1–3 weekly sets from a low MEV start toward MAV, and/or (3) mild linear intensity ramp with an optional light week-4 deload; complex DUP or multi-quality periodization adds little for true beginners.

### Cited Findings
- ACSM 2009: when training at a specific RM load, apply a **2–10% load increase** when the individual can perform the current workload for **1–2 repetitions over the desired number on two consecutive sessions** (evidence grade B). — [Medscape summary of ACSM Progression Models](https://www.medscape.com/viewarticle/717047_9); [ACSM MSSE fulltext (2009)](https://journals.lww.com/acsm-msse/fulltext/2009/03000/progression_models_in_resistance_training.26.aspx)
- ACSM 2009: novices should use **1–3 sets per exercise**, loads **~60–70% 1RM for 8–12 reps**, full-body **2–3 d·wk⁻¹**; for hypertrophy, novice/intermediate: **70–85% 1RM, 8–12 reps, 1–3 sets**. — [Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9)
- ACSM 2026 Position Stand press summary: biggest benefits come from **consistency**, not complicated programs; for hypertrophy aim ~**10 sets per muscle group** weekly; complex periodization did **not consistently** change outcomes for average healthy adults vs simpler training. — [ACSM 2026 guidelines announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC overview of reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)
- Renaissance Periodization sample mesocycle volume ramp (example MEV 12 → MRV 20): Week 1 = 12, W2 = 14, W3 = 16, W4 = 18, W5 = 20, then deload to ~MV (e.g. 6 sets). Algorithm: if recovering well add **1–3 sets/week**; if struggling hold or deload. — [RP Training Volume Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- RP: beginners can accumulate **up to ~12 weeks** before systemic MRV; advanced may need deload after **3–4 weeks**—so a consumer 4-week plan often needs only a **mild** final unload for intermediates+, not a hard deload for true novices. — [RP back hypertrophy / periodization notes](https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips)
- Starting Strength Novice Linear Progression: fixed A/B full-body template, **add weight every session** (typically 5–10 lb squat/deadlift early, 2.5–5 lb press), **repeat the weight if reps are missed**; schedule stays **3 non-consecutive days/week**; early phase often lasts **1–3 weeks** before template tweaks, with **2–3 months** of usable NLP for many novices—far longer than one 4-week app plan. — [Starting Strength programs](https://startingstrength.com/article/programs); [Niki Sims NLP overview](https://startingstrength.com/article/how-to-squat-405-in-12-weeks); [Incremental increases PDF](https://startingstrength.com/articles/incremental_increases_rippetoe.pdf)
- NSCA periodization teaching: mesocycles commonly **~4 weeks**; linear model = progressive intensity ↑ with volume ↓ over time; non-linear/DUP = large fluctuations within the week; for novices, concurrent simple progression is appropriate. — [NSCA TSAC periodization module PDF](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf); [NSCA team-sport periodization supplement](https://www.nsca.com/contentassets/f9d5e4180ffe4cecb9c8ae2a6c2ac6eb/periodization-and-programming-for-team-sports_supplement.pdf)
- Zourdos et al. (JSCR 2016) on DUP in trained lifters: authors note periodization model is of **little importance in novices** due to rapid neuromuscular gains; novices should prioritize **technique, adherence, avoiding overtraining**. — [JSCR modified DUP study](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx)
- NASM OPT: phases typically progressed after **4–6 weeks**; Phase 1 (stabilization) uses **12–20 reps, 1–3 sets, 50–70% 1RM**, slow tempo—a deterministic “week block” length matching a 4-week app cycle for true beginners. — [NASM OPT model](https://www.nasm.org/certified-personal-trainer/the-opt-model); [NASM Phase 1 blog](https://blog.nasm.org/nasm-optimum-performance-training); [NASM progression timing](https://blog.nasm.org/certified-personal-trainer/exercise-progressions-asking-right-questions)
- Open-source `routine-engine`: holds exercises for a **four-week block** (does not rotate exercises weekly) so progressive overload remains visible; week structure progresses within that fixed exercise set. — [sugarshaneaz/routine-engine](https://github.com/sugarshaneaz/routine-engine)
- Open-source `streprogen`: generates multi-week strength programs as pure configuration + render (duration, start weights, min/max reps)—illustrates deterministic load/rep trajectories without ML. — [tommyod/streprogen](https://github.com/tommyod/streprogen)

### Inferences
- **Implementable W1→W4 schemes for a consumer generator (pure functions of level + week index):**
  1. **Novice linear (preferred for true beginner):** same exercises/split all 4 weeks; progress via double-progression (reps then load) or fixed % load bumps; volume flat or +0–1 set total by week 4; no required deload.
  2. **Volume undulation (hypertrophy / fat-loss “experienced basic”):** start near MEV (~8–12 hard sets/muscle/week), +1–2 sets/week through week 3–4; optional week-4 hold or −40–50% sets if user self-reports as intermediate+.
  3. **Mild linear intensity:** same rep targets (e.g. 8–12), RIR target drops from ~3 → ~1–2 across weeks (effort ↑) without changing split—safer than changing %1RM when 1RM is unknown.
  4. **Stable intra-week undulation (optional ≥ intermediate):** fixed Mon hypertrophy / Wed strength / Fri metabolic pattern every week, with weekly load/volume bump—not day-to-day random variation.
- Do **not** change the mesocycle goal every week (endurance → hypertrophy → strength) inside a 4-week consumer plan; that mimics athletic preparatory sequencing spanning longer blocks and conflicts with ACSM 2026 “consistency over complexity.”
- For fat-loss framing: keep resistance progression identical to hypertrophy/general fitness; manage energy expenditure via separate cardio/steps rules rather than weekly RT structure churn.

### Gaps
- No single ACSM/NSCA table mandates an exact “Week 1 / 2 / 3 / 4” set-count schedule for novices; RP’s sample ramp is coaching heuristic, not a clinical standard.
- Few peer-reviewed trials isolate **4-week-only** consumer apps; most periodization RCTs are 6–12+ weeks in supervised settings.
- Exact % load jumps week-to-week when users do not know 1RM (typical in consumer apps) are under-specified in position stands; double-progression/RIR rules are the practical substitute but less formally graded than the 2–10% RM rule.


## How should sets and reps scale by experience (true beginner vs basic/<1yr vs intermediate vs advanced)?

### Takeaway
Scale **frequency, sets per exercise, weekly sets per muscle, and loading complexity** with training status; keep novice/hypertrophy rep ranges largely in the **~8–15** band for consumer plans. True beginners need low volume and high technique priority; volume ceilings and denser schedules rise with experience—while ACSM 2026 still pegs ~**10 weekly sets/muscle** as a practical hypertrophy target for general adults.

### Cited Findings
- ACSM 2009 strength: novice–intermediate **60–70% 1RM, 8–12 reps**; advanced cycle **80–100% 1RM**. Hypertrophy: novice/intermediate **70–85% 1RM, 8–12, 1–3 sets**; advanced **3–6 sets**, periodized 1–12 RM with majority in **6–12**. Frequency: novice **2–3**, intermediate **3–4**, advanced **4–6** d·wk⁻¹. Sets: novice **1–3** per exercise; multiple-set systematic variation for intermediate+. — [Medscape ACSM recommendations table](https://www.medscape.com/viewarticle/717047_9)
- ACSM 2026 summary: strength → heavier loads **~80% 1RM**, **2–3 sets**; hypertrophy → **~10 sets per muscle group**; power → **30–70% 1RM** moved quickly; meta-regression cited diminishing returns beyond ~**2–3 sets/exercise** for strength and ~**18–20 weekly sets** for hypertrophy. — [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [PMC Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)
- NSCA Essentials of Personal Training: novice **2–3 d/wk full body**, nonconsecutive, **1–3 days** between same-muscle sessions (never >3); intermediate **3–4 d/wk** often via upper/lower or push/pull splits; advanced **4–6 d/wk**, sometimes double splits. Trained clients **cannot progress** on only 1–2 d/wk (maintenance only). — [NSCA frequency article](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)
- RP landmarks (high-level): **MV ≈ 6 sets/muscle/week**; MEV near MV for beginners (easy to grow), MEV rises with advancement; MAV is the progression zone between MEV and MRV; working sets defined as **30–85% 1RM, 5–30 reps, 0–4 RIR**. — [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- Stronger by Science: weekly **fractional sets** (1.0 primary, 0.5 synergist); more sets → more hypertrophy with diminishing returns; practical low volume **~10–15** sets/muscle/week still effective; literature often discussed as low ≤10, mid 10–20, high >20; some analyses support benefits up toward **30–40** fractional sets for maximizers who recover. — [SBS volume article](https://www.strongerbyscience.com/volume/); [SBS minimalist training](https://www.strongerbyscience.com/minimalist-training/); [SBS volume vs intensity](https://www.strongerbyscience.com/high-volume-vs-high-intensity/)
- Better Health Channel (public guidance aligned with classic ACSM-style advice): start **1 set**, progress to **2–3 sets of 8–12**; rest muscle groups **≥48 h**; change workout every **4–8 weeks**. — [Better Health Victoria](https://www.betterhealth.vic.gov.au/health/healthyliving/resistance-training-health-benefits)
- NASM Phase 1 (novice foundation): **12–20 reps, 1–3 sets, 50–70% 1RM**, long eccentric tempo; Phase 2: **2–4 sets, 8–12**, supersets; progression often gated by **2-for-2 rule** and readiness, not calendar alone. — [NASM Phase 1](https://blog.nasm.org/nasm-optimum-performance-training); [NASM progressions](https://blog.nasm.org/certified-personal-trainer/exercise-progressions-asking-right-questions)
- Starting Strength: novices use fixed **3×5** (deadlift **1×5**) rather than hypertrophy 8–12—strength-first NLP; not a hypertrophy prescription but shows “experience = simpler templates + load progression,” not volume pyramids. — [Starting Strength programs](https://startingstrength.com/article/programs)

### Inferences
- **Deterministic experience tiers for software (map onboarding → defaults):**

| Tier | Typical onboarding proxy | Frequency | Sets/exercise | Weekly sets/muscle (hard) | Reps (general/hypertrophy/fat-loss) | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| True beginner (untrained / long layoff) | “Never / rarely lifted” | 2–3 FB | 1–2 | ~6–10 (near MV–MEV) | 8–12 (or 12–15 technique-friendly) | Stop ~2–4 RIR; avoid failure |
| Basic / <1 yr | “Some gym experience” | 3 FB or UL | 2–3 | ~8–14 | 8–12 | ~1–3 RIR |
| Intermediate | ≥~1 yr consistent | 3–4 split | 2–4 | ~10–18 | 6–12 (optional light DUP) | ~0–2 RIR on last sets |
| Advanced | Multi-year, recovering well | 4–5+ | 3–6 | ~12–20+ (cap for consumer safety) | 5–12 periodized | Higher intensity OK; not required for consumer app |

- Prefer **weekly sets per muscle** as the scaling knob across tiers; keep per-session exercise count constrained by session duration.
- For consumer safety: **do not** default advanced to 30–40 sets/muscle or failure training; ACSM 2026 emphasizes adherence and notes failure/complex periodization are often unnecessary for healthy adults.
- Fat-loss plans: same set/rep tables as hypertrophy; optionally bias slightly higher-rep (10–15) and shorter rest for density—not a separate periodization model.

### Gaps
- ACSM/NSCA “novice / intermediate / advanced” do **not** map 1:1 to “true beginner vs <1 yr vs intermediate vs advanced” marketing labels; intermediate is often defined as ~**6 months** consistent RT in ACSM 2009 wording, not strictly calendar years.
- Muscle-specific RP landmark tables on third-party sites vary; official RP pages emphasize individualization over fixed universal numbers—software should treat any numeric table as **defaults with caps**, not truth.
- No authoritative source specifies exact set tables keyed to “consumer app onboarding answers”; those mappings are engineering inferences from the above.


## How do exercise progression ladders work (e.g. goblet squat → back squat; machine → free weight) while staying within one experience level?

### Takeaway
Ladders are **ordered regressions/progressions of the same movement pattern**, changing one complexity lever at a time (base of support, load, line of pull, velocity, COG). Within a 4-week plan and one experience tier, **hold the chosen rung for the full block** and progress load/reps; only move up a rung between blocks (or mid-block if form is rock-solid)—do not climb machine → barbell inside every week.

### Cited Findings
- ACE-aligned coaching material: five complexity levers—**base of support, amount of load, line of pull, velocity, center of gravity**; progress/regress **one lever at a time**; pain or form breakdown → regress immediately. Example squat ladder: high sit-to-stand → hands-free sit-to-stand → lower box → bodyweight squat → light goblet (+/− box) → heavier goblet / KB front / barbell squat. Parallel ladders for hinge, push-up, row, lunge. — [OpenExamPrep / ACE CPT movement progressions](https://open-exam-prep.com/study-guides/ace-cpt/exercise-selection/movement-progressions-regressions)
- Machine → free-weight practice guidance: start light, use regressions/partial ROM, increase complexity gradually; example path goblet → front/box squat; KB deadlift → RDL → barbell DL; DB bench → barbell bench; progress only when technique holds across sessions. — [Fitness For Life Co. transition article](https://fitnessforlifeco.com/how-do-you-progress-from-machines-to-free-weights-transition-safely-for-better-results/)
- Transition timelines in industry write-ups often span **≥4–8 weeks** (e.g. dumbbell bridge then empty-bar skill), with first free-weight loads far below machine equivalents (cited ~30–50% of estimated barbell 1RM or large load cuts)—i.e. **longer than one in-plan week**. — [PoinT GO machine-to-free-weights guide](https://research.poin-t-go.com/en/how-to/how-to-transition-from-machines-freeweights); [hack squat → back squat blog](https://gym-mikolo.com/blogs/home-gym/how-to-transition-from-hack-squat-to-back-squat-or-barbell-squat-for-real-strength-gains)
- Sportsmith on exercise continuums: prefer **loading a regressed pattern** the athlete owns over prescribing advanced patterns under-loaded; regressions isolate demands then reassemble (whole–part–whole). — [Sportsmith exercise continuums](https://www.sportsmith.co/articles/exercise-continuums-how-to-optimise-athletic-development/)
- ACSM 2009: free weights **and** machines for novice–intermediate; advanced may emphasize free weights with machines as accessories (grade C for that advanced emphasis). — [Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9)
- ACSM 2026: machines vs free weights **did not consistently** change outcomes for average healthy adults; bands/bodyweight also effective—supports keeping users on equipment they will actually use. — [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/)
- `routine-engine` design rule: program by **movement pattern slot** (“heavy horizontal push”), fill from catalogue by equipment; **rotate exercises per four-week block, not weekly**, so overload remains trackable. — [routine-engine README](https://github.com/sugarshaneaz/routine-engine)
- NASM: Phase 1 emphasizes mastering **fundamental movement patterns** and increasing proprioceptive demand before heavier loading; progressions are readiness-based. — [NASM OPT updates](https://blog.nasm.org/new-opt-model-updates)

### Inferences
- **Within one experience level / one 4-week plan:**
  - Select a **rung appropriate to tier + equipment** at plan generation (e.g. true beginner: leg press or goblet; basic: goblet or DB squat; intermediate+: barbell if onboarding says yes).
  - Keep that exercise **constant for weeks 1–4**; progress load/reps/RIR only.
  - Optional: swap **accessories** mid-block; keep **primary pattern lifts** fixed.
- **Between plans (week 5+):** allow +1 ladder rung if prior block completed with solid form signals (user-reported ease, no pain flags).
- Ladder moves that stay “same level”: e.g. within “basic,” goblet squat ↔ DB front squat is lateral; goblet → back squat is an **up-rung** and should be gated, not automatic weekly.
- Software model: `exercise_id = f(pattern, tier, equipment, ladder_index)`; `ladder_index` changes on plan renewal, not on `week_index` inside the mesocycle.

### Gaps
- No NSCA/ACSM position stand publishes a canonical universal ladder list (goblet → back squat etc.); ladders are coach-education / certification constructs.
- Consumer apps lack live form coaching; auto-promoting ladder rungs without technique feedback is a **safety gap**—conservative fixed-rung-per-block is the safer default.
- Industry transition articles are not peer-reviewed standards; treat % load cuts and week counts as illustrative, not normative.


## What volume/intensity changes are safe when frequency and session duration also vary?

### Takeaway
Treat **weekly hard sets per muscle** as the primary dose; when frequency or session length changes, **redistribute the same weekly volume** rather than multiplying volume × days. Raise only **one major stressor at a time** (volume **or** intensity **or** frequency). Cap session length by cutting isolation/exercises first, not by deleting all recovery days.

### Cited Findings
- ACSM 2026 / Phillips: train **all major muscle groups ≥2×/week**; program must be sustainable—“if too demanding to maintain, it loses effectiveness.” — [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/)
- ACSM 2009: frequency scales with status (2–3 → 3–4 → 4–6); hypertrophy intermediate may use **total-body** or **4 d/wk upper/lower**. — [Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9)
- NSCA: allow **≥1 and ≤3 days** between sessions stressing the same muscles; when adding days, use **split routines** so local recovery is preserved while weekly frequency rises; consider **total workload** including cardio/job stress—may need to **reduce RT frequency** if other stress is high. — [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)
- RP: landmarks assume sets in a stimulative effort band; frequency affects how volume is split; heavy compounds have **lower** set ceilings than isolation/machine work for the same muscle; start mesocycles at MEV and progress volume; deload toward MV when performance fails. — [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- Stronger by Science: dose is primarily **weekly sets**, not per-session sets; low weekly volume can still work if sets are hard; very high weekly volumes require recovery capacity. — [SBS volume](https://www.strongerbyscience.com/volume/); [SBS volume vs intensity](https://www.strongerbyscience.com/high-volume-vs-high-intensity/)
- BJSM network meta-analysis (2023): many RT protocols improve strength/hypertrophy; authors argue future work should emphasize **minimal doses and adherence** over hunting a single “optimal” complex prescription—supports not stacking aggressive volume + frequency ramps. — [BJSM network meta-analysis PDF](https://bjsm.bmj.com/content/bjsports/early/2023/07/06/bjsports-2023-106807.full.pdf?ijkey=t4XLijcgg5w3fvM&keytype=ref)
- NASM recovery programming: most people benefit from **1–2 rest days/week**; fat-loss often fails from **excess stress**, not insufficient RT frequency; match recovery to accumulated stress. — [NASM active recovery vs rest](https://www.nasm.org/resource-center/blog/active-recovery-vs-rest)
- Better Health: **≥48 h** between training the same muscle group. — [Better Health Victoria](https://www.betterhealth.vic.gov.au/health/healthyliving/resistance-training-health-benefits)

### Inferences
- **Safe coupling rules for a generator:**
  1. Fix `weekly_sets[muscle]` from (goal × experience).
  2. `sets_per_session ≈ weekly_sets / exposures_per_week` (exposures = days that train that muscle).
  3. If `session_minutes` shrinks: reduce **exercise count / isolation**, keep compound weekly sets; optionally raise density (shorter rest) before adding days.
  4. If frequency increases (e.g. 3→4 days): **do not** keep per-session volume constant (that multiplies weekly dose); redistribute or add at most **+10–20%** weekly sets for intermediates who chose higher frequency intentionally.
  5. Intensity (load/RIR) and weekly volume should not both jump hard in the same week for novices—prefer volume flat + load up, or load flat + +1 set.
  6. Concurrent cardio: if user selects high cardio days, bias RT toward lower MRV fraction (closer to MEV) per NSCA total-stress guidance.
- Example: 12 weekly quad sets at 3× FB → ~4 sets/session across squat-pattern + accessory; same 12 sets at 4× UL → ~6 sets on each lower day—not 4×4×4 blindly copied.

### Gaps
- Limited formal guidance on exact **minutes-per-session** tradeoffs in ACSM/NSCA tables; session duration caps are product constraints more than position-stand variables.
- Interaction effects of diet (deficit) on MRV are discussed in coaching literature but not tightly quantified for automatic 4-week planners.
- “Safe” % weekly volume increase has coaching heuristics (RP +1–3 sets) but no universal evidence-based maximum for unsupervised apps.


## What should NOT change week to week (split structure, rest-day pattern) for adherence?

### Takeaway
For adherence in a short consumer mesocycle, keep **weekly schedule shape, split template, primary exercises, and rest-day pattern** stable across all four weeks. Vary **load, reps-in-reserve, and small set counts**—the variables progressive overload needs—while ACSM 2026’s core message is that the best program is the one users stick with.

### Cited Findings
- ACSM 2026: consistency beats complexity; individualize for **enjoyment and safety** to maximize adherence; complex periodization not consistently necessary for average adults. — [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/)
- NSCA frequency examples lock rest days into a **repeating weekly pattern** (e.g. upper Mon/Thu, lower Tue/Fri, rest Wed/Sat/Sun); contrast with “3-on/1-off” where rest day **drifts**—harder for consumer calendars. — [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)
- Starting Strength: A/B structure and **Mon/Wed/Fri-style nonconsecutive** schedule remain fixed while only loads (and later exercise substitutions at phase boundaries) change—adherence via predictability. — [Starting Strength programs](https://startingstrength.com/article/programs)
- `routine-engine`: explicitly warns that **rotating exercises every week** makes progressive overload impossible to see; hold exercises for the **4-week block**. — [routine-engine](https://github.com/sugarshaneaz/routine-engine)
- Better Health: rest same muscle **≥48 h**; vary the program every **6–8 weeks** (i.e. block-level change, not daily churn). — [Better Health Victoria](https://www.betterhealth.vic.gov.au/health/healthyliving/resistance-training-health-benefits)
- Zourdos et al.: for novices, prioritize **adherence and technique** over optimal DUP design. — [JSCR DUP study](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx)
- BJSM 2023: emphasize practices that promote **engagement and adherence** and minimal effective doses. — [BJSM network meta-analysis](https://bjsm.bmj.com/content/bjsports/early/2023/07/06/bjsports-2023-106807.full.pdf?ijkey=t4XLijcgg5w3fvM&keytype=ref)
- NASM: recovery/rest days support consistency; fat-loss adherence often improved more by managing stress than by adding sessions. — [NASM recovery](https://www.nasm.org/resource-center/blog/active-recovery-vs-rest)

### Inferences
- **Freeze across weeks 1–4 (inputs constant in `f(onboarding, week)` except progression scalars):**
  - Days-per-week and which weekdays are training vs rest (or equivalent relative pattern)
  - Split type (full body / upper-lower / PPL)
  - Session order and primary movement slots
  - Primary exercise selections (ladder rung)
  - Target rep ranges (may allow ±1–2 reps via double progression, but not 5s one week and 15s the next for novices)
  - Warm-up structure and rest guidelines
- **Allow to change with `week_index`:**
  - Load prescription / RIR target
  - Sets per exercise within a small band (+0–2)
  - Optional easy week-4 volume cut for intermediate+
- Avoid week-to-week: new split, shifting rest days, wholesale exercise remixes, goal-phase hopping (endurance→strength), or adding training days mid-plan without redistributing volume.

### Gaps
- Adherence literature in public ACSM summaries is directional (consistency, enjoyment) rather than specifying which variables to freeze; the freeze-list above is synthesized for implementability.
- No strong RCT evidence that “fixed rest-day pattern” outperforms floating rest in apps specifically—practical UX/calendar reasoning plus NSCA fixed-split examples support it.
- Cultural/schedule constraints (shift work) may require floating rest; sources do not detail adaptive calendar algorithms.
