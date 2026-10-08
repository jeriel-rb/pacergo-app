# Deterministic exercise selection, session construction, and plan validation (4-week block)

Research window: primary sources preferred 2009–2026 (ACSM/NSCA position literature, peer-reviewed hypertrophy/order/frequency papers, public consumer-app docs, open-source engines). PacerGo codebase inspected under `packages/shared/src/plan/` (local absolute paths as file URLs). Not medical advice. Does **not** invent exercises or full workouts.

Classification legend used in inferences:
- **Hard** — reject / filter / never emit if violated
- **Soft** — prefer / score / warn; allow if alternatives exhausted
- **Parameter** — user- or product-tunable (duration, variety, experience)
- **Heuristic** — practical coach convention with weak or mixed trial evidence

---

## What movement patterns and muscle groups must be covered for each goal/split?

### Takeaway
Guidelines require **all major muscle groups ≥2×/week** for healthy adults; consumer and open-source engines operationalize that via **split templates** (full body / UL / PPL) whose slots cover push, pull, squat/knee-dominant, hinge/hip-dominant, and usually a small accessory/core budget—not via inventing novel patterns per goal.

### Cited Findings
- ACSM 2026 overview messaging: train **all major muscle groups at least two days per week**; hypertrophy practical target ~**10 weekly sets per muscle group** — [ACSM Resistance Training Plan infographic](https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf); [ACSM Pronouncement PPT](https://www.acsm.org/wp-content/uploads/2026/03/Pronouncement-ppt-deck_resistance-training-ps.pdf); [PMC overview of reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/).
- ACSM 2009 progression models: novices ~**2–3 d/wk**, intermediates ~**3–4**, advanced ~**4–5**; hypertrophy programs use similar selection/frequency framing with multi-set emphasis — [PubMed ACSM 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/).
- Meta-analysis: training a muscle **≥2×/week** superior to **1×/week** for hypertrophy when volume-equated comparisons allow inference — [Schoenfeld et al. frequency meta-analysis abstract](https://reference.medscape.com/medline/abstract/27102172).
- Open-source `routine-engine` programs by **movement pattern slots** (e.g. “heavy horizontal push”), not muscle names; splits scale with days (2–3 → full body; splits “start paying off at four days”) — [sugarshaneaz/routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- Hevy Trainer default splits by frequency: 1–3 → Full Body; 4 → ULUL; 5 → PPL+UL; 6 → PPL×2 — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work).
- Hevy beginner PPL library example covers push (chest/shoulders/triceps), pull (back/biceps), legs (quads/hamstrings/glutes/calves) with compound + isolation mix — [Hevy Beginner PPL program](https://hevy.com/program/a6ee5477-9976-4b1e-af9f-ccb1d65725e3).
- Fitbod enforces split compatibility (no chest flies on leg day) and scores from recovery/equipment/experience — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/).
- PacerGo `FOCUS_MUSCLES` maps session focus → muscle tokens (push/pull/legs/upper/lower/full_body); no separate movement-pattern enum — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- PacerGo `recommendSplit` already encodes days×experience×goal×equipment×consecutive-days → split — [split-recommendation.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/split-recommendation.ts).

### Inferences
- **Hard coverage (weekly, all goals):** chest/pressing musculature, back/pulling, quads (knee-dominant), hamstrings/glutes (hip-dominant), delts (or vertical press + lateral/rear work), and arms as accessories unless time-starved; calves/core soft-required for full programs, droppable under ≤30 min / lack-of-time.
- **Per-split slot coverage (hard template):**
  - Full body: ≥1 horizontal or vertical push, ≥1 pull, ≥1 squat/knee, ≥1 hinge/hip (or RDL/bridge family), optional isolation/core.
  - Upper: ≥1 press + ≥1 pull (+ optional vertical press/pull and arm isolation).
  - Lower / Legs: ≥1 knee-dominant + ≥1 hip-dominant + optional calf/adductor.
  - Push / Pull / Legs: as industry PPL (Hevy example), not bodybuilding “chest only.”
- Goal changes **dose and reps**, not which major patterns exist: fat-loss may raise reps / keep full-body at 3 days (PacerGo already); muscle-gain may prefer PPL at 3+ days when not “simple.”
- PacerGo currently covers via **primary muscle token round-robin** (`pickMain`), not explicit pattern ontology — a gap vs `routine-engine` / performance-agent ontologies.

### Gaps
- ACSM/NSCA do not publish a normative “must include these 6 patterns every week” checklist with reject rules; coverage is practice-engineered from templates.
- No peer-reviewed standard ratio of vertical vs horizontal push/pull for general consumers.

---

## Compound:isolation ratios and exercise order norms (evidence vs practice)?

### Takeaway
**Practice (NSCA/ACSM coaching):** multi-joint / large / power before single-joint / small. **Evidence:** strength gains favor exercises placed early; hypertrophy is largely order-insensitive in meta-analysis, though combining MJ+SJ can improve regional completeness. There is **no validated fixed compound:isolation ratio**—engines use “1 pattern lead + isolations after” heuristics.

### Cited Findings
- NSCA-style order: power → core (multi-joint) → assistance (isolation); also multi-joint before single-joint / large before small; push–pull and upper–lower alternation as arrangement options — [NSCA TSAC module PDF](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf); [NSCA CPT chapter summary (secondary)](https://www.ptpioneer.com/personal-training/certifications/nsca-cpt/nsca-cpt-chapter-15/).
- Exercise-order meta-analysis: strength largest in exercises performed **first**; **no significant EO effect on hypertrophy** overall — [Nunes et al. 2020 PubMed](https://pubmed.ncbi.nlm.nih.gov/32077380/).
- MJ+SJ combination study: hypertrophy of all triceps heads only when MJ and SJ combined; order can matter for which region grows as agonist early — [JSCR MJ/SJ order paper](https://journals.lww.com/nsca-jscr/fulltext/2020/05000/varying_the_order_of_combinations_of_single__and.8.aspx).
- ACSM 2026 summary tables list exercise order “beginning of training session” as relevant for **strength** adaptation enhancement — [ACSM Pronouncement PPT](https://www.acsm.org/wp-content/uploads/2026/03/Pronouncement-ppt-deck_resistance-training-ps.pdf).
- PacerGo: role order pattern → isolation → skill in ranking; within a muscle, after the lead compound, isolations before extra compounds (“not two presses”); front raises deprioritized as redundant with presses — [exercise-fit.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-fit.ts); [exercise-meta.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-meta.ts); [generate-plan.ts `pickMain`](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- Isolation gets higher rep ranges than compounds in PacerGo — [exercise-meta.ts `repsForExercise`](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-meta.ts).

### Inferences
- **Hard (session order):** compounds / pattern roles before isolations for the same session; timed holds/core after main strength work when present.
- **Soft ratio heuristic (not evidence-mandated):** ~**60–80% of main slots compounds** for general/strength; hypertrophy sessions may allow more SJ accessories once MJ coverage exists. Reject only when a session has **zero** multi-joint pattern for a focus that requires one (e.g. push day with only flyes/lateral raises).
- **Soft:** prefer one lead pattern per major muscle family before stacking a second compound of the same family (PacerGo already reorders isolations ahead of second compounds).
- Strength goals: place priority compounds first (**evidence-supported**). Hypertrophy goals: same order is fine for UX/fatigue; order is not a hard hypertrophy reject.

### Gaps
- No ACSM/NSCA numeric compound:isolation ratio (e.g. 2:1) in primary sources reviewed.
- PacerGo has no machine-readable `compound` flag—only slug allowlists (`ISOLATION_SLUGS`).

---

## Should exercises stay fixed across all 4 weeks (for overload visibility) or rotate?

### Takeaway
For a **deterministic 4-week consumer block**, keep **core exercises fixed** (Hevy “Consistent” / coach-template apps / `routine-engine` 4-week hold). Systematic variety helps **regional** hypertrophy but should land at **block boundaries (≈4–12 weeks)**, not random weekly remixes; excessive variation can hinder adaptations.

### Cited Findings
- Kassiano/Schoenfeld systematic review: systematic variation can enhance regional hypertrophy and strength; **redundant or excessive/high-frequency rotation may hinder** adaptations — [PubMed 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/); [JSCR full text (mirrored fetch)](https://journals.lww.com/nsca-jscr/Fulltext/2022/06000/Does_Varying_Resistance_Exercises_Promote_Superior.40.aspx).
- NSCA PTQ: variety matters for regional growth, but changing exercises/techniques **weekly is not ideal** for progressive overload; alter variables between blocks every **4–12 weeks** — [NSCA PTQ 9.1 PDF](https://www.nsca.com/contentassets/dbfde28fefcd4d438039109fe8f68172/ptq-9.1.1-building-a-balanced-and-symmetrical-physique-is-regional-hypertrophy-possible.pdf).
- PLOS One: fixed vs randomly varied-per-session selection in trained men—motivation/adaptation nuances; “muscle confusion” frequent rotation not clearly superior — [PLOS One 2020](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0226989).
- Varied vs constant exercises in young women (10 weeks): similar hypertrophy and strength — [Kassiano et al. summary via Exa library](https://exa.ai/library/publication/qbv6q5s3dpp).
- `routine-engine`: “Exercises rotate per **four-week block**, not weekly”; weekly rotation makes overload “impossible to see” — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- Hevy Trainer Program Variety: **Consistent** = same exercises; **Balanced** ≈ change after **6 weeks** (default); **Variable** = weekly changes — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [Hevy Trainer product page](https://www.hevyapp.com/features/workout-plan-generator/).
- Peloton / Ladder / Caliber-style products: programmatic days with progressive load/reps/volume across multi-week blocks — summarized with URLs in prior PacerGo notes — [consumer_apps_progression.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/research_notes/Deterministic%20workout%20plan%20progression/consumer_apps_progression.md); [report synthesis](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/reports/Deterministic%20workout%20plan%20progression.md).
- Fitbod may reshuffle exercises session-to-session from recovery scoring (adaptive, not fixed-block) — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/).
- PacerGo variety parameter: `fixed` / `balanced` (staple + rotate accessories) / `dynamic` (rotate all) with deterministic week shift — [generate-plan.ts `pickMain`](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts). Default variety is `balanced`.

### Inferences
- **Align with 4-week fixed-exercise-block:** default PacerGo to **`fixed` or staple-only `balanced`** for compounds; accessories may rotate only if product wants novelty without breaking overload on leads.
- Treat **Variable / dynamic weekly compound rotation** as opt-in anti-boredom, not evidence-default.
- Between plans (after ≥4–6 weeks), allow systematic pattern-preserving swaps (incline vs flat, different row) for regional coverage.

### Gaps
- No public Fitbod statistic for week-to-week exercise identity stability under default settings.
- Direct RCTs comparing “same exercises 4 weeks” vs “new accessories each week” with consumer adherence outcomes are sparse.

---

## How to map days/week + experience → split (full body, UL, PPL, etc.) deterministically?

### Takeaway
Industry and PacerGo converge on a **frequency-first table**, with experience/equipment/session-length forcing “simpler” splits (more full-body / UL, less body-part). Consecutive same-muscle days are a first-class constraint.

### Cited Findings
- Hevy Trainer defaults (authoritative public table): 1–3 FB; 4 UL; 5 PPL+UL; 6 PPL×2; plus compatibility matrix (e.g. PPL only 3 or 6 days) — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work).
- NSCA frequency teaching: beginner **2–3×/wk**; intermediate **3×** full body or **4×** split; advanced **4–6×** with split (e.g. 3 on / 1 off) — [NSCA TSAC module PDF](https://www.nsca.com/contentassets/53f36e5db26a4729b251fb794c166af1/tsac-module-4.0--4.5.pdf).
- `routine-engine`: 2–3 days → full body every session; splits start paying off at **4 days** — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- PacerGo `recommendSplit` (already deterministic):
  - ≤2 → `full_body`
  - 3 → `full_body` default; `push_pull_legs` if trained + muscle goal (and not “simple”); if **≥3 consecutive training days** → UL (simple) or PPL (not simple)
  - 4 → `upper_lower` (or `ppl_upper` if advanced + muscle + not simple)
  - 5 → UL if simple else `ppl_upper_lower`
  - 6–7 → UL if simple else PPL (sequence repeats)
  - `simple` = novice OR limited loading equipment OR ≤30 min sessions
  — [split-recommendation.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/split-recommendation.ts).
- Prior PacerGo progression report endorses Hevy-like frequency→split as ready deterministic table — [Deterministic workout plan progression.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/reports/Deterministic%20workout%20plan%20progression.md).

### Inferences
- **Hard mapping table (recommended product default, close to Hevy + PacerGo):**

  | Days/week | Novice / limited eq / short | Trained hypertrophy |
  |---|---|---|
  | 1–2 | Full body | Full body |
  | 3 | Full body (or UL if consecutive days) | PPL if non-consecutive; else PPL/UL to avoid FB×3 consecutive |
  | 4 | Upper/Lower | Upper/Lower (advanced optional PPL+Upper) |
  | 5 | Upper/Lower | PPL + Upper/Lower |
  | 6 | Upper/Lower or PPL×2 if equipment allows | PPL×2 |

- Tie-breakers (deterministic): prefer fewer focus types when equipment loading count &lt; 2; prefer non-repeating full-body on consecutive calendar days; user override of split is a **parameter** but must stay frequency-compatible (Hevy pattern).

### Gaps
- No single ACSM table that names “PPL” vs “UL”; those are industry templates mapped onto frequency guidance.
- Optimal split for fat-loss vs muscle at identical frequency is under-specified beyond PacerGo’s “keep 3-day fat-loss on full body” heuristic.

---

## Substitution rules when equipment missing or exercise excluded (QA)?

### Takeaway
Best practice is **slot-preserving substitution**: same movement pattern (or same primary muscle + role), next stability/equipment rung, never invent exercises; if unfillable, drop slot or substitute a **paired** pattern—except hinges/squats which should not fake-substitute. QA excludes are hard filters.

### Cited Findings
- `routine-engine`: when a slot cannot fill, try **paired pattern** (press↔press, pull↔pull); **nothing substitutes for squat or hinge**; empty `instructions` never programmed; difficulty is a **hard filter** — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- Performance-agent: deterministic scored ranking with equipment feasibility, contraindication hard-gate, stimulus-equivalence substitution — [Performance-agent README](https://github.com/clementrx/Performance-agent/blob/main/README.md).
- Hevy Trainer: Replace Exercise offers alternatives; permanent vs session-only; Excluded Exercises list; equipment setting gates selection — [Hevy Trainer product](https://www.hevyapp.com/features/workout-plan-generator/); [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work).
- Future: Flag replaces exercise via human coach (not auto ladder) — cited in [consumer_apps_progression.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/research_notes/Deterministic%20workout%20plan%20progression/consumer_apps_progression.md).
- Fitbod: only equipment-selected exercises; swaps teach the selector — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/).
- PacerGo hard gates: `isAiEligible` (QA exclude, muscles, instructions, illustration); equipment ANY-ONE match; `restrictToLevel` climbs stability rung only when muscle has no home-rung option; staples provide deterministic leads — [exercise-qa.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-qa.ts); [exercise-fit.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-fit.ts); [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- Current QA excludes (examples): wrist-curl, wrist-extension, toe-touch, torso-twist-stretch, spider-curl, lying-hamstring-walkout, dip, neutral-grip-pull-up — [exercise-qa.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-qa.ts).
- Stretch cooldown substitutions are separate: only `STRETCH_LIBRARY` slugs; never strength moves as stretches — [stretch-library.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/stretch-library.ts); [CLAUDE.md notes](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/CLAUDE.md).

### Inferences
- **Hard substitution chain (deterministic tie-breakers):**
  1. Same pattern slot / same `canonMuscle` + same `exerciseRole` (pattern vs isolation).
  2. Filter: AI-eligible, equipment available, experience/skill allowed, not excluded muscle, not high-impact if low-impact mode.
  3. Rank: staple list → stability preference for level → slug lexicographic.
  4. If empty: climb one stability rung (PacerGo) **or** paired pattern for push/pull (`routine-engine`).
  5. If still empty: **drop slot** (shorten session) rather than invent; mark `substituted` if pattern-paired.
- **Hard:** QA_EXCLUDED and `hasInstructions/hasIllustration === false` never enter generation pool (browsable OK).
- **Soft:** popularity / “recognisable movement” nudge (routine-engine `popularityRank`) after hard filters.

### Gaps
- PacerGo lacks explicit movement-pattern IDs, so substitutions are muscle-token + role based—not true pattern equivalence (incline press vs flat press both “chest pattern”).
- No published PacerGo validator that fails generation when a required slot is empty.

---

## Avoiding redundant exercises and balancing opposing patterns?

### Takeaway
Avoid **redundant mechanical stimuli** in the same session (two flat barbell presses); balance **push↔pull** and **knee↔hinge** across the week. Evidence supports planned non-redundant variety for regional growth; coach practice treats agonist–antagonist balance as injury/posture hygiene more than a quantified RCT endpoint.

### Cited Findings
- Kassiano/Schoenfeld review: exercise variation that provides a **redundant stimulus** does not optimize hypertrophy; vary by biomechanics/regions, not random swaps — [PubMed 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/).
- Regional hypertrophy: different MJ/SJ and joint positions hit different sites; same-exercise-only programs may miss sites — [NSCA PTQ 9.1](https://www.nsca.com/contentassets/dbfde28fefcd4d438039109fe8f68172/ptq-9.1.1-building-a-balanced-and-symmetrical-physique-is-regional-hypertrophy-possible.pdf); [academia copy of non-homogeneous hypertrophy study](https://www.academia.edu/51607742/Does_performing_different_resistance_exercises_induce_non_homogeneous_hypertrophy).
- NSCA arrangement options include alternating push/pull — [NSCA CPT chapter summary](https://www.ptpioneer.com/personal-training/certifications/nsca-cpt/nsca-cpt-chapter-15/).
- Facility/programming guidance (secondary): match pushing with pulling and extension with flexion — [Skelcore agonist/antagonist guide](https://www.skelcore.com/guides/agonist-vs-antagonist-muscles) (trade content; treat as practice, not trial evidence).
- PacerGo anti-redundancy heuristics: chest region collapsed (`upper_chest`/`lower_chest` → one family); after lead lift, isolations before second compounds; `LOW_PRIORITY_ISOLATION_SLUGS` demotes front raises; round-robin across muscles so one muscle does not monopolize slots — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- `routine-engine` dirty-data rules: force/mechanic separate presses from rear-delt rows; isolation must not fill press slots; hinge must be real hinge not core kick — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).

### Inferences
- **Hard (session):** ≤1 exercise from the same **redundancy class** (suggested classes: flat horizontal press, incline/vertical press, horizontal pull, vertical pull, knee squat/lunge, hip hinge, elbow flexion, elbow extension, calf raise). Second slot for a class only if first is pattern and second is isolation **or** explicitly different angle (incline after flat) under hypertrophy goals.
- **Hard (week, full-body / UL / PPL templates):** count of horizontal+vertical **pull pattern slots ≥ press pattern slots − 1** (allow slight press bias, forbid extreme press-only weeks).
- **Hard (lower):** ≥1 knee-dominant and ≥1 hip-dominant pattern per legs/lower session when catalogue allows; if only one exists, soft-warn / still emit.
- **Soft:** rear-delt / upper-back work when pressing volume is high; don’t stack two barbell axial-loading hinges same day for novices.

### Gaps
- No peer-reviewed numeric “push:pull set ratio must be 1:1” for general fitness—ratios are coach heuristics.
- PacerGo has no redundancy-class tagging; two flat presses could still appear if both outrank isolations after top-up logic.

---

## Recovery between sessions (same muscle frequency spacing) — hard vs soft?

### Takeaway
**≈48 h** between hard sessions for the same muscle is the dominant performance/recovery heuristic (Fitbod cites 48–72 h); **&lt;24 h** same-muscle hard sessions should be hard-avoided in template design. Consecutive training days are acceptable when splits partition muscles (PPL/UL) or when volume per day is low; weekly frequency **≥2×/muscle** remains the adaptation target.

### Cited Findings
- Fitbod: prioritizes muscles not heavily trained in last **48–72 hours**; cites recovery principle — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/).
- Trained men, upper-body RT: **24 h** between identical hard sessions reduced repetition performance vs **48/72 h** — [Miranda et al. JSCR 2018](https://journals.lww.com/nsca-jscr/fulltext/2018/12000/repetition_performance_and_blood_lactate_responses.6.aspx).
- 10RM test-retest: rest **&lt;48 h** insufficient; 48–72 h preserved loads — [PMC 6719818](https://pmc.ncbi.nlm.nih.gov/articles/PMC6719818/).
- Consecutive vs non-consecutive 3×/week RT: both can improve outcomes (design-dependent); consecutive is not universally forbidden — [Frontiers 2018](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00725/full).
- Frequency meta: ~**2×/week per muscle** better than 1× for hypertrophy — [Schoenfeld frequency abstract](https://reference.medscape.com/medline/abstract/27102172).
- PacerGo: if ≥3 consecutive training days, avoid repeating full-body back-to-back (forces UL or PPL) — [split-recommendation.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/split-recommendation.ts).

### Inferences
- **Hard:** do not schedule two **same-focus** high-overlap sessions on consecutive calendar days when both are full_body (PacerGo already). Extend: reject plan if any major muscle’s two hardest exposures are on consecutive days **and** both sessions prescribe ≥MEV-local volume for that muscle without split partitioning.
- **Soft:** prefer ≥48 h between heavy sessions for the same primary movers; allow consecutive days for PPL/UL because overlap is limited.
- **Soft:** advanced PPL×2 may hit muscles on consecutive calendar days with lower per-session volume—monitor as soft warning, not auto-reject.
- Live recovery % (Fitbod/wearables) is **out of scope** for pure generation-time determinism.

### Gaps
- Exact hours of recovery vary by volume, proximity to failure, and training age; 48 h is a rule of thumb, not a physiological constant.
- No PacerGo post-generation validator currently scores inter-session muscle spacing beyond split choice.

---

## Validation constraints that must reject an invalid plan?

### Takeaway
A validator should **hard-reject** plans that break eligibility, equipment, impossible prescriptions, empty required coverage, duration impossibility, duplicate main-slot identity, and unsafe experience/skill gates. Volume/fatigue/progression issues are mostly **soft warnings** unless they violate published product caps.

### Cited Findings
- `routine-engine` tests assert uniqueness, correct prescription, heavy work present, and graceful slot drop when catalogue thin; never program without instructions — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- Caudex engine markets structured **validation issues**, deterministic recommendations, and explanations (host-owned snapshots) — [caudex-workout/engine](https://github.com/caudex-workout/engine).
- PacerGo generation filters: QA/eligibility, equipment, experience skills, low-impact regex, excluded muscles, duration→`mainExerciseCount` (3–6, ≤4 if lack_of_time) — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts); [exercise-meta.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-meta.ts).
- Timed exercises must not receive meaningless hypertrophy rep schemes — PacerGo maps `TIMED_SLUGS` → “30-45 sec” — [exercise-meta.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-meta.ts).
- ACSM sustainability: programs too demanding to maintain lose effectiveness — cited in [periodization_rules.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/research_notes/Deterministic%20workout%20plan%20progression/periodization_rules.md) → [ACSM 2026 announcement](https://acsm.org/resistance-training-guidelines-update-2026/).

### Inferences — proposed reject matrix

| Check | Severity | Reject when |
|---|---|---|
| Eligibility | **Hard** | Any main/warmup/cooldown slug in `QA_EXCLUDED`, missing muscles, or explicit no-instructions/no-illustration |
| Equipment | **Hard** | Exercise requires equipment ids with empty intersection with user set (bodyweight-only ok if `equipment=[]`) |
| Experience/skill | **Hard** | Novice plan contains `ADVANCED_SKILL_SLUGS` or tier-3 when pool had tier-1/2 alternatives (if no alternatives, soft-allow only up to `DIFFICULTY_LIMITS.max`) |
| Duplicates | **Hard** | Same slug appears twice in one session main block |
| Redundancy class | **Hard/Soft** | Two same-class compounds in one session → hard; two same-class isolations → soft |
| Coverage | **Hard** | Weekly major-muscle frequency &lt; 2 for non-excluded groups **or** a focus session missing all required pattern slots when catalogue had eligible fills |
| Opposing balance | **Soft→Hard** | Weekly press patterns ≫ pull by ≥2 slots with pull alternatives available → hard; else soft |
| Duration feasibility | **Hard** | Estimated session minutes ≫ `durationMin` + tolerance (e.g. &gt;120%): use sets×(rep-time + rest) + warmup/cooldown; or main count inconsistent with `mainExerciseCount` rule |
| Prescription sanity | **Hard** | Timed slug with pure rep scheme; sets &lt; 1; empty reps; isolation prescribed as 1–3RM strength scheme for novices |
| Progression (4-week) | **Soft** | Weeks change compounds under `variety=fixed`; hard only if product promises fixed and output differs |
| Load | **Hard** (if loads emitted) | Load &gt; plausible equipment max / &lt; 0 / %1RM outside goal band; **N/A** if PacerGo emits no loads |
| Local volume / fatigue | **Soft** | Weekly sets/muscle ≫ ~20 for general consumer without advanced flag; same-muscle hard sessions &lt;24 h apart |
| Cooldown purity | **Hard** | Cooldown contains non-`STRETCH_LIBRARY` strength moves |
| Determinism | **Hard** | Same fingerprint inputs yield different plan (CI property) |

### Gaps
- PacerGo has **no separate post-`generateTrainingPlan` validation module** today—constraints are mostly inline filters.
- No shared estimated-duration function in-repo comparable to `routine-engine`’s `estimatedMinutes` (PacerGo uses slot-count heuristics only).

---

## Hard vs soft vs parameter vs heuristic for each major rule?

### Takeaway
Encode **safety, eligibility, equipment, and split/recovery structure** as hard rules; encode **ratios, accessory balance, and novelty** as soft scores; expose **duration, variety, experience, goal, exclusions** as parameters; treat **compound:isolation percentages and exact push:pull ratios** as heuristics unless a hard floor is hit.

### Cited Findings
- Difficulty-as-filter lesson from `routine-engine` (penalties failed; ceilings must remove candidates) — [routine-engine README](https://github.com/sugarshaneaz/routine-engine).
- Hevy exposes Variety / Duration / Frequency / Goal / Equipment / Excluded / Injuries as settings (parameters) — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work).
- Exercise-order hypertrophy null effect → order as practice heuristic for hypertrophy, harder for strength priority — [Nunes et al. 2020](https://pubmed.ncbi.nlm.nih.gov/32077380/).
- PacerGo already mixes hard filters (`isAiEligible`, equipment, skills) with scoring (`experienceFit`, staples) and parameters (`variety`, `durationMin`, experience) — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts); [exercise-fit.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-fit.ts).

### Inferences — classification table

| Rule | Class |
|---|---|
| QA / instructions / illustration eligibility | **Hard** |
| Equipment availability | **Hard** |
| Advanced skill blocked for novices | **Hard** |
| Low-impact exclusions when injury/age/BMI flags | **Hard** (product policy) |
| Excluded muscles (user) | **Parameter → Hard filter** |
| Days/week → split default | **Hard table** with **Parameter** override if compatible |
| Consecutive full-body avoidance | **Hard** |
| ≥2×/week major muscle coverage | **Hard** (soft only if user excluded that muscle) |
| Compound before isolation order | **Hard** for strength priority compounds; **Heuristic/soft** for pure hypertrophy accessories |
| Compound:isolation ratio ~2:1 | **Heuristic** |
| Fixed exercises across 4 weeks | **Hard default**; **Parameter** (`variety`) |
| Pattern-preserving substitution chain | **Hard process** |
| Squat/hinge non-substitution with unrelated patterns | **Hard** (`routine-engine`) |
| Redundant same-class compounds | **Hard** |
| Push/pull weekly balance | **Soft** with **Hard** floor when alternatives exist |
| 48 h same-muscle spacing | **Soft** (split design); **Hard** if same focus consecutive FB |
| Duration → exercise count | **Parameter** driving **Hard** count bounds |
| Weekly set caps (~10 target, ~20 soft max) | **Heuristic/soft** (ACSM ~10; literature diminishing returns) |
| Staple lists / popularity | **Heuristic** tie-breakers after hard filters |
| Seeded PRNG among equals | **Avoid** for PacerGo (prefer slug/staple total order); `routine-engine` uses seed for multi-athlete differentiation |

### Gaps
- Product still needs an explicit written “severity” column in code/docs; today severity is implicit in filter vs sort.

---

## Evidence audit for selection heuristics?

### Takeaway
**Stronger evidence:** weekly frequency ≥2/muscle, progressive overload on repeated lifts, MJ-before-SJ for strength performance, avoid &lt;24–48 h before repeating identical hard upper-body sessions. **Weaker / mixed:** fixed compound:isolation ratios, mandatory weekly exercise rotation, strict push:pull ratios, order for hypertrophy. **Engineering-strong but not RCT-proven:** pattern-slot programming, staple ladders, QA gates, 4-week freeze for overload visibility.

### Cited Findings
| Heuristic | Evidence grade | Sources |
|---|---|---|
| Train each major muscle ≥2×/wk | **Strong** (guideline + meta) | [ACSM 2026 materials](https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf); [Schoenfeld frequency](https://reference.medscape.com/medline/abstract/27102172) |
| ~10 sets/muscle/week hypertrophy target | **Moderate** (guideline synthesis) | [ACSM PPT](https://www.acsm.org/wp-content/uploads/2026/03/Pronouncement-ppt-deck_resistance-training-ps.pdf) |
| Exercise order affects strength more than hypertrophy | **Moderate** (meta) | [Nunes 2020](https://pubmed.ncbi.nlm.nih.gov/32077380/) |
| MJ+SJ combo helps regional completeness | **Limited-moderate** (small trials) | [JSCR 2020](https://journals.lww.com/nsca-jscr/fulltext/2020/05000/varying_the_order_of_combinations_of_single__and.8.aspx); [NSCA PTQ](https://www.nsca.com/contentassets/dbfde28fefcd4d438039109fe8f68172/ptq-9.1.1-building-a-balanced-and-symmetrical-physique-is-regional-hypertrophy-possible.pdf) |
| Systematic variety &gt; random weekly remix | **Moderate** (review) | [Kassiano 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/) |
| Keep exercises fixed ~4–12 weeks for overload | **Practice-strong / evidence-aligned** | [NSCA PTQ](https://www.nsca.com/contentassets/dbfde28fefcd4d438039109fe8f68172/ptq-9.1.1-building-a-balanced-and-symmetrical-physique-is-regional-hypertrophy-possible.pdf); [Hevy Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [routine-engine](https://github.com/sugarshaneaz/routine-engine) |
| 48–72 h recovery before hard same-muscle work | **Moderate** (acute performance studies + app practice) | [Miranda 2018](https://journals.lww.com/nsca-jscr/fulltext/2018/12000/repetition_performance_and_blood_lactate_responses.6.aspx); [Fitbod](https://fitbod.me/blog/fitbod-algorithm/) |
| Exact push:pull set ratio | **Weak** (coach heuristic) | Secondary trade guidance only ([Skelcore](https://www.skelcore.com/guides/agonist-vs-antagonist-muscles)) |
| Fixed 2:1 compound:isolation | **Weak** | Not found in ACSM/NSCA primary tables reviewed |
| Frequency→FB/UL/PPL tables | **Practice-strong** | [Hevy](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [PacerGo split-recommendation.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/split-recommendation.ts) |
| Seeded random among eligible exercises | **Engineering** (reproducible but not “no-random product” if seed differs) | [routine-engine](https://github.com/sugarshaneaz/routine-engine) vs PacerGo slug total order |

### Inferences
- Prefer citing **guidelines + metas** for hard rejects; keep coach ratios as soft scores.
- PacerGo should not claim “science-mandated PPL” — claim “deterministic template consistent with frequency guidelines and consumer engines.”

### Gaps
- ACSM 2026 full position-stand PDF paywall/HTML truncation limited extraction of every exercise-order sentence; PPT/infographic + PMC overview used.
- Few open-source engines document peer-reviewed validation of their scoring weights (Performance-agent claims research grounding; weights not audited here).

---

## PacerGo codebase constraints (existing selection / validation)

### Takeaway
PacerGo already implements a **deterministic 4-week composer** with eligibility gates, equipment filters, experience-ranked pools, muscle round-robin selection, split recommendation, variety modes, duration-based exercise counts, low-impact mode, and stretch-only cooldowns—but **lacks** an explicit movement-pattern ontology, redundancy-class validator, duration estimator, and post-plan reject suite.

### Cited Findings
- `PLAN_RULES_VERSION = 10`; `WEEKS_PER_PLAN = 4`; pure function `generateTrainingPlan` — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- `QA_EXCLUDED_EXERCISES` + `isAiEligible` hard gate before selection — [exercise-qa.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-qa.ts).
- Roles: `pattern` | `isolation` | `skill`; modality/stability ladders; staples per level; `restrictToLevel` / `compareForLevel` — [exercise-fit.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-fit.ts).
- Isolation slug allowlist + low-priority front raises; timed vs rep prescriptions; difficulty tiers 1–3 — [exercise-meta.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/exercise-meta.ts).
- `pickMain`: round-robin by muscle, chest canon, isolation-before-second-compound, variety rotation — [generate-plan.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/generate-plan.ts).
- `recommendSplit` frequency/experience/equipment/consecutive/short-session logic — [split-recommendation.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/split-recommendation.ts).
- Cooldowns: real stretches only from `STRETCH_LIBRARY`, greedy coverage, ≤1 per region — [stretch-library.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/stretch-library.ts); agent notes in [CLAUDE.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/CLAUDE.md).
- Legacy beta composer (`plan-composer.ts`) uses fixed location/goal exercise blocks for 4 weeks with no week variation — [plan-composer.ts](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/packages/shared/src/plan/plan-composer.ts).
- Prior research already recommends freezing skeleton and progressing dose — [reports/Deterministic workout plan progression.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/reports/Deterministic%20workout%20plan%20progression.md); [consumer_apps_progression.md](file:///Users/mariajose/Documents/Roy%20Projects/pacergo-app/research_notes/Deterministic%20workout%20plan%20progression/consumer_apps_progression.md).

### Inferences
- Highest-ROI validation additions (without inventing exercises): redundancy-class tags, weekly coverage assert, estimated minutes, empty-slot handling, and defaulting variety toward **fixed compounds for 4 weeks**.
- Movement-pattern layer (horizontal push, vertical pull, squat, hinge…) would align PacerGo with `routine-engine` / Performance-agent and make substitutions/balance checks crisp—map patterns onto existing slugs, do not create new exercises.

### Gaps
- No in-repo enum named `MovementPattern` today.
- Equipment column still optional on older rows (fallback to `equipmentSettings` + gym type).
- Progression validation (week-to-week set deltas vs obstacle exceptions) is not asserted by a dedicated validator.
