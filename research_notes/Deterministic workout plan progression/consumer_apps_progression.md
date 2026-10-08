# Consumer fitness apps — week-to-week progressive training (deterministic-friendly patterns)

Research window: sources preferred 2022–2026; older material flagged inline. Focus: public product docs, help centers, company blogs, and credible reviews. Not medical advice.

**Scope note for Pacergo:** Pure 4-week plan generation (same inputs → same plan) can reuse *templates, ladders, experience gates, and pre-scheduled volume/complexity ramps*. Anything that needs logged sets, RiR, Max Effort days, or coach messaging is marked **LIVE FEEDBACK** and is out of scope for generation-time logic.

---

## How do apps structure multi-week progression?

### Takeaway
Consumer apps cluster into three models: (1) **session-adaptive algorithms** that rebuild each workout from recovery + logged performance (Fitbod), (2) **fixed coach/instructor blocks** of ~4–6 weeks that pre-schedule load/volume/complexity (Ladder, Peloton Strength collections, Caliber plans, modern NTC programs), and (3) **journey/AI-coach cycles** that combine assessment weeks, building weeks, peak/challenge weeks, and deloads (Freeletics). Deterministic composers map cleanest onto model (2) plus Freeletics-style *pre-written* complexity ladders.

### Cited Findings
- Fitbod does **not** publish a fixed 4-week mesocycle; each workout is generated from My Plan settings plus logged history, with exercise selection scored by muscle recovery (48–72h cited) and sets/reps/weight from an Estimated Strength / 1RM model, mStrength™ intensity variation, Max Effort Days, and optional RiR — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/) (published 2022-08-05, updated through 2026); [How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout) (help updated 2026-09).
- Fitbod help states recommendations use a modified Prilepin approach on a theoretical 1RM (modified Brzycki), plus **non-linear periodization** that varies intensity/volume across workouts rather than repeating the same scheme every session — [How Fitbod Recommends Sets, Reps, and Weight](https://fitbod.zendesk.com/hc/en-us/articles/360004460633-How-Fitbod-Recommends-Sets-Reps-and-Weight).
- Freeletics Training Journeys are multi-week goal-specific plans; beginner “Get Started” journeys are often **6 weeks / 18 sessions** (Start Strong/Smart, Fit For Life); many goal journeys are longer (**48 sessions**). The Coach aims to gradually raise intensity and chase PBs via technique work, intervals, and God workouts — [Bodyweight Training Journeys](https://help.freeletics.com/hc/en-us/articles/360008600540-Bodyweight-Training-Journeys).
- Freeletics marketing describes periodized cycles (build → lighter recovery), assessment early on, and week-over-week changes to volume, rest, and movement complexity; a simplified Weeks 1–4 squat example progresses bodyweight squat → more reps/shorter rest → squat jump → Bulgarian split squat — [Best App for Progressive Overload at Home](https://www.freeletics.com/en/progressive-overload-at-home/).
- Freeletics product update: almost all Journeys follow assessment week → training weeks → Hell Week; Week 1 performance calibrates subsequent sessions (**LIVE FEEDBACK**) — [Update: Freeletics Training Journeys](https://www.freeletics.com/en/blog/posts/update-freeletics-training-journeys/).
- Ladder is explicitly **coach-designed weekly team programs**, not algorithm-generated or 1:1 remote PT; coaches publish a new 7-day plan each week; review sources describe **~6-week progressive blocks then deload** — [joinladder.com](https://www.joinladder.com/); [GymAdapt Ladder review (updated 2026)](https://gymadapt.com/learn/ladder-workout-app/).
- Peloton’s “Pump Up the Volume” strength collection is a **4-week, 3×/week** programmatic set (lower / upper / full body) that “gradually increas[es] your reps, load, and volume” — [Peloton Pump Up the Volume](https://www.onepeloton.com/classes/pump-up-the-volume); [Peloton Buddy PUTV10 (2023)](https://www.pelobuddy.com/pump-up-the-volume-10/).
- Peloton Strength+ markets **coach-led multi-week programs** commonly shown as **4 weeks** at 3–5×/week, plus a custom workout generator — [Peloton Strength+](https://www.onepeloton.com/en-CA/strength-plus-app). Peloton editorial: strength programs often run **4–8 weeks**, with deloads every 4–8 weeks — [Training Volume Explained](https://www.onepeloton.com/blog/training-volume).
- Peloton progressive-overload sample (instructor Logan Aldridge): same lift held for **2-week blocks**, then load up / reps down across 8 weeks (e.g. 3×8 @135 → 3×8 @140 → 3×6 @145 → 3×5 @150) — [What Is Progressive Overload Training? (2023-11-08)](https://www.onepeloton.com/en-GB/blog/what-is-progressive-overload-training).
- Nike Training Club markets **4–6 week** training plans that “guid[e] you while adjusting to your progress, schedule and other activities,” plus a large library of trainer-led sessions — [Nike Training Club (UK)](https://www.nike.com/gb/ntc-app). Independent reviews (2023) argue current NTC is mostly **fixed programs** with limited per-user load personalization — [Dr. Muscle NTC review](https://dr-muscle.com/nike-training-club-app-review/); [Android Authority NTC](https://www.androidauthority.com/nike-training-club-3332761/).
- User reports (Reddit, 2022) claim older NTC “Plans” adapted next-week difficulty from session feedback, then were replaced by less adaptive “Programs” (**historical; may be outdated**) — [r/xxfitness NTC thread](https://www.reddit.com/r/xxfitness/comments/tgyfj0/the_nike_training_club_app_has_become_worse_and/).
- Future Pro: human coach builds weekly workouts from a 2,000+ exercise library; member logs/flags feed coach adjustments (**LIVE FEEDBACK / human**, not a published deterministic algorithm) — [Future Pro workout FAQ (2026-02-05)](https://faq.future.co/en/articles/12073331-what-should-i-expect-from-a-future-pro-workout); [Future homepage](https://future.co/).
- Caliber: coach-designed plan library (100+/60+ plans depending on surface) “built for progressive overload,” with exercise substitutions; free logging shows prior workout for manual overload — [Caliber workout app](https://caliberstrong.com/workout-app/); [App Store](https://apps.apple.com/us/app/caliber-strength-training/id1482405410). Community consensus: routines stay fixed for weeks; user progresses reps/weight manually (**LIVE FEEDBACK for load**, template for structure) — [r/caliberstrong progressive overload](https://www.reddit.com/r/caliberstrong/comments/12dcopv/new_to_caliber_and_wondering_if_it_gives_me_a/); [r/caliberstrong do workouts change](https://www.reddit.com/r/caliberstrong/comments/113fapn/just_started_using_the_app_for_1_week_3_strength/).
- Hevy Trainer generates a full program from onboarding (goal, experience, equipment, frequency, duration, focus muscle); **algorithm-based, explicitly “do not rely on AI”** for program creation; progressive overload suggestions from logged performance (**LIVE FEEDBACK**) — [Announcing Hevy Trainer](https://www.hevyapp.com/announcing-hevy-trainer/); [Hevy Trainer Explained](https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program).
- Strong is primarily a **logger with templates**; default templates exist, but progressive overload is user-driven; warm-up/plate calculators assist execution — [Strong templates help (updated 2021-05-20 — older)](https://help.strongapp.io/article/105-about-templates); [Mesostrength progressive-overload apps comparison (2026)](https://mesostrength.com/blog/best-apps-progressive-overload-training).

### Inferences
- For a deterministic 4-week generator, the industry “happy path” is a **fixed exercise skeleton for the block**, with week indices changing **reps, sets, rest, and/or planned intensity cues**—not regenerating a new session from recovery each day.
- Adaptive apps (Fitbod, Freeletics Coach, Hevy Trainer overload) treat week-to-week change as a **function of logged outcomes**; pure generation can only *simulate* that path with scheduled ramps (e.g. +1 set in week 3, shorter rest in week 2).
- 4-week blocks are commercially common (Peloton Strength+, PUTV, NTC 4–6 weeks); 6-week blocks appear often for beginner journeys (Freeletics) and Ladder reviews.

### Gaps
- No public week-by-week prescription tables for Fitbod, Future, or Ladder’s internal coach playbooks (only marketing + third-party descriptions).
- Exact Freeletics Coach decision rules (when a variation “unlocks”) are not published beyond marketing examples.
- Modern NTC’s claimed “adjusting to your progress” vs fixed Programs is poorly documented on Nike’s current help surfaces; older adaptive Plans behavior is anecdotal.

---

## Same exercises vs load/volume only vs exercise variants?

### Takeaway
High-quality products use **both**, but on different timescales: keep core lifts stable for a block so overload is measurable; rotate or progress **variants** when bodyweight complexity, boredom, or equipment force it. Apps that change exercises every session (high-variability Fitbod mode, Hevy “Variable”) trade progression clarity for novelty.

### Cited Findings
- Fitbod: Exercise Selector ranks 800+ exercises each workout from recovery, goal/experience appropriateness, feedback, split, and equipment; over months it “introduces new exercises to prevent plateaus” while Capability Recommender progresses load/reps on what you log — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/); [How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout). Users can set exercise variability preference in My Plan — same article.
- Freeletics explicitly lists **complexity progression** as a primary overload lever at home (e.g. push-up → diamond → archer → one-arm), alongside volume, shorter rest, and TUT; Week 2 may introduce a harder variation of at least one movement if consistent — [Progressive overload at home](https://www.freeletics.com/en/progressive-overload-at-home/).
- Hevy Trainer **Program Variety** setting: **Consistent** = same exercises every week; **Balanced** = change after ~6 weeks (default); **Variable** = exercises can change weekly — [How Hevy Trainer Settings Work](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [Reddit Trainer update](https://www.reddit.com/r/Hevy/comments/1vkg5fr/trainer_update_control_your_program_variety_tell/).
- Caliber / community: keep the same routine ~4–8 weeks; progress by beating last session’s reps/weight rather than swapping the routine weekly — [r/caliberstrong](https://www.reddit.com/r/caliberstrong/comments/113fapn/just_started_using_the_app_for_1_week_3_strength/); Caliber beginner blog: stick with a program for several weeks; after **8 weeks**, change the routine — [A Great Beginner’s Workout Routine](https://caliberstrong.com/blog/great-beginners-workout-routine/) (**undated blog; treat as product philosophy, not dated research**).
- Ladder / Peloton instructor programs: same programmatic days across weeks with progressive overload on loads/reps/volume; exercise identity is coach-authored for the block, not user-randomized — [joinladder.com](https://www.joinladder.com/); [Peloton PUTV](https://www.onepeloton.com/classes/pump-up-the-volume).
- Future: in-workout **Flag** replaces an exercise and notifies the coach; swaps are human-mediated, not a published auto-ladder — [Future Pro workout FAQ](https://faq.future.co/en/articles/12073331-what-should-i-expect-from-a-future-pro-workout).
- Strong/Hevy (logger mode): templates/routines imply **same exercises** until the user edits; progression is load/reps — [Strong templates](https://help.strongapp.io/article/105-about-templates); [Hevy vs Strong 2026](https://lastlift.app/articles/hevy-vs-strong/).

### Inferences
- Deterministic pattern that matches best apps: **anchor movements fixed for all 4 weeks**; optional **week-indexed accessory or regression→progression swaps** (especially bodyweight), never random weekly reshuffles of compounds.
- Hevy’s default “Balanced ≈ 6 weeks” implies a 4-week Pacergo plan should default to **Consistent**, not Variable.
- Freeletics-style **movement ladders** (same pattern, harder variant) are fully deterministic if keyed off week number + experience, not mastery tests—though Freeletics itself gates on performance (**LIVE FEEDBACK**).

### Gaps
- No public Fitbod stats on how often the same exercise repeats week-to-week under default variability.
- Ladder coaches’ exact exercise-swap cadence inside a 6-week block is not publicly specified beyond “new workouts weekly.”

---

## Absolute beginners vs people with &lt;1 year experience (sets/reps)?

### Takeaway
Public product docs rarely distinguish “absolute beginner” vs “&lt;1 year”; they use coarse tiers (Beginner / Intermediate / Advanced) that mainly gate **exercise complexity**, recovery aggressiveness, and sometimes set/rep calibration—not a published “year 0 vs year 1” table. Where concrete numbers appear, beginners cluster around **~3×8–10**, conservative starts, and form-over-failure.

### Cited Findings
- Fitbod Experience levels: Beginner = new to strength training or returning after a long break → foundational/simpler movements; Intermediate = consistent training → more variation/moderate complexity; Advanced = widest variety including advanced options. Experience affects exercise selection, set/rep schemes, progression strategy, and recovery — [Fitness Experience](https://help.fitbod.me/hc/en-us/articles/29976088485143-Fitness-Experience) (updated 2026-02-27). Level does **not** auto-advance.
- Fitbod goal-based ranges (science-aligned claims): Strength ~1–6 reps heavy; Hypertrophy primarily 6–12 with ~10–20 sets/muscle/week; General Fitness / Lean → higher reps, shorter rest — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/). New users get **conservative** starting weights from aggregate data — [How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout).
- Fitbod beginner guidance: focus on form, avoid pushing to failure early; experienced users may use Max Effort Days / failure more — [Getting Started with Fitbod](https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide).
- Nike editorial (strength fundamentals): if new to lifting or a movement, start with **3 sets of 10** in week 1; progress via weight, volume, or tempo once easy — [5 Tips for Smarter Strength Training](https://www.nike.com/gb/a/smarter-strength-training-fundamentals).
- Nike beginner routine blueprint: circuit of squat / bridge / push / pull / conditioning; **repeat circuit twice to start**, 90s between rounds; increase sets as familiar — [Workout Routine for Beginners](https://www.nike.com/gb/a/workout-for-beginner).
- Caliber beginner blog program: most lifts **3×8–10**; some accessories 2×8–10; abs 3×20; last rep difficult but not to failure; progress every week by +1 rep or small load; keep routine ~8 weeks — [A Great Beginner’s Workout Routine](https://caliberstrong.com/blog/great-beginners-workout-routine/) (**undated**).
- Freeletics beginners: dedicated Start Strong/Smart (interval focus, learn movements) and Fit For Life (endurance/stability, lower impact); weight-loss beginner-ish paths use “technically easier exercises with a high amount of repetitions” (Cardio Burn) vs harder/lower-rep shred paths — [Bodyweight Training Journeys](https://help.freeletics.com/hc/en-us/articles/360008600540-Bodyweight-Training-Journeys).
- Hevy Trainer: Level Beginner/Intermediate/Advanced; Goal drives rep ranges (Gain Strength → lower reps/higher weights; Build Muscle → higher reps; Fat Loss → goal-specific structure); Frequency maps to default splits (1–3 days Full Body; 4 Upper/Lower; 5 PPL+UL; 6 PPL×2) — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work). FAQ: generates beginner-friendly workouts that adapt based on progress (**LIVE FEEDBACK**) — [Announcing Hevy Trainer](https://www.hevyapp.com/announcing-hevy-trainer/).
- Peloton PUTV collections labeled **Intermediate**, not beginner — [Pump Up the Volume](https://www.onepeloton.com/classes/pump-up-the-volume).
- Cleveland Clinic progressive overload guidance (general, not app-specific): change one variable at a time; example add ~5 lb if ≥5 reps left on last set; aim ~6–15 reps; when 15 is easy, drop reps and add load — [Cleveland Clinic](https://health.clevelandclinic.org/progressive-overload).

### Inferences
- For Pacergo tiers: treat **absolute beginner** as Fitbod/Hevy Beginner + Freeletics Start Smart/Strong: fewer technical variants, moderate hypertrophy reps (8–12), modest set counts, no failure prescription.
- Treat **&lt;1 year / early experience** closer to Intermediate: same compounds, slightly higher weekly volume or accessory count, optional unilateral/harder variants in weeks 3–4—not a jump to advanced Olympic lifts.
- Double progression inside a fixed range (hit top of 8–10 → bump load, drop toward bottom) is the dominant *user-facing* rule even when the app doesn’t automate it (Caliber, Strong, Hevy logging).

### Gaps
- No app publicly maps “&lt;1 year training age” to exact set/rep tables distinct from “Beginner.”
- Fitbod’s per-tier set/rep deltas are acknowledged but not published numerically.
- ACSM/NSCA numbers appear in Nike/Fitbod citations of general principles; apps rarely publish a full ACSM-aligned beginner prescription table as product truth.

---

## Warm-up patterns for beginners / general fitness?

### Takeaway
Consumer guidance converges on a **two-layer warm-up**: (1) short general raise-temperature (walk/jog/light cardio **or** dynamic mobility circuit, 5–10 min), then (2) **specific ramp sets** on the first heavy lift. Cardio equipment is common in gym-oriented beginner blogs; dynamic mobility is preferred in Nike/PT-facing content and scales better to home/no-equipment. Pure generation can emit both layers deterministically; whether the user *completed* them is LIVE FEEDBACK.

### Cited Findings
- Fitbod: optional **Warm-Up Sets** before heavier lifts—lighter progressive sets with fewer reps approaching working weight; skipped for bodyweight/band, accessories/core/timed, Max Effort, or when working weight is too low for a useful ramp — [Warm-Up Sets](https://help.fitbod.me/hc/en-us/articles/360006337634-Warm-Up-Sets) (help date shown in search as 2026-09; fetch was Cloudflare-blocked, details from search/help snippets + My Plan article); toggle lives under My Plan Training Format — [My Plan](https://help.fitbod.me/hc/en-us/articles/34336407191191-My-Plan). Help also mentions warm-ups & cooldowns as workout preferences — [How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout).
- Caliber beginner blog: **5 min light cardio** (treadmill/elliptical) + **3 ramp sets on first exercise** (very light ×12 → ~50% ×10 → ~70% ×4) — [A Great Beginner’s Workout Routine](https://caliberstrong.com/blog/great-beginners-workout-routine/).
- Nike warm-up guide (updated 2026-01-28): dynamic warm-ups preferred over pre-workout static stretch; match warm-up to session type (strength → joint mobility + activation; HIIT → springy/plyometric); sample **5–10 min**: 1–2 min walk/jog → squat-to-stands → World’s Greatest Stretch → leg swings → inchworms → glute bridges → pogo hops — [8 Warm-Up Exercises](https://www.nike.com/a/warmup-training-tips).
- Nike strength fundamentals: warm-up is “most important part”; typically **5–15 min** dynamic work, then **a couple of warm-up sets before each lift**, gradually increasing load — [Smarter Strength Training](https://www.nike.com/gb/a/smarter-strength-training-fundamentals).
- Nike beginner workout lists a mobility/activation series (walkouts, runner’s lunge / World’s Greatest Stretch, scoops, quad pulls, knee hugs, planks, bird dog, knee push-ups) before the main circuit — [Workout for Beginners](https://www.nike.com/gb/a/workout-for-beginner).
- Hevy Trainer: Cardio can be added **at beginning as warm-up** or at end — [Hevy Trainer Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work).
- Freeletics sessions are described as including warmup → intervals/Gods → cooldown in user forum discussion of beginner journeys (**forum = secondary**) — [Beginner Journeys forum](https://forum.freeletics.com/t/beginner-journeys-which-order/16092); official Journey docs emphasize intensity progression more than warm-up composition — [Bodyweight Training Journeys](https://help.freeletics.com/hc/en-us/articles/360008600540-Bodyweight-Training-Journeys).
- Peloton progressive-overload article: warm up and cool down as injury-prevention practices; warm-up/mobility classes available in the Peloton App — [Peloton progressive overload](https://www.onepeloton.com/en-GB/blog/what-is-progressive-overload-training).
- Strong: known for warm-up **calculator** (execution aid for load ramps), not a programmed mobility circuit — [Mesostrength comparison 2026](https://mesostrength.com/blog/best-apps-progressive-overload-training).

### Inferences
- Best deterministic default for Pacergo general fitness / beginners: **~5–8 min movement-pattern warm-up** (no equipment required) + **1–3 ramp sets on the session’s heaviest compound** when load-based; omit ramp sets for bodyweight-only sessions (mirrors Fitbod rules).
- Prefer dynamic mobility over mandatory cardio machines for Taiwan gym + outdoor companion use cases; optional “light cardio 3–5 min” as an alternate template when equipment is available.
- Do not put long static stretching before strength as the primary warm-up (Nike PT guidance).

### Gaps
- Fitbod’s full Warm-Up Sets page could not be fetched (Cloudflare); details rely on help-center search snippets.
- No public Freeletics official warm-up exercise list comparable to Nike’s.
- Little public detail on Ladder/Future default warm-up scripts beyond audio-cued sessions.

---

## What is public: algorithms vs coach templates vs AI?

### Takeaway
Marketing often says “AI,” but public engineering detail is sparse. Documented patterns: **Fitbod = ML + rules + PT ratings**; **Hevy Trainer = algorithm, explicitly not LLM**; **Freeletics = AI Coach** with opaque rules; **Ladder / Caliber plans / Peloton programs / NTC programs = human coach/instructor templates**; **Future = human coach**; **Strong = no programming algorithm**.

### Cited Findings
- Fitbod: “exercise science expertise, machine learning on your behavior, and … 400 million+ logged workouts”; Exercise Selector + Capability Recommender; PT-rated exercise appropriateness by goal/experience; Epley-like 1RM equations; cites Schoenfeld et al. for volume/failure proximity — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/).
- Hevy: “programs are generated using an algorithm and do not rely on AI”; progressive overload suggestions “backed by scientific research” from performance — [Hevy Trainer Explained](https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program); [Announcing Hevy Trainer](https://www.hevyapp.com/announcing-hevy-trainer/).
- Freeletics: “cutting-edge artificial intelligence, also known as the Freeletics Training Coach” selects Journeys and adjusts from performance/feedback — [Update: Freeletics Training Journeys](https://www.freeletics.com/en/blog/posts/update-freeletics-training-journeys/); progressive overload page claims daily auto-adjust of reps/rest/variations — [Progressive overload at home](https://www.freeletics.com/en/progressive-overload-at-home/).
- Ladder: “coach-designed and program-based — not algorithm-generated, not 1-on-1 remote personal training” — [joinladder.com](https://www.joinladder.com/).
- Caliber: coach-designed plans + optional 1:1 Premium Coaching; free/Plus app is plan library + tracking, not a Fitbod-like auto composer — [Caliber workout app](https://caliberstrong.com/workout-app/); [App Store](https://apps.apple.com/us/app/caliber-strength-training/id1482405410).
- Future: matched human trainers, weekly custom plans, messaging/form video — [Future](https://future.co/); [Play Store](https://play.google.com/store/apps/details?hl=en_US&id=co.future.future).
- Peloton Strength+: “coach-led programs” + “custom workouts” generator from muscle focus / length / experience — [Peloton Strength+](https://www.onepeloton.com/en-CA/strength-plus-app). Custom generator internals not published.
- NTC: Master Trainer video library + multi-week programmes; limited public algorithm detail — [NTC](https://www.nike.com/gb/ntc-app).
- **Name collision:** Calyber Labs (different product) publishes a fully rule-based autoregulation pipeline (e1RM, RIR, fatigue index → load/volume/recovery) claiming same training → same plan — [Calyber Algorithm](https://calyber.app/algorithm). Useful as a **deterministic reference architecture**, not as Caliber.

### Inferences
- “AI” in fitness apps usually means **personalized recommendation / coach branding**, not generative LLM programming at plan-build time.
- Pacergo’s no-LLM generation stance aligns publicly with **Hevy Trainer’s positioning** and with **coach-template products** (Ladder/Peloton/Caliber plans), more than with Fitbod’s continuous ML recommender.
- Anything requiring RiR, Max Effort AMRAP, coach video review, or recovery % from wearables is **LIVE FEEDBACK**.

### Gaps
- No open technical papers detailing Fitbod or Freeletics model weights/features beyond marketing blogs.
- Peloton Strength+ custom workout generator rules are not documented.
- Future’s newer “adaptive / waitlist” App Store listing (id 6744624390) may differ from Future Pro coaching; product lines may be splitting—treat carefully.

---

## Pacergo reuse patterns (deterministic 4-week composer)

### Takeaway
The reusable core is a **fixed mesocycle template**: same main lifts for 4 weeks, week-indexed volume/complexity/rest, experience-gated exercise pools, and a two-layer warm-up—without needing logged performance at generation time.

### Cited Findings (pattern → source → Pacergo fit)
- **4-week progressive block** with scheduled increases in reps/load/volume — Peloton PUTV & Strength+ program length — [PUTV](https://www.onepeloton.com/classes/pump-up-the-volume); [Strength+](https://www.onepeloton.com/en-CA/strength-plus-app). → Pacergo’s 4-week horizon matches market norms.
- **Keep exercises stable inside the block; refresh ~6–8 weeks** — Hevy Balanced default; Caliber community/blog — [Hevy Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work); [Caliber beginner routine](https://caliberstrong.com/blog/great-beginners-workout-routine/). → Default: no mid-plan exercise roulette.
- **Complexity ladders as deterministic overload** (when load unavailable) — Freeletics — [Progressive overload at home](https://www.freeletics.com/en/progressive-overload-at-home/). → Week index can pick ladder rung (regression → base → harder variant).
- **Experience gates exercise difficulty, not only volume** — Fitbod / Hevy Level — [Fitbod Experience](https://help.fitbod.me/hc/en-us/articles/29976088485143-Fitness-Experience); [Hevy Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work). → Separate beginner vs early-experience exercise pools.
- **Conservative first prescriptions** — Fitbod new-user help — [How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout). → Lower starting intensity cues / simpler variants in week 1.
- **Double-progression ranges (e.g. 8–10)** as user instruction even without auto-load — Caliber — [beginner routine](https://caliberstrong.com/blog/great-beginners-workout-routine/); [Reddit](https://www.reddit.com/r/caliberstrong/comments/12dcopv/new_to_caliber_and_wondering_if_it_gives_me_a/). → Emit target ranges + “add load when you hit the top” copy; actual load updates are **LIVE FEEDBACK**.
- **Non-linear / undulating intensity inside the week** (heavy vs lighter days) — Fitbod mStrength — [Fitbod sets/reps help](https://help.fitbod.me/hc/en-us/articles/43489869175063-How-does-Fitbod-decide-my-sets-reps-and-weight). → Optional: schedule Week N Day A as higher-rep, Day B as lower-rep without needing ML.
- **Frequency → split mapping** — Hevy defaults — [Hevy Settings](https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work). → Deterministic split table from days/week.
- **Warm-up = short dynamic circuit + compound ramp sets** — Nike + Caliber + Fitbod — [Nike warm-up](https://www.nike.com/a/warmup-training-tips); [Caliber beginner](https://caliberstrong.com/blog/great-beginners-workout-routine/); [Fitbod Warm-Up Sets](https://help.fitbod.me/hc/en-us/articles/360006337634-Warm-Up-Sets). → Always-on generated warm-up block; ramp sets only when weighted.
- **Optional assessment week / deload** — Freeletics cycle; Peloton deload every 4–8 weeks — [Freeletics Journeys update](https://www.freeletics.com/en/blog/posts/update-freeletics-training-journeys/); [Peloton volume blog](https://www.onepeloton.com/blog/training-volume). → For a pure 4-week plan: Week 1 slightly easier (technique), Weeks 2–3 build, Week 4 peak *or* slight taper—without Hell Week extremes for beginners.
- **Flag LIVE FEEDBACK out of generation:** RiR, Max Effort AMRAPs, strength decay after absences, muscle recovery %, coach swaps, Freeletics mastery unlocks, Future form video — Fitbod/Future/Freeletics sources above.

### Inferences
- Highest-ROI Pacergo reuse: **coach-template mesocycle + Freeletics complexity ladder + Fitbod/Hevy experience gating + Nike/Caliber warm-up recipe**.
- Avoid copying Fitbod’s “new workout every open” UX for a saved 4-week plan; users in Caliber/Hevy Consistent mode expect **repeatability**.
- Do not claim “AI coach” if generation is rule-based—Hevy’s transparency is a better product narrative for deterministic systems.

### Gaps
- No Pacergo-specific competitive teardown of in-app screens was performed in this research pass (text sources only).
- Exact numeric week-over-week set increments used by Ladder/Peloton instructors inside a block remain non-public; Pacergo must invent explicit tables informed by these patterns, not copy proprietary schedules.
