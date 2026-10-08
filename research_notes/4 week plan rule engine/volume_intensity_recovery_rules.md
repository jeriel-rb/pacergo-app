# Deterministic volume, intensity, progression, and recovery rules (4-week auto plan)

Evidence labels used below:
- **strongly supported** — position stand / meta-analysis with consistent direction
- **reasonably supported** — peer-reviewed trials or exploratory meta-regressions with caveats
- **coaching practice** — widely used coach frameworks (e.g. RP landmarks, NSCA 2-for-2)
- **engineering heuristic** — software-implementable default not uniquely mandated by evidence
- **automation assumption** — required for fully prescribed plans without mid-block feedback

Rule types: **HARD** (must not violate for safety/adherence), **SOFT** (preferred default), **PARAMETER** (tunable numeric), **HEURISTIC** (coach-style algorithm).

Scope: rules usable at **plan-generation time** for a fully prescribed 4-week block. Live-feedback extensions are called out separately. Do not invent thresholds without a cited basis.

---

## How should weekly volume be represented (sets/muscle/week, effective sets)?

### Takeaway
Represent dose primarily as **weekly hard (effective) sets per muscle group**, counted with a defined set-quality band (effort near failure, stimulative load/reps). Prefer **fractional counting** (1.0 primary, 0.5 synergist) for internal budgeting when compounds hit multiple muscles; a simpler **direct-only** count is acceptable if synergists are deliberately omitted from targets (RP-style).

### Cited Findings
- Schoenfeld, Ogborn & Krieger meta-analysis: graded dose–response between **weekly sets per muscle** and hypertrophy; each additional weekly set associated with +0.37% muscle gain / ES +0.023; categories `<5`, `5–9`, `10+` showed a trend favoring higher volume (p = 0.074 for 3-level categorical). — [PubMed 27433992](https://pubmed.ncbi.nlm.nih.gov/27433992/); [PDF](https://www.ageingmuscle.be/sites/bams/files/publications/Dose%20response%20relationship%20between%20weekly%20resistance%20training%20volume%20and%20increases.pdf)
- Authors’ practical contention from that body of work: **≥10 sets/muscle/week** as a minimum threshold to maximize hypertrophic response in the analyzed range; upper threshold not established in that paper. — [Gentil reply PDF quoting Schoenfeld](https://paulogentil.com/pdf/The%20dose%20response%20relationship%20between%20resistance%20training%20volume%20and%20muscle%20hypertrophy%20are%20there%20really%20still%20any%20doubts.pdf)
- ACSM 2026 Position Stand: hypertrophy enhanced by **higher volumes (≥10 sets/wk)**; frequency 1 vs >5 d/wk does **not** change hypertrophy when volume equated; advises ≥2 sets/exercise with diminishing returns beyond ~**2–3 sets/exercise** for strength and ~**18–20 weekly sets** for hypertrophy (citing meta-regression). — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [ACSM PDF (fit.com.my mirror)](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- Pelland et al. dose–response meta-regression: **fractional** weekly sets (indirect × 0.5 + direct) had strongest relative evidence vs total/direct counting; hypertrophy shows positive volume slope with diminishing returns (marginal β ≈ **0.24%** per set at mean volume); strength shows stronger diminishing returns / earlier plateau. — [SportRxiv preprint](https://sportrxiv.org/index.php/server/preprint/view/460/version/587%E2%81%A0); [PubMed 41343037](https://pubmed.ncbi.nlm.nih.gov/41343037)
- Stronger by Science operational definition: weekly **fractional sets** = 1.0 for primary target, 0.5 for meaningful synergist; discussed volume bands ≤10 / 10–20 / >20. — [SBS volume](https://www.strongerbyscience.com/volume/)
- RP coaching framework: counts **direct** working sets where the muscle is prime mover; assumes working set = **30–85% 1RM, 5–30 reps, 0–4 RIR**; does not use fractional math publicly. — [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- ACSM 2026: “weekly volume load” (load×reps×sets×exercises×sessions) was **rarely** considered in included reviews—set counts dominate evidence. — [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)

### Inferences
- **HARD / strongly supported:** Track `weekly_effective_sets[muscle]` as the primary dose knob, not per-session sets alone and not volume-load when loads are unknown.
- **SOFT / reasonably supported:** Define an “effective set” as a set in a stimulative band (approx. **≥~5–30 reps at a challenging load, terminated within ~0–4 RIR**)—aligns RP working-set band + ACSM “sufficient effort / near failure / ~2–3 RIR” language.
- **PARAMETER / engineering heuristic — pick one counting mode and document it:**
  - **Mode A (fractional):** primary 1.0, synergist 0.5 (Pelland/SBS). Better for multi-muscle compounds.
  - **Mode B (direct-only):** only prime-mover/isolation counts; assume compounds already “tax” synergists (RP). Simpler for consumer UX.
- **HARD / automation assumption:** Warm-up sets and ultra-easy sets **do not** count toward weekly effective volume.
- **IF** frequency or session length changes **THEN** redistribute the same `weekly_effective_sets` across exposures; do **not** multiply per-session volume by extra days (**SOFT / reasonably supported** via volume-equated frequency findings).

### Gaps
- No single gold-standard definition of “hard set” in ACSM 2026; RIR targets are suggested (~2–3) but authors note **insufficient evidence for exact RIR numbers**.
- Fractional vs direct counting both appear in literature/coaching; apps must pick one and keep consistency—evidence does not mandate which for product UX.

---

## What are minimum viable, maximum useful, and diminishing-return upper limits (MEV/MAV/MRV-style)?

### Takeaway
Evidence supports **detectable growth at very low weekly volumes**, a practical hypertrophy target around **~10 sets/muscle/week** for general adults, useful returns often in **~10–20**, and **diminishing (not zero) returns** beyond ~18–20 for many trainees. **MV / MEV / MAV / MRV** are useful **coaching-framework labels**, not ACSM clinical landmarks—use them as named parameters with evidence-mapped defaults, not as peer-reviewed physiologic constants.

### Cited Findings
- Pelland et al.: hypertrophy **minimum effective dose** ≈ **4 fractional weekly sets** (detectable vs SDES 2.05%); efficiency tiers escalate set cost for further detectable gains (e.g. higher-efficiency ~5–10 sets; lower-efficiency ~19–29). Strength MED ≈ **1** fractional set/week with much earlier plateau. — [SportRxiv](https://sportrxiv.org/index.php/server/preprint/view/460/version/587%E2%81%A0)
- Schoenfeld 2016/17 meta: graded benefits; practical emphasis on **10+ weekly sets** for maximizing hypertrophy within studied range; upper limit not identified. — [PubMed 27433992](https://pubmed.ncbi.nlm.nih.gov/27433992/)
- Baz-Valle et al. 2022 (trained young men): **12–20** weekly sets recommended as practical optimum; **>20** significantly better for triceps only, not quads/biceps. — [Journal of Human Kinetics](https://jhk.termedia.pl/A-Systematic-Review-of-the-Effects-of-Different-Resistance-Training-Volumes-on-Muscle,158681,0,2.html)
- ACSM 2026 practical summary: hypertrophy ~**10 sets/muscle/week**; diminishing returns beyond ~**18–20 weekly sets**; strength often served by **2–3 sets/exercise** and heavier loads. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- RP (**coaching framework**): **MV ≈ 6** sets/muscle/week; MEV near MV for beginners and rises with experience; MAV = progression zone between MEV and MRV; MRV = recoverable ceiling; working-set quality band as above. — [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- SBS: ~**20** sets/muscle/week ≈ average point of **rapidly diminishing returns** for trained lifters; novice threshold “likely quite a bit lower”; >20 may still add small gains at high time cost. — [SBS research spotlight](https://www.strongerbyscience.com/research-spotlight-volume-returns/)

### Inferences — labeled landmarks for the rule engine

| Label | Meaning for software | Suggested default band (hypertrophy/general) | Evidence class |
| --- | --- | --- | --- |
| **MV** (maintenance) | Floor for muscle retention / deload target | ~**4–6** effective sets/muscle/week | coaching practice (RP ~6); reasonably supported low-dose detectability (Pelland ~4 grows → maintain may be lower) |
| **MEV** (minimum productive) | Week-1 start for growth-oriented block | Beginners ~**6–10**; experienced ~**8–12** | coaching practice + ACSM ≥10 for maximizing; Pelland shows growth below this |
| **MAV** (useful progression zone) | Target band for weeks 2–4 of a short block | ~**10–16** consumer; up to ~**12–20** if intermediate+ and recovering | strongly supported mid-band (ACSM/Baz-Valle/Schoenfeld); MAV *as a named zone* = coaching practice |
| **MRV / consumer cap** | Do-not-exceed for unsupervised app | Cap ~**16–20** effective sets/muscle/week for consumer plans | reasonably supported diminishing returns ~18–20; hardcore 30–40 = not default (**HARD** safety/adherence) |

Explicit rules:
- **IF** goal ∈ {hypertrophy, fat_loss, general/functional} **AND** experience = true_beginner **THEN** set week-1 weekly sets near **MV–low MEV (≈6–10)** — **SOFT / coaching + ACSM consistency**.
- **IF** goal = hypertrophy **AND** experience ≥ basic **THEN** target average weekly sets ≈ **10–14** across the block (toward ACSM ~10 and MAV mid) — **SOFT / strongly supported direction**.
- **IF** computed weekly sets > **20** for any muscle **THEN** clamp to consumer cap and redistribute — **HARD / engineering heuristic** justified by diminishing-returns literature + adherence (do **not** invent muscle-specific MRV tables as “science”).
- **Do not** treat third-party muscle-by-muscle RP tables (back 25 MRV, etc.) as evidence-backed constants; they are **coaching starting points** with high individual variance — [RP](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth).

### Gaps
- No peer-reviewed universal MEV/MAV/MRV numeric table validated for consumer apps.
- Muscle-specific upper limits (triceps vs quads) differ in Baz-Valle; a single global cap is a simplification.
- “Maximum useful” is goal- and preference-dependent (efficiency vs maximization)—not a single physiologic cliff.

---

## Is “more sets every week” correct? What volume progression curves fit a 4-week block?

### Takeaway
**No—unconditional +sets every week is not required.** Progressive overload can be load/reps/effort with **flat volume**. For hypertrophy-oriented intermediate blocks, a **mild** set ramp (+0–2 sets/week from a low MEV start) is a valid **coaching** curve; true beginners in a 4-week consumer plan should usually keep volume **flat or nearly flat**.

### Cited Findings
- ACSM 2026: complex periodization **did not consistently** outperform simpler progressive training for average healthy adults; consistency and sufficient effort matter most; progression needed mainly for continued long-term progress. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- RP sample mesocycle: start at MEV, add volume through MAV toward MRV (example 12→14→16→18→20 then deload to ~MV); weekly algorithm uses **live** soreness/performance scores to add 1–3 / hold / deload. — [RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- RP coaching notes (prior research): beginners may go many weeks before systemic MRV; advanced often need unload sooner—4-week consumer plans often need only mild final unload for intermediate+, not hard deload for novices. — [RP back hypertrophy tips](https://rpstrength.com/blogs/articles/back-hypertrophy-training-tips) *(as cited in prior PacerGo notes)*
- Coleman et al. 2024: in a 9-week high-volume block, a mid-block 1-week **training cessation** deload did **not** improve hypertrophy vs continuous training and **favored continuous** for lower-body strength. — [PeerJ e16777](https://peerj.com/articles/16777/)
- Prior PacerGo periodization notes: implementable W1→W4 schemes include novice linear (flat volume), mild volume undulation (+1–2 sets), mild RIR ramp—not weekly goal-phase hopping. — [periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md)

### Inferences — deterministic 4-week volume curves (generation-time)

| Curve ID | Who | Week sets scalar (relative to week-1 base `V`) | Class |
| --- | --- | --- | --- |
| `FLAT` | True beginner; strength goal; high cardio stress | W1–W4 = `V` | **SOFT / reasonably supported** (progression via load/reps) |
| `MILD_RAMP` | Basic / hypertrophy | W1=`V`, W2=`V`, W3=`V+1`, W4=`V+1` (or +1 on main lifts only) | **SOFT / coaching practice** |
| `FULL_RAMP` | Intermediate+ hypertrophy, days/week ≥3, no deficit flag | W1=`V`, W2=`V+1`, W3=`V+2`, W4=`V+2` (cap at MAV/consumer cap) | **HEURISTIC / coaching practice** (RP-like; RP’s +1–3/week is **live**) |
| `RAMP_THEN_HOLD` | Intermediate+ when always-on mild consolidation desired | W1=`V`, W2=`V+1`, W3=`V+2`, W4=`V` or `V+1` | **HEURISTIC** |

Rules:
- **IF** experience = true_beginner **THEN** use `FLAT` (or at most +1 total set by W3–4) — **SOFT**. Do **not** prescribe aggressive MAV→MRV ramps in 4 weeks — **HARD / automation assumption** (recovery unknown).
- **IF** “more sets every week” would push any muscle above consumer cap **THEN** stop adding sets; progress load/reps/RIR instead — **HARD**.
- **IF** raising weekly sets **AND** raising prescribed proximity-to-failure in the same week for novices **THEN** prefer raising only one stressor — **SOFT / engineering heuristic** (raise one at a time).
- RP’s performance/soreness scoring to decide +2–3 vs hold is **LIVE FEEDBACK**, not generation-time — do not encode as mandatory IF→THEN without logs.

### Gaps
- No RCT mandates a specific W1/W2/W3/W4 set schedule for 4-week consumer apps.
- RP’s example is a **5–6 week** mesocycle + deload, not a validated 4-week prescription.

---

## Deterministic intensity rules without known 1RM (double progression, RIR, % bumps, density)

### Takeaway
Without 1RM, prescribe **rep ranges + RIR targets + double-progression / 2-for-2 load rules** (user-executed or future logger). Do **not** invent weekly %1RM ladders. Small relative load bumps (**~2–10%**) are ACSM-supported **when** the user exceeds the rep target; density (shorter rest) is a secondary lever, mainly for fat-loss/endurance framing.

### Cited Findings
- ACSM 2009 (evidence grade **B**): when training at a specific RM load, apply a **2–10% load increase** when the individual can perform the current workload for **1–2 reps over** the desired number on **two consecutive** sessions (smaller % for small muscles, larger for large). — [Medscape ACSM table](https://www.medscape.com/viewarticle/717047_9); [ACSM MSSE 2009](https://journals.lww.com/acsm-msse/fulltext/2009/03000/progression_models_in_resistance_training.26.aspx)
- NSCA / Baechle & Earle **2-for-2 rule** (coaching textbook): if athlete performs **≥2 reps over** assigned goal on the **last set** for **two consecutive workouts**, increase load next session. — [NASM progressive overload blog](https://www.nasm.org/resource-center/blog/training/progressive-overload-explained-programming-progress-for-every-client); industry attribution to Graves & Baechle — [Critical Bench summary](https://criticalbench.com/increase_weight.htm)
- Double progression (reps within a range, then load): standard coaching/consumer teaching aligned with 2-for-2 (e.g. hit top of 8–12 → add load, drop toward bottom of range). — [NASM](https://www.nasm.org/resource-center/blog/training/progressive-overload-explained-programming-progress-for-every-client); prior PacerGo report — [Deterministic workout plan progression.md](../../reports/Deterministic%20workout%20plan%20progression.md)
- Helms et al. / Zourdos RIR-based RPE: RPE 10 = 0 RIR, 9 = 1 RIR, etc.; useful for load autoregulation; novices less accurate than experienced; accuracy better within ~**0–3 RIR**. — [PMC 4961270](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)
- Helms et al. 2018: RPE-based loading can match %-1RM programs for strength when sets/reps matched; some individuals may prefer RPE. — [Frontiers 2018](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00247/full)
- ACSM 2026: training to failure **not necessary**; sufficient effort can be ~**2–3 RIR**; exact RIR targets still under-specified. Load range for hypertrophy can be broad (~30–100% 1RM) if effort is high. — [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- ACSM 2009 novice hypertrophy loading: roughly **70–85% 1RM, 8–12 reps, 1–3 sets** (context when %1RM known). — [Medscape](https://www.medscape.com/viewarticle/717047_9)

### Inferences — IF→THEN intensity (no 1RM)

**Generation-time (prescribed plan):**
- **HARD / strongly supported direction:** Prescribe a **rep range** (not a single rigid RM%) and a **target RIR band** by week/experience.
- **SOFT / coaching practice:** Default hypertrophy/general ranges: beginners **8–12 or 12–15**; basic **8–12**; strength goal **5–8** (or 3–6 on primaries) with higher RIR on compounds.
- **SOFT / automation assumption:** Emit **double-progression copy**: “Stay in [low–high] reps at RIR X; when you hit high for 2 sessions on the last set, increase load ~2–5% upper / ~5–10% lower.”
- **Do NOT** auto-schedule invented weekly %1RM jumps without measured/estimated 1RM — **HARD / gap-aware**.

**Optional LIVE FEEDBACK extensions (not required for full prescription):**
- **IF** last set reps ≥ target_high + 2 for 2 consecutive sessions **THEN** increase load 2–10% — ACSM/NSCA (**strongly/coaching**).
- **IF** user logs RPE and misses target by ≥1 RPE **THEN** adjust next load ~2% per 0.5 RPE (Helms application guidance) — **coaching practice / LIVE**.
- Density: **IF** goal = fat_loss **THEN** allow rest −15–30 s vs hypertrophy default as a **PARAMETER** secondary stressor, not instead of progressive overload — **HEURISTIC**.

**When to increase load vs reps vs sets (deterministic priority):**
1. **Reps first** within range (double progression) — default for unknown load.
2. **Load** when top of range cleared (2-for-2 / ACSM).
3. **Sets** on scheduled volume-ramp weeks only, and only if under MAV/cap.
4. **Stop progressing load** if form breakdown / pain flags (onboarding) or if week is consolidation — **HARD** safety.

### Gaps
- ACSM 2009’s 2–10% rule assumes training at a known RM load; consumer users often pick arbitrary dumbbells—double progression is the practical substitute but less formally graded.
- Exact “2% per 0.5 RPE” load tweaks are coaching applications of Helms, not ACSM position-stand numbers.
- Density progression lacks a meta-analytic prescription for 4-week RT blocks.

---

## How should effort change Weeks 1–4 (e.g. RIR 3→2→1→3)?

### Takeaway
A mild **effort ramp** (leave more reps in reserve early, push closer mid-late block) is a **reasonable coaching / engineering** pattern for prescribed plans, especially when volume is flat. It is **not** strongly mandated by trials. Hypertrophy tends to favor closer proximity to failure than strength; novices should avoid prescribed failure. A week-4 return to higher RIR is optional consolidation, not proven supercompensation.

### Cited Findings
- ACSM 2026: failure not required; ~**2–3 RIR** proposed as adequate effort; insufficient evidence for exact RIR targets. — [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- Robinson / Pelland et al. 2024 meta-regression: hypertrophy increased as estimated RIR decreased (closer to failure); **strength** showed **negligible** RIR relationship; authors caution RIR was **estimated from study descriptions** (exploratory). — [Sports Medicine 2024](https://link.springer.com/article/10.1007/s40279-024-02069-2); [PubMed 38970765](https://pubmed.ncbi.nlm.nih.gov/38970765/)
- Refalo et al. 2024: similar hypertrophy training to failure vs **1–2 RIR** in trained individuals; non-failure may improve fatigue resistance. — [Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021)
- Helms/Zourdos: RIR accuracy poorer in novices and farther from failure; practice needed before sole reliance on RIR. — [PMC 4961270](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)
- Prior PacerGo inference: mild intensity via RIR ~3 → ~1–2 across block when %1RM unknown. — [periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md)

### Inferences — prescribed RIR schedules (PARAMETER tables)

**Hypertrophy / fat_loss / general (working sets, last set emphasized):**

| Experience | W1 | W2 | W3 | W4 (progress) | W4 (consolidate) |
| --- | --- | --- | --- | --- | --- |
| True beginner | 3–4 | 3 | 2–3 | 2–3 | 3–4 |
| Basic | 3 | 2–3 | 2 | 1–2 | 3 |
| Intermediate+ | 2–3 | 2 | 1–2 | 1 | 2–3 |

**Strength goal:** keep compounds at **~2–4 RIR** all weeks (technique + fatigue management); accessories may follow hypertrophy table — **SOFT / reasonably supported** (RIR less critical for strength gains per Robinson).

Rules:
- **IF** experience = true_beginner **THEN** never prescribe 0 RIR / failure on compounds — **HARD / coaching + ACSM caution**.
- **IF** using `FLAT` volume **THEN** prefer RIR tightening across weeks as the primary progressive-effort lever — **SOFT / engineering heuristic**.
- **IF** using `FULL_RAMP` volume **THEN** keep RIR change ≤1 step/week (avoid stacking max volume + min RIR) — **SOFT / heuristic**.
- Pattern **3→2→1→3** is an acceptable **PARAMETER** for basic/intermediate hypertrophy with week-4 consolidation; it is **not** literature-mandated — label **coaching practice / automation assumption**.
- Pattern **3→2→1→1** (peak week 4) is acceptable when **no** deload/consolidation is scheduled — **HEURISTIC**.

### Gaps
- No trial validates a specific 4-week RIR staircase for consumer apps.
- ACSM explicitly says exact RIR targets are under-evidenced—treat tables as defaults, not physiology.

---

## Conditional vs always-on Week 4 deload: literature support; unjustified thresholds

### Takeaway
**Always-on hard Week-4 deload for every user is not justified** by current trials. Practitioner surveys support deloads about every **~4–8 weeks** lasting ~**5–7 days**, usually by cutting volume/effort while keeping frequency. For a **4-week** consumer block: **true beginners → no required deload**; **intermediate+ / high volume / deficit** → optional **mild** consolidation (volume and/or RIR), not mandatory training cessation. Do **not** invent readiness % cutoffs, HRV gates, or “if sets > X then deload” thresholds without live data.

### Cited Findings
- Coleman et al. 2024 (trained, high volume, 9 weeks): mid-block **1-week cessation** deload ≈ hypertrophy vs continuous; **continuous superior for strength**; authors suggest short studies may not need deloads; autoregulated deloads may beat forced ones when athletes don’t feel they need a break. — [PeerJ e16777](https://peerj.com/articles/16777/)
- Scientific Reports 2026 (untrained, within-subject): volume/frequency reductions at weeks 4 and 8 of an 8-week program **did not hinder** hypertrophy/strength-endurance vs continuous. — [Nature Scientific Reports](https://www.nature.com/articles/s41598-026-40612-5)
- Bell et al. Delphi consensus: deload = short reduced training stress; commonly every **4–6 weeks** for ~**7 days**; methods vary (↓ sets/reps, ↓ %1RM, ↑ RIR). — [Sports Medicine - Open 2023](https://link.springer.com/article/10.1186/s40798-023-00633-0)
- Bell et al. survey: athletes deload every **5.6 ± 2.3 weeks**, duration **6.4 ± 1.7 days**; typically ↓ volume and effort, frequency often unchanged; triggers include stalled performance, soreness, joint aches. — [Sports Medicine - Open 2024](https://link.springer.com/article/10.1186/s40798-024-00691-y)
- Bell practical review: pre-planned every **4–8 weeks** or reactive/autoregulated; some argue too-frequent deloads may blunt loading. — [SHU AM PDF](https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach%28AM%29.pdf)
- RP: deload toward **MV** when performance fails / after approaching MRV; beginners tolerate longer accumulation — [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)

### Inferences — Week 4 recovery logic (generation-time)

**Supported defaults:**
- **IF** experience = true_beginner **OR** weekly sets ≤ ~MEV **THEN** Week 4 = **progress or hold**, **no** mandatory deload — **SOFT / reasonably supported** (Coleman; RP beginner accumulation).
- **IF** experience ≥ intermediate **AND** curve ∈ {`FULL_RAMP`,`MILD_RAMP`} **AND** average weekly sets ≥ ~12–14 **THEN** optional Week 4 **mild consolidation**: sets × **0.5–0.7** **OR** RIR +1–2 vs Week 3, keep exercises/frequency — **SOFT / coaching practice** (survey/Delphi), **not** strongly outcome-superior.
- **IF** goal = strength **THEN** prefer **not** using full training cessation in Week 4 of a short block — **SOFT / reasonably supported** (Coleman strength finding).
- **IF** consolidating **THEN** reduce **volume and/or effort** first; keep split and primary exercises — **SOFT / coaching practice**.

**NOT justified (do not invent as HARD rules):**
- Always deload every user in Week 4 regardless of dose/experience.
- Specific invented cutoffs without logging: e.g. “IF HRV < X”, “IF soreness score > 7”, “IF missed reps ≥ 2 THEN auto-deload” at generation time.
- Claiming Week-4 deload **increases** hypertrophy vs continuous in ≤9-week blocks (Coleman found no hypertrophy advantage for cessation).
- Mandatory −50% volume + failure avoidance + exercise swaps all at once as “the” evidence-based deload protocol (practice varies).

**LIVE FEEDBACK extensions (optional later):**
- **IF** logged performance regresses 2 sessions **OR** persistent joint pain **THEN** insert recovery microcycle — survey-aligned **coaching practice**.

### Gaps
- Almost no RCTs on **reduced-volume** (not cessation) deloads inside **exactly 4-week** fully prescribed consumer plans.
- Survey/Delphi = practice prevalence, not proof of superior adaptations.

---

## Fatigue proxies usable at plan-generation vs only with live logging

### Takeaway
At generation time, only **static onboarding proxies** (experience, days/week, session length, goals, injury/age/BMI flags, optional self-rated recovery capacity / concurrent cardio / deficit) may scale volume, RIR, and whether Week 4 consolidates. Proxies that need **session logs, RPE history, soreness, sleep, wearables, bar velocity** cannot drive a fully prescribed plan—reserve them as optional adaptive overlays.

### Cited Findings
- RP weekly volume algorithm explicitly uses **prior-week soreness and performance** scores—live by definition. — [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- Helms/Zourdos: RIR/RPE autoregulation assumes in-session ratings; novices less accurate. — [PMC 4961270](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)
- Fitbod-style recovery windows / estimated strength from history are **LIVE FEEDBACK** architectures (prior PacerGo consumer-apps research). — [periodization / consumer apps notes](../Deterministic%20workout%20plan%20progression/periodization_rules.md); [Fitbod algorithm](https://fitbod.me/blog/fitbod-algorithm/)
- Bell survey: deload triggers = stalled performance, soreness, joint aches—observed during training, not at signup. — [Sports Medicine - Open 2024](https://link.springer.com/article/10.1186/s40798-024-00691-y)
- ACSM 2026 / NSCA themes: individualize for adherence, total stress, training status—status is an onboarding-compatible construct. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [NSCA frequency](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/)

### Inferences

**Usable at plan generation (static):**

| Proxy | How it may scale rules | Class |
| --- | --- | --- |
| Experience tier | Base `V` (MEV), sets/exercise, RIR floor, curve ID, deload optional | **SOFT / strongly supported direction** |
| Days/week | Split + redistribute weekly sets; not multiply dose | **HARD / reasonably supported** |
| Session minutes | Cut isolation/exercises before cutting recovery days | **HEURISTIC** |
| Goal | Rep range, RIR table, load vs volume emphasis (parameter deltas) | **SOFT** |
| Injury / age / BMI / low-impact flags | Exercise pool, warm-up, avoid failure, conservative `V` | **HARD / safety heuristic** |
| Self-reported concurrent cardio high / calorie deficit | Bias `V` toward lower MAV fraction; prefer `FLAT`/`MILD_RAMP` | **SOFT / coaching practice** (MRV↓ in deficit often claimed; not tightly quantified) |
| Prior training volume (self-report: none / some / a lot) | Choose MEV start; if “a lot” + intermediate → allow higher `V` | **HEURISTIC / automation assumption** |

**Requires live logging (cannot drive fully prescribed plan):**

| Proxy | Why |
| --- | --- |
| Session RPE / RIR accuracy checks | Needs performed sets |
| Reps completed vs target (2-for-2 auto load) | Needs logs |
| Soreness / readiness questionnaires | Temporal |
| Performance regression / e1RM trends | Needs history |
| Sleep, HRV, wearable recovery % | External sensors + interpretation |
| RP pump/soreness MEV scoring | Per-session |

Rules:
- **HARD / automation assumption:** Generation-time engine = `f(onboarding, week_index)` only.
- **SOFT:** Expose double-progression and RIR as **user instructions** so intensity progresses without server-side logs.
- **IF** product later adds logging **THEN** optional overlay may adjust load/deload; do not block v1 prescription on that data.

### Gaps
- No validated mapping from questionnaire answers → exact MEV integers; any mapping is an engineering table.
- Deficit × MRV interaction is coaching lore more than quantified RCT dose tables.

---

## Goal-specific progression differences (parameter deltas only)

### Takeaway
Keep the **same 4-week skeleton and progression machinery**; change **parameters** (weekly set target, rep range, RIR table, rest, whether volume ramps). Do **not** invent separate periodization philosophies per goal inside one month. Fat loss ≈ hypertrophy RT + possibly density; strength ≈ lower weekly accessory volume, heavier relative effort via lower reps / higher load priority, less failure; functional/general ≈ ACSM consistency defaults (~10 sets, 8–12, ~2–3 RIR).

### Cited Findings
- ACSM 2026 goal tuning: **strength** → heavier loads ~**≥80% 1RM**, **2–3 sets/exercise**; **hypertrophy** → ~**10 weekly sets/muscle**; **power** → **30–70% 1RM** moved quickly; failure/complex periodization not consistently needed. — [ACSM announcement](https://acsm.org/resistance-training-guidelines-update-2026/); [ACSM PDF](https://fit.com.my/wp-content/uploads/sites/2/2026/03/acsm-rt-2026.pdf)
- Robinson et al.: hypertrophy more sensitive to proximity-to-failure than strength. — [Sports Medicine 2024](https://link.springer.com/article/10.1007/s40279-024-02069-2)
- Pelland et al.: strength gains plateau earlier on weekly sets than hypertrophy—high set ramps less useful for pure strength. — [SportRxiv](https://sportrxiv.org/index.php/server/preprint/view/460/version/587%E2%81%A0)
- RP: during fat loss, MV-level volume can maintain muscle—implies not maximizing MAV→MRV while dieting. — [RP landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- Prior PacerGo synthesis: fat-loss RT progression ≈ hypertrophy; manage energy via cardio/steps separately. — [periodization_rules.md](../Deterministic%20workout%20plan%20progression/periodization_rules.md)

### Inferences — parameter delta table (not separate engines)

| Parameter | Hypertrophy | Fat loss | Strength | Functional / general |
| --- | --- | --- | --- | --- |
| Week-1 `V` (sets/muscle/wk) | MEV→~10–12 | MEV→~8–12 (≤ hypertrophy) | ~6–10 direct on primaries; accessories lower | ~8–12 (ACSM ~10 target) |
| Volume curve | `MILD_RAMP` or `FULL_RAMP` if intermediate+ | `FLAT` or `MILD_RAMP` | `FLAT` | `FLAT` / `MILD_RAMP` |
| Rep range | 8–12 (6–15 OK) | 8–15 | Primaries 3–6 or 5–8; accessories 6–12 | 8–12 |
| RIR emphasis | Closer mid-block (see table) | Similar to hypertrophy; avoid failure | Higher RIR on compounds (~2–4) | ~2–3 steady |
| Load progression priority | Double progression | Double progression | Prefer load bumps when reps hit top; optional smaller rep ranges | Double progression |
| Rest | 1–2 min hypertrophy | −15–30 s density optional | 2–3+ min compounds | 1–2 min |
| Week-4 consolidation | Optional if intermediate+ high `V` | Slightly more justified if deficit flag | Prefer hold/progress over cessation | Optional mild only |
| Evidence class for deltas | strongly/coaching mix | coaching + ACSM adherence | strongly supported load/set emphasis | strongly supported ACSM defaults |

Rules:
- **HARD:** Do not change goal mid-block (hypertrophy week → strength week → endurance week).
- **SOFT:** Fat_loss does **not** get a unique volume science—use hypertrophy engine with lower `V` bias and optional density **PARAMETER**.
- **SOFT:** Strength does **not** need weekly +sets; prioritize load/reps-in-range and practice frequency of main lifts.

### Gaps
- “Functional” is not a distinct adaptation in ACSM tables—map to general fitness / physical function defaults.
- Calorie-deficit volume penalties lack precise meta-analytic percentages for automatic planners.

---

## Consolidated IF→THEN rule sheet (generation-time)

Evidence classes abbreviated: SS = strongly supported, RS = reasonably supported, CP = coaching practice, EH = engineering heuristic, AA = automation assumption.

1. **HARD / SS:** `weekly_effective_sets[muscle]` is the primary dose; redistribute when days/minutes change; do not multiply session volume × days.
2. **HARD / AA:** Count only stimulative working sets (approx. 5–30 reps, challenging load, prescribed RIR band); exclude warm-ups.
3. **SOFT / SS+CP:** Map landmarks: MV≈4–6, MEV start≈6–12 by experience, useful zone≈10–20, consumer cap≈16–20; label RP MEV/MAV/MRV as **coaching framework**.
4. **SOFT / CP+EH:** Choose volume curve by experience/goal (`FLAT` default beginners; mild ramp OK for hypertrophy basic+).
5. **HARD / EH:** Never prescribe unconditional +sets every week past consumer cap or for true beginners as a requirement.
6. **SOFT / SS+CP:** Intensity without 1RM = rep range + RIR + double-progression / 2-for-2 instructions; load +2–10% when criteria met (**user- or logger-executed**).
7. **SOFT / CP+AA:** Optional RIR staircase (e.g. 3→2→1→2/3); beginners stay ≥2–3 RIR; no failure prescription for novices.
8. **SOFT / RS+CP:** Week-4 hard deload **not** always-on; optional mild consolidation for intermediate+/high volume/deficit; prefer ↓ sets and/or ↑ RIR, keep frequency/exercises.
9. **HARD / AA:** Generation uses only onboarding proxies; live fatigue metrics are optional extensions.
10. **SOFT / SS:** Goal differences = parameter deltas only (table above), same progression engine.

### Optional LIVE FEEDBACK extensions (out of scope for pure prescription)
- Auto-apply 2-for-2 / ACSM load bumps from logged reps.
- RP-style +1–3 sets/week from soreness/performance scores.
- Reactive deload when performance stalls or pain reported.
- RPE-error load corrections (~2% / 0.5 RPE).

---

## Cross-cutting gaps (report-writer)
- Exact integer tables for PacerGo onboarding → MEV are **engineering choices** informed by—but not dictated by—ACSM/Schoenfeld/RP.
- 4-week RCTs of consumer “app periodization” are scarce; most evidence is 6–12+ weeks or coaching practice.
- Fractional vs direct set accounting must be chosen and frozen for the product; both are defensible.
- Do not fabricate readiness thresholds, HRV gates, or muscle-specific MRV as if they were position-stand rules.
