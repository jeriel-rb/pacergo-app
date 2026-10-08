# Periodization / progression models for a deterministic 4-week consumer plan rule engine

**Scope:** Encodeability and evidence for IF→THEN rules. No workout design. Same onboarding inputs → same plan; no LLM decisions; no live session feedback at generation time.

**Evidence grades used below:** **A** = ACSM/NSCA position stand or multi-study meta-analysis; **B** = peer-reviewed RCT / systematic review / Delphi with clear limits; **C** = coaching framework / expert consensus (not RCT law); **E** = engineering heuristic for deterministic software (product convenience, not physiology).

**Contradiction map vs prior PacerGo notes** ([periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md), [report](../../reports/Deterministic%20workout%20plan%20progression.md)): Prior work correctly freezes the skeleton and prefers progressive overload over complex periodization. It overstates (1) a mandatory or strongly evidence-backed Week-4 deload for intermediate+ (−40–50% sets), (2) RP’s live recovery-gated +1–3 sets/week as if it were generation-time law, and (3) a physiologic “Week 3 peak” requirement. Those are refined below.

---

## Which models compare best for encodeability, and what hybrid fits a 4-week deterministic generator?

### Takeaway
For a fixed 4-week, fully prescribed consumer mesocycle, the evidence-backed, machine-implementable core is **progressive overload on a frozen template** (double-progression / RIR targets ± small set ramp), not classical athletic periodization. Treat **linear set/effort progression + optional mild consolidation** as the hybrid; treat full **DUP, multi-block sequencing, and feedback-gated WUP** as poorly justified for novices and hard to prescribe without 1RM/live data.

### Cited Findings
- ACSM 2026 (overview of 137 reviews): with appropriate progressive overload, **periodization is not significantly superior** to nonperiodized programs for muscle function/hypertrophy in healthy adults; complex periodization “did not consistently impact outcomes” for average adults. — [PMC Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/) **[A]**
- ACSM 2026 glossary: **linear** = ↑ load / ↓ volume over program; **undulating** = daily or weekly RTx manipulation; **block** = multiweek blocks with distinct goals; periodization broadly = planned manipulation of load/volume/frequency. — [PMC Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) **[A]**
- Grgic et al. 2017 meta-analysis (13 studies): **LP vs DUP hypertrophy SMD −0.02** (95% CI −0.25 to 0.21; p = 0.848)—effects likely similar. — [PubMed 28848690](https://pubmed.ncbi.nlm.nih.gov/28848690/); [PeerJ PDF](https://vuir.vu.edu.au/37687/1/peerj-3695.pdf) **[A]**
- Moesgaard et al. 2022 volume-equated meta-analysis: periodized > nonperiodized for **1RM** (ES 0.31); **hypertrophy no difference** (ES 0.13, p = 0.27). UP > LP for 1RM overall (ES 0.31), but **only in trained** (ES 0.61); **untrained LP≈UP** (ES 0.06). Hypertrophy LP vs UP null (ES 0.05). — [PubMed 35044672](https://pubmed.ncbi.nlm.nih.gov/35044672/) **[A]**
- Harries et al. 2015 meta-analysis: **no difference** LP vs undulating for upper- or lower-body strength; novelty/variety may matter more than model label. — [JSCR abstract](https://journals.lww.com/nsca-jscr/Fulltext/2015/04000/Systematic_Review_and_Meta_analysis_of_Linear_and.35.aspx) **[A]**
- NSCA TSAC teaching: linear = progressive intensity ↑ with volume ↓; non-linear = large daily fluctuations within a microcycle; block = Accumulation / Transmutation / Realization (≈2–6 / 2–4 / 1–2 weeks); teaching table maps **linear → beginner & intermediate**, **non-linear → advanced**, **block → all statuses**. — [NSCA TSAC module PDF](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[C/education]**
- NSCA: mesocycles are intermediate blocks (weeks to months) with assigned goals; microcycles often **1–4 weeks**. — [NSCA hierarchical cycles](https://www.nsca.com/education/articles/kinetic-select/hierarchical-structure-of-periodization-cycles/); [NSCA Basics manual](https://www.nsca.com/contentassets/48a12160221541acbdc048498d77192d/basics_of_strength_and_conditioning_manual.pdf) **[C/education]**
- Block periodization (Issurin-style): concentrated stimuli in **2–4 (or 2–6) week** blocks with sequential qualities—designed for sport peaking / multi-competition calendars, not general consumer hypertrophy. — [PMC periodization review](https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/) **[B/review]**
- Bartolomei et al. 2023 (trained men, 10 weeks, volume-equated): **mixed-session** (power+strength+hypertrophy each session) > **block** for hypertrophy and bench 1RM; block better for vertical jump—shows block is not default-superior for gym hypertrophy. — [PubMed 36727999](https://pubmed.ncbi.nlm.nih.gov/36727999/) **[B]**
- Bartolomei et al. / WUD trial framing: weekly undulating programs often include a **dedicated recovery week** inside each 5-week mesocycle (e.g. light week 5)—structure assumes known %1RM and longer than 4 productive weeks. — [JSCR Block vs WUD summary](https://www.ovid.com/jnls/nsca-jscr/fulltext/10.1519/jsc.0000000000000948~block-vs-weekly-undulating-periodized-resistance-training) **[B]**
- Double progression / ACSM load rule: when training at a specific RM load, apply **2–10% load increase** when the person can do **1–2 reps over** the target (ACSM text; commonly taught as two consecutive sessions—“2-for-2”). — [ACSM 2009 PDF](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf) **[A, grade B in ACSM 2009]**
- Progressive overload + recovery/consolidation: NSCA overload principle—manipulate **one variable at a time** to reduce overtraining risk; GAS framing (alarm → resistance → exhaustion). — [NSCA TSAC module](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[C/education]**
- RP-style volume landmarks + mesocycle ramp: MV ≈ **6** sets/muscle/week; start near MEV, climb toward MRV with **+1–3 sets/week** if recovering, then deload toward MV; sample 12→14→16→18→20 then deload to 6. Explicitly **feedback-gated** (soreness/performance scores). — [RP Volume Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) **[C]**
- Israetel et al. SCJ 2020 (NSCA journal, coaching article): typical hypertrophy mesocycle progressions span **~4–8 weeks** then a recovery week; set-number progression is argued as most supported among set/rep/load options—“some of all 3.” — [SCJ Mesocycle Progression](https://journals.lww.com/nsca-scj/fulltext/2020/10000/mesocycle_progression_in_hypertrophy__volume.2.aspx) **[C]**

### Inferences
- **Encodeability ranking for PacerGo (generation-time IF→THEN):**
  1. **Progressive overload + fixed skeleton** — highest: week_index → set_delta, RIR_target, rest_delta. **[A+E]**
  2. **Double progression** — high as **user-facing rule** (reps then load); load bumps themselves need logged performance (**LIVE**), not generation. **[A]**
  3. **Linear volume/effort ramp within one quality (hypertrophy)** — high: W1 baseline sets → W2–W3 +sets and/or ↓RIR. Mimics “linear periodization” only in the soft sense of progressive stress, **not** classic volume↓/intensity↑ peaking. **[B/C → E]**
  4. **Weekly undulating (WUP)** — medium only if implemented as a **fixed intra-week pattern repeated every week** (e.g. Day A moderate / Day B heavier), not as week-to-week goal hopping. Strength benefit signal is mainly for **trained** lifters. **[A trained / A null untrained]**
  5. **DUP (daily H/S/P or high/mod/low reps)** — low for consumer generator: needs %1RM or reliable RIR, benefits unclear for novices/hypertrophy, adds schedule complexity. Optional later for intermediate **strength** goal with known loads. **[A/B]**
  6. **Block periodization (accumulation→transmutation→realization)** — low inside one 4-week consumer plan: a single block **is** the unit; chaining three athletic blocks requires ≥~5–12 weeks and peaking logic consumers do not have. **[B/C]**
  7. **RP MAV ramp + deload** — medium as **coaching-inspired defaults**; the published algorithm is **autoregulated**, so a deterministic app can only pre-schedule a conservative subset (e.g. +0–1 set mid-block), not claim individualized MEV/MRV. **[C→E]**
- **Recommended hybrid for IF→THEN encoding:** `FrozenSplit + ProgressiveOverload(double_progression_copy, RIR_schedule, optional_set_ramp) + ConditionalMildWeek4HoldOrUnload`. Do **not** encode full DUP/block sequencing as the default path.

### Gaps
- No head-to-head RCT of “consumer app deterministic 4-week tables” vs coach-prescribed periodization.
- “Weekly undulating” is inconsistently defined across studies (rep-zone waves vs goal waves vs %1RM waves)—software must pick one operational definition explicitly.

---

## For novices vs intermediates in a fixed 4-week block with no live feedback at generation, which models yield reliable machine rules?

### Takeaway
**Novices:** simple progressive overload on a fixed full-body (or simple split) template—periodization model choice is largely irrelevant. **Intermediates:** modest scheduled volume and/or effort progression remains reliable; undulating intensity is optional for strength goals if loads can be user-selected via RIR, not required for hypertrophy. Anything needing mid-plan performance branching is out of scope for generation-time determinism.

### Cited Findings
- Zourdos et al. JSCR 2016: periodization model is of **little importance in novices** due to rapid neuromuscular gains; novices should prioritize **technique, adherence, avoiding overtraining**—authors limited their DUP findings to well-trained men. — [JSCR modified DUP](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx) **[B]**
- Moesgaard 2022 subgroup: UP advantage for strength **absent in untrained** (ES 0.06). — [PubMed 35044672](https://pubmed.ncbi.nlm.nih.gov/35044672/) **[A]**
- ACSM 2009: novice strength **60–70% 1RM, 8–12 reps**, frequency **2–3 d·wk⁻¹**; intermediate ≈ **~6 months** consistent RT, frequency **3–4**; advanced wider periodized ranges. Hypertrophy novice/intermediate **70–85% 1RM, 8–12, 1–3 sets**. — [ACSM 2009 PDF](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf) **[A]**
- ACSM 2026 practical targets: hypertrophy ~**10 weekly sets/muscle**; consistency and sustainability over complex formulas. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/) **[A]**
- NSCA teaching: **less variation required for novices** than advanced; “manipulate only one overload variable at a time.” — [NSCA TSAC module](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[C/education]**
- Prior PacerGo synthesis (aligned here): freeze split/exercises/rest pattern; vary dose scalars—matches Hevy-style “Consistent” programs and ACSM consistency doctrine. — [Deterministic workout plan progression report](../../reports/Deterministic%20workout%20plan%20progression.md) **[E + cited A]**

### Inferences
- **Novice IF→THEN (generation-time):** `experience ∈ {no_experience, beginner}` → flat or +0–1 set by W3–4; RIR ~3–4 → ~2–3; emit double-progression copy; **no required deload**; **no DUP day types**. **[A+B]**
- **Intermediate IF→THEN:** start nearer ACSM ~10 weekly sets (or RP MEV-ish defaults); allow **+1 set** on main lifts mid-block and/or RIR ~3 → ~1–2; optional **fixed** intra-week intensity undulation if goal = strength; optional mild W4 volume hold/unload only if product tier = intermediate+ **and** planned weekly volume is high—see deload section. **[A+C→E]**
- **Hard constraint:** without live feedback, the plan cannot implement RP’s “if performance = 4 → deload” branch; that is a **different product surface** (logger/autoregulation), not the 4-week composer.

### Gaps
- ACSM “intermediate ≈ 6 months” ≠ PacerGo marketing labels (“basic / &lt;1 yr”); mapping remains an **E** product decision.
- Few trials isolate **fully prescribed** (non-autoregulated) 4-week blocks in unsupervised consumers.

---

## What do ACSM 2009/2026, NSCA teaching, Schoenfeld/hypertrophy metas, Zourdos DUP, and RP landmarks imply for short consumer mesocycles?

### Takeaway
Authoritative sources converge on **dose (volume × effort × consistency)** over **model theater**. Short consumer mesocycles should encode ACSM progressive-overload and weekly-set targets; borrow RP landmarks only as labeled coaching defaults; use Zourdos/DUP literature mainly as a caution **against** prioritizing DUP for novices.

### Cited Findings
- ACSM 2009 progression centerpiece: progressive overload via RM-based **2–10%** load increases when exceeding target reps; periodization recommended more strongly for intermediate/advanced loading ranges. — [ACSM 2009 PDF](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf) **[A]**
- ACSM 2026: update to 2009; periodization less important than hypothesized when progressive overload is present; failure training and complex systematic variation optional for general adults. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/) **[A]**
- **Contradiction (useful):** ACSM 2009 language still emphasizes periodized loading for intermediate+ strength/hypertrophy; ACSM 2026, synthesizing newer reviews, **downgrades** periodization’s necessity. For a 2026 consumer product, **prefer 2026’s consistency doctrine** while keeping 2009’s concrete progression operators (2–10% / RM ranges). **[A vs A — resolve toward 2026 for model choice, 2009 for progression mechanics]**
- Schoenfeld, Ogborn & Krieger 2017: graded dose-response—each additional weekly set ≈ **+0.023 ES (~0.37% gain)**; categorical trend favoring **10+ weekly sets/muscle**. — [PubMed/JSS meta](https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197); [PDF](https://www.ageingmuscle.be/sites/bams/files/publications/Dose%20response%20relationship%20between%20weekly%20resistance%20training%20volume%20and%20increases.pdf) **[A]**
- ACSM 2026 messaging aligns practical hypertrophy dose near **~10 sets/muscle/week**, with diminishing returns discussed in the broader literature toward high weekly volumes. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/) **[A]**
- Zourdos DUP work: useful for **trained** lifters optimizing weekly order/volume; authors explicitly warn against overvaluing DUP design for novices. — [JSCR 2016](https://journals.lww.com/nsca-jscr/fulltext/2016/03000/modified_daily_undulating_periodization_model.24.aspx) **[B]**
- RP landmarks: MV/MEV/MAV/MRV and +1–3 sets/week algorithm—**coaching framework**; working-set assumptions (30–85% 1RM, 5–30 reps, 0–4 RIR). Must be labeled non-RCT. — [RP Volume Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) **[C]**
- NSCA education: linear suitable for beginners/intermediates with clear objectives; undulating for multiple simultaneous goals / no event date; variation need rises with training status. — [NSCA TSAC module](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[C/education]**

### Inferences
- **Implication for PacerGo short meso:** encode **weekly hard sets ≈ f(experience, goal)** anchored near ACSM ~6–12 (novice) / ~10–16 (intermediate consumer cap), not RP MRV chasing. **[A+C]**
- **Implication for model menu:** expose one default path (“progressive plan”); do not ship competing “DUP vs Block” product modes unless strength-specialist later. **[A]**
- **Prior-note correction:** citing RP’s 5-week sample ramp (W1–W5 + deload) as a template for a **4-week** app plan compresses a longer, feedback-driven meso into an unsupported calendar. Prefer **3 progressive weeks + optional consolidation**, or flat progressive effort without a fifth “MRV touch” week. **[C≠A]**

### Gaps
- Schoenfeld 2017 does not prescribe week-by-week set schedules inside a mesocycle—only dose-response across programs.
- No ACSM table maps MV/MEV/MAV/MRV; those remain RP vocabulary.

---

## Week 1 baseline → Week 2 progress → Week 3 peak stimulus → Week 4 recovery/consolidation: what is evidence-backed vs coaching practice vs engineering heuristic?

### Takeaway
A gentle **baseline → progress → higher productive dose → optional easier week** narrative is **coach-practice + software UX**, not a physiologic law that Week 3 must be a “peak.” Evidence supports **progressive overload / rising volume or effort across weeks**; it does **not** mandate a four-beat peak-and-deload waveform inside every consumer month.

### Cited Findings
- Progressive overload is the durable principle across ACSM 2009/2026 and NSCA teaching; periodized *ordering* of variables is secondary when overload exists. — [PMC ACSM 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/); [ACSM 2009](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf); [NSCA TSAC](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[A/C]**
- Israetel SCJ 2020: week-to-week progressions over **typically 4–8 weeks** before a recovery week are described as central in hypertrophy coaching; set progression favored. — [SCJ](https://journals.lww.com/nsca-scj/fulltext/2020/10000/mesocycle_progression_in_hypertrophy__volume.2.aspx) **[C]**
- RP sample: W1 MEV → weekly +sets → approach MRV → deload to MV—**illustrative**, recovery-gated. — [RP Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) **[C]**
- Schoenfeld volume meta: more weekly sets → more hypertrophy (graded)—supports **raising volume** as a progression operator, not a Week-3-only peak. — [Schoenfeld 2017 PDF](https://www.ageingmuscle.be/sites/bams/files/publications/Dose%20response%20relationship%20between%20weekly%20resistance%20training%20volume%20and%20increases.pdf) **[A]**
- Prior PacerGo report’s W1→W4 schemes (novice linear; +1–2 sets for basic; RIR ramp) are **engineering adaptations** of the above—not ACSM tables. — [report](../../reports/Deterministic%20workout%20plan%20progression.md) **[E]**
- NSCA: change **one major stressor at a time** (volume *or* intensity *or* frequency)—supports not stacking large set jumps **and** large RIR drops the same week for novices. — [NSCA TSAC](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[C/education]**

### Inferences
| Week role | Evidence class | Deterministic rule sketch |
| --- | --- | --- |
| W1 baseline | **A/C** — start conservatively (technique, adherence) | sets = `base_sets(experience)`; RIR high (easier) |
| W2 progress | **A/C** — progressive overload | +0–1 set **or** −1 RIR (not both hard for novices) |
| W3 “peak” | **C/E** — coaching narrative of highest productive stress; **not** a validated physiologic peak week | highest scheduled sets and/or lowest RIR of the block |
| W4 recovery/consolidation | **B/C mixed** — see next section; not mandatory | hold W3 dose **or** mild unload if intermediate+ & high volume |

- Label any exact schedule like “W1=12, W2=14, W3=16, W4=8” as **E** unless tied to live MEV/MRV assessment (**C** when RP-style).

### Gaps
- No RCT validates the specific four-week storyboard “baseline / progress / peak / consolidate” against continuous progressive overload without a named peak week.
- “Peak productive stimulus” has no standard quantitative definition (sets × RIR × proximity to failure) in position stands.

---

## Should Week 4 always be a deload, or conditional? What thresholds exist vs unsupported invention?

### Takeaway
**Week 4 should not always be a deload.** Experimental evidence in short/moderate programs does **not** show hypertrophy gains from inserting a deload/cessation week, and may **hurt strength** vs continuous training. Pre-planned deloads every ~4–8 weeks are **coach consensus** for high-stress strength/physique athletes—not a physiologic threshold for unsupervised consumer novices. Conditional mild unload is defensible as **E/C**; mandatory −40–50% W4 for all intermediates is **unsupported invention** if stated as evidence law.

### Cited Findings
- Coleman et al. 2024 (PeerJ; Schoenfeld/Israetel coauthors): 1-week **training cessation** mid 9-week high-volume RT in trained adults → **similar hypertrophy/power/endurance** vs continuous; **continuous superior for lower-body strength**. Authors note short-term studies (≤9 weeks) with moderate volumes **do not require deloads** to facilitate recovery in young participants. — [PeerJ e16777](https://peerj.com/articles/16777/) **[B]**
- Sci Reports 2026 (untrained young men, within-subject, 8 weeks): deload periods as reduced volume/frequency mid/end → **similar hypertrophy and strength-endurance** vs continuous; deload arm performed ~**18% fewer sets**—time-efficiency angle, not superiority. — [Nature Sci Rep](https://www.nature.com/articles/s41598-026-40612-5) **[B]**
- Bell et al. 2023 Delphi (expert coaches, ≥70% consensus): deload = reduced training stress to mitigate fatigue and enhance preparedness; can be **pre-planned or autoregulated**; often every **~4–6 weeks** (~7 days) in strength/physique practice; volume usually cut (sets/reps/frequency); intensity may stay or drop. Explicitly: scientific evidence for deloading is limited; practices are experiential. — [Sports Med Open Delphi](https://link.springer.com/article/10.1186/s40798-023-00633-0) **[C]**
- Bell et al. practical approach / survey literature: pre-planned deload commonly every **4–8 weeks**; flexible/reactive deload when performance stalls, soreness, joint aches. — [SHU practical deload PDF](https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach%28AM%29.pdf); [Sports Med Open survey](https://link.springer.com/article/10.1186/s40798-024-00691-y) **[C]**
- RP coaching: beginners may train many weeks before systemic MRV; advanced often need unload sooner—used in prior PacerGo notes. — [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) **[C]** (specific “12 weeks vs 3–4 weeks” claims in secondary RP posts should be treated as coaching narrative unless re-fetched per article)
- Prior PacerGo notes suggested optional W4 **−40–50%** sets for intermediate+: that magnitude resembles RP drop toward **MV**, but **no RCT mandates −40–50% in week 4 of a consumer plan**. — [periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md) **[E, previously over-labeled]**

### Inferences
- **Always deload W4?** → **No.** Contradicted by Coleman 2024 strength findings and null hypertrophy benefit; contradicted for novices by ACSM consistency + Zourdos adherence priority. **[B+A]**
- **Conditional deload (generation-time, no live feedback)—defensible IF→THEN (mark as E/C):**
  - `IF experience ∈ {no_experience, beginner} AND weekly_sets ≤ ~10` → **no deload** (hold or slight progress).
  - `IF experience ≥ intermediate AND planned_peak_weekly_sets ≥ ~14–16` → optional W4 **mild** unload (e.g. −20–30% sets **or** +1–2 RIR), not full cessation.
  - `IF injuries / high life-stress flags` → bias toward W4 hold/unload.
- **Unsupported invention (do not claim as literature thresholds):**
  - “Everyone deloads week 4.”
  - “Intermediate always −40–50% sets in week 4.”
  - “Week 4 deload improves hypertrophy vs continuous training in 4-week apps.”
  - Exact MRV percentages without individual recovery data.

### Gaps
- Coleman deload was **full cessation**, not reduced-volume deload—may not generalize to “keep frequency, cut sets 40%.”
- No trial tests PacerGo-like **fully prescribed** W4 unload vs continuous inside **exactly 4 weeks**.
- Delphi thresholds (every 4–6 weeks) describe **competitive** strength/physique coaches—not general consumers.

---

## Which progression operators are deterministic without known 1RM (double progression, RIR, set addition, density)?

### Takeaway
Without 1RM, generation-time rules should prescribe **rep ranges, set counts, RIR targets, and rest/density**—and emit **double-progression instructions** for the user to apply loads. Percent-1RM linear periodization and classic DUP load tables are **not** generation-deterministic unless the product invents estimated 1RMs (then it is a different, estimate-dependent system).

### Cited Findings
- ACSM 2009: progression when exceeding target reps by 1–2 → **+2–10% load** (small-muscle lower %, large-muscle higher %). Operates on **RM performance**, not a stored 1RM. — [ACSM 2009 PDF](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf) **[A]**
- Double progression (add reps within a range, then add load and reset reps) is the consumer-practical form of that ACSM rule; PacerGo prior notes and Caliber-style apps rely on user execution. — [periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md); [Cleveland Clinic progressive overload](https://health.clevelandclinic.org/progressive-overload) **[A mechanics + E UX]**
- RIR prescription: target RIR + fixed reps lets users select load without 1RM; Graham & Cleather-style programs assign weekly RIR targets. Scoping review: RIR scales feasible for intensity regulation; accuracy better near failure, higher loads, lower reps. — [Scoping review](https://journals.sagepub.com/doi/full/10.1177/00315125241241785) **[B]**
- Ormsbee/Helms-linked caveat (cited in RIR-velocity paper): RIR accuracy highest with experience and nearer failure; novices less accurate—so RIR is a useful **target label**, not a precision instrument for beginners. — [PMC RIR-velocity](https://pmc.ncbi.nlm.nih.gov/articles/PMC10901726/) **[B]**
- Lovegrove et al. 2022: RIR reliable for load prescription in young novice men on deadlift/bench (ICC ≥ 0.95 for 1-RIR loads across 3/5/8-rep schemes). — [JSCR](https://journals.lww.com/nsca-jscr/fulltext/2022/10000/repetitions_in_reserve_is_a_reliable_tool_for.4.aspx) **[B]**
- Set addition: Schoenfeld dose-response + RP/Israetel coaching support adding weekly sets as a primary hypertrophy progression lever. — [Schoenfeld 2017](https://www.ageingmuscle.be/sites/bams/files/publications/Dose%20response%20relationship%20between%20weekly%20resistance%20training%20volume%20and%20increases.pdf); [RP](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth); [SCJ Israetel](https://journals.lww.com/nsca-scj/fulltext/2020/10000/mesocycle_progression_in_hypertrophy__volume.2.aspx) **[A+C]**
- Density (shorter rest / more work per minute): ACSM 2009 local muscular endurance uses shorter rests (&lt;90 s) with lighter loads; NSCA lists rest reduction as an overload variable—usable as a **secondary** lever, not a substitute for volume/effort progression. — [ACSM 2009](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf); [NSCA TSAC](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf) **[A/C]**
- RP working-set band already assumes **0–4 RIR** without requiring tested 1RM. — [RP Landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth) **[C]**

### Inferences
| Operator | Generation-time deterministic? | Needs live feedback to *apply*? | Evidence |
| --- | --- | --- | --- |
| Fixed rep range (e.g. 8–12) | Yes | No | **A** |
| Scheduled set counts by week | Yes | No | **A/C→E** |
| Scheduled RIR targets by week | Yes (as prescription) | User self-selects load | **B** |
| Double-progression copy | Yes (as instruction) | Yes for load changes | **A** |
| Rest ↓ / density ↑ by week | Yes | Optional user timing | **C/A endurance** |
| %1RM linear/DUP tables | **No** without estimated 1RM | Yes if autoregulating | **A tables need 1RM** |
| RP “if sore → hold sets” | **No** at generation | Yes | **C** |

- **Recommended operator stack for the rule engine:** `(sets[week], rir[week], rest[week], double_progression_text)` with `load` left to user/logger. That stack is fully deterministic and evidence-compatible.

### Gaps
- No position stand grades “RIR ramp across 4 weeks” as a specific protocol (only RIR as a tool).
- Density progression lacks hypertrophy-specific meta-analytic dose rules comparable to weekly sets.
- Novice RIR accuracy remains a practical limitation—pair RIR with simple stop-short-of-failure coaching language.

---

## Synthesis for the report writer (encodeable recommendation)

### Takeaway
Encode **one hybrid**: frozen mesocycle skeleton + progressive overload (double progression + RIR schedule + small set ramp), with **conditional** mild W4 consolidation for higher-dose intermediates—not classical DUP/block sequencing and not mandatory deloads.

### Cited Findings
- Synthesis rests on citations in sections above (ACSM 2026 periodization null for hypertrophy; Moesgaard status interaction; Zourdos novice caveat; Schoenfeld volume dose-response; Coleman/Bell deload evidence vs practice; ACSM 2009 progression operators; RP labeled as coaching).

### Inferences
1. **Default model name in code/docs:** `ProgressiveMesocycle` (not `DUP`, `Block`, or `WUP`).
2. **IF experience = novice → THEN** linear-simple progressive overload; freeze structure; no W4 deload.
3. **IF experience = intermediate AND goal = hypertrophy → THEN** volume-leaning progressive overload (+sets and/or ↓RIR); optional fixed intra-week rep undulation only if it does not change the weekly skeleton.
4. **IF experience = intermediate AND goal = strength AND user can self-load via RIR → THEN** optional light undulation (heavier/lighter days) as additive, not required.
5. **NEVER** (default path): week-to-week goal hopping; exercise remix as progression; mandatory W4 deload; %1RM tables without 1RM; RP autoregulation branches at generation time.
6. **Evidence hygiene:** mark RP numbers and Delphi deload cadence as **C**; mark exact W1–W4 set tables as **E**; keep ACSM/meta claims as **A**.

### Gaps
- Exact numeric tables (sets per week × experience × goal) are product decisions informed by—but not dictated by—ACSM ~10-set and Schoenfeld dose-response findings; they belong in an implementation spec, not claimed as clinical standards.
