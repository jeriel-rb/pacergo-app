# Warm-up standards for beginner / general-fitness strength training

Research scope: consumer gym/home strength sessions (30–60 min), mapped to Pacergo equipment ids (`treadmill`, `cycling_stationary`, `rowing`, `elliptical`) and bodyweight fallbacks. Goal: MVP rules for a deterministic plan generator that already knows gym equipment and experience level (no new onboarding question). Existing generator already switches high-impact warm-ups (`jumping-jack`, `high-knees`) to gentler mobility when age ≥50, BMI ≥30, or injury obstacle is set.

## What warm-up is recommended for true beginners vs people with some experience?

### Takeaway
Both beginners and experienced lifters need the same two-phase structure—general raise of temperature/heart rate, then movement-specific dynamic mobility/activation—but beginners should keep the Raise shorter/easier, favor controlled low-skill drills over plyometrics, and rely more on lighter rehearsal sets; experienced users can shorten general cardio slightly and emphasize specific drills plus progressive warm-up sets.

### Cited Findings
- ACSM framing (via exercise-prescription teaching summary): warm-up goal is to improve muscle temperature, VO₂, neuromuscular control and flexibility while minimizing fatigue; ACSM recommends about 5–10 minutes of light-to-moderate intensity warm-up; dynamic, movement-based warm-ups are preferred over pre-session static stretching for cardiorespiratory/resistance work — [UH Libraries – Warm up for different exercise types](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/)
- ACSM quantity/quality position stand: for most people in a general fitness program, a dynamic cardiorespiratory endurance warm-up is superior to flexibility exercise for enhancing subsequent cardiorespiratory or resistance performance (especially high-duration / high-rep work); flexibility after the main session (or as a separate session) is preferred when possible — [ACSM Quantity and Quality of Exercise (PDF)](https://www.abom.org/wp-content/uploads/2018/12/Quantity_and_Quality_of_Exercise_for_Developing.26-002.pdf)
- NSCA traditional model: general warm-up = 5–10 minutes low-to-moderate cardio (e.g., jogging or stationary cycling), then a specific warm-up of less intense movements similar to the upcoming activity; purpose is gradual adjustment without undue fatigue — [NSCA – Introduction to Dynamic Warm-Up](https://www.nsca.com/education/articles/kinetic-select/introduction-to-dynamic-warm-up/)
- NSCA Basics of Strength and Conditioning: general warm-up aims to raise HR, blood flow, muscle temperature, respiration, perspiration, and reduce joint-fluid viscosity; specific warm-up ≈ 8–12 minutes of dynamic stretching / sport-like movement (e.g., walking knee lift); dynamic stretching preferred over static/PNF in the warm-up for performance — [NSCA Basics of Strength and Conditioning Manual (PDF)](https://www.nsca.com/contentassets/48a12160221541acbdc048498d77192d/basics_of_strength_and_conditioning_manual.pdf)
- Strength-training example warm-up (teaching text synthesizing ACSM/NSCA): general = 5–10 min walking/jogging/running, elliptical, or rower; specific = arm swings/circles, air squats, light bar practice; for heavy lifts, build via 1–3 warm-up sets toward ~50% before working sets — [UH Libraries – Warm up for different exercise types](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/)
- Combination of general + specific warm-up improved leg-press 1RM by ~8.4% vs specific warm-up alone in trained individuals (general = 20 min bike at 60% HRmax in that study—longer than typical consumer warm-ups) — [Abad et al., JSCR 2011](https://journals.lww.com/nsca-jscr/fulltext/2011/08000/combination_of_general_and_specific_warm_ups.23.aspx)
- Nike (PT/CSCS-backed consumer guidance): sample 5–10 min routine = 1–2 min light walk/jog → squat-to-stands → World’s Greatest Stretch → leg swings → inchworms → glute bridges → optional short pogo hops; dynamic warm-ups are generally enough; static stretch only for problem areas; readiness = lightly warm / elevated HR / light sweat, not fatigued — [Nike – Warm-Up Training Tips](https://www.nike.com/a/warmup-training-tips)
- Fitbod beginner strength guidance: start each workout with 5–8 minutes easy cardio or dynamic movement, then 1–2 lighter warm-up sets before first lower- and upper-body lifts — [Fitbod – How to start strength training](https://fitbod.me/blog/how-to-start-strength-training/)
- Fitbod product behavior: optional soft-tissue / dynamic / primers as warm-up, filtered by available equipment, muscles trained that day, and experience level; warm-up sets are separate and only generated when working weight leaves room for a useful progression — [Fitbod Help – Stretching / Warm-up & Cool-down](https://help.fitbod.me/hc/en-us/articles/360019715433-Stretching-Warm-up-Cool-down); [Fitbod Help – Warm-Up Sets](https://help.fitbod.me/hc/en-us/articles/360006337634-Warm-Up-Sets)
- Nike beginner full-body template uses a mobility/activation series (walkouts, dynamic runner’s lunge, scoops, quad pulls, knee hugs, planks, bird dog, knee push-ups) rather than machine cardio or jumping drills as the default warm-up block — [Nike UK – Workout routine for beginners](https://www.nike.com/gb/a/workout-for-beginner)
- East/Southeast Asia S&C coach survey (n=58): warm-ups often 10–20 min (strength) or <10 min (43% for strength); sequence typically low-intensity micro-activation and/or jog/cycle → stretching → jumps → specific work; dynamic stretching nearly universal (97%); warm-up sets for main strength exercises used by 55% — [Springer – Current practices of warm-up during strength training…](https://link.springer.com/article/10.1007/s11332-025-01341-w)

### Inferences
- **MVP beginner (`no_experience` / `beginner`) rule:** Raise 3–5 min easy cardio (machine if available) + 3–5 min simple dynamic mobility (arm circles, leg swings, bodyweight squat, world-greatest-style lunge if catalog has it) + lighter first sets on compound lifts. Avoid plyometric potentiation (pogo hops, jumping jacks) as default.
- **MVP experienced (`intermediate` / `advanced`) rule:** Same structure, but Raise can be 2–4 min if the user is already warm from commuting/prior activity; allocate more of the budget to session-specific mobility and progressive warm-up sets on the first heavy compound. Optional short potentiation only if session includes impact/power work and low-impact mode is off.
- **Do not use experience alone to skip warm-up**—experience changes *complexity and intensity*, not whether a warm-up exists.
- Pacergo already encodes experience for sets/reps; warm-up differentiation can reuse that enum without a new question.

### Gaps
- ACSM GETP 11th edition full text was not freely fetchable; duration “5–10 min” is cited via secondary academic/teaching sources summarizing ACSM rather than a page-quoted primary PDF.
- No high-quality RCT found that isolates “true beginner vs intermediate” warm-up *content* for general-fitness strength (most literature is athletic/performance). Beginner-specific prescriptions above are synthesized from consumer apps + coaching texts, not a single ACSM beginner chapter.
- The Abad et al. 20-minute bike protocol is not a consumer gym default; treat the *combination of general+specific* finding as directional, not the 20-minute dose.

## When is easy treadmill / bike / rower preferred over jumping jacks / high knees?

### Takeaway
Easy machine cardio is preferred whenever impact, balance, skill demand, or joint load should stay low, or when the user has a cardio machine available and needs a controlled Raise; jumping jacks / high knees are acceptable short bodyweight Raise options for healthy, mobile users without machines—but they are higher-impact and more skill/coordination-demanding, so they should not be the default for low-impact profiles.

### Cited Findings
- NSCA lists jogging *or stationary cycling* as valid general warm-up modes for raising temperature — [NSCA – Introduction to Dynamic Warm-Up](https://www.nsca.com/education/articles/kinetic-select/introduction-to-dynamic-warm-up/)
- Strength-training general warm-up examples explicitly include walking/jogging, elliptical, or rowing ergometer before specific mobility — [UH Libraries – Warm up for different exercise types](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/)
- Teaching overview lists general Raise options including gentle jogging, swimming, biking, jump rope, or jumping jacks—machines and impact bodyweight are treated as interchangeable Raise tools, not as the specific warm-up — [UH Libraries – Warm up for different exercise types](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/)
- Stationary cycling is lower joint impact than running because feet stay on pedals; treadmill *walking* is gentler than treadmill running; bikes preferred with joint pain/arthritis/injury concerns — [Verywell Health – Exercise Bike vs Treadmill](https://www.verywellhealth.com/exercise-bike-vs-treadmill-11733750); [PureGym – Exercise Bike vs Treadmill](https://www.puregym.com/blog/exercise-bike-vs-treadmill/)
- Pre-strength advice: keep machine intensity easy so legs are not pre-fatigued; light cycling especially useful before leg day if resistance stays low; treadmill walking fine for upper-body / general sessions; always follow with dynamic mobility specific to the lifts — [NDTV Fitness – 10 min cycling or treadmill before strength](https://www.ndtv.com/health/fitness/10-min-cycling-or-10-min-treadmill-what-you-should-do-before-strength-training-11905353)
- PT clinic guidance: high knees / jumping jacks can appear as *light plyometrics* late in a warm-up for run/leg readiness, but warm-ups must still be activity-specific (e.g., rowers also need shoulder prep); keep plyos light to avoid pre-fatigue — [STAR PTDC – Warm Ups](https://www.starptdc.com/blog/warm-ups)
- Nike reserves springy/plyometric drills (e.g., pogo hops) for HIIT/power sessions; strength warm-ups prioritize mobility + activation; light walk/jog is the suggested Raise opener — [Nike – Warm-Up Training Tips](https://www.nike.com/a/warmup-training-tips)
- For higher body weight, kinesiology guidance favors walking and low-impact machines (treadmill, elliptical, bike) and explicitly advises against running/jogging/jumping due to joint/tendon/cartilage injury risk — [George Mason University – Exercise tips for reducing injury risk in obese individuals](https://cehd.gmu.edu/features/2024/02/23/exercise-tips-for-reducing-risk-of-injury-in-obese-individuals/)

### Inferences
- **Prefer machine Raise when any of:** `needsLowImpact` true; user has ≥1 of `treadmill` | `cycling_stationary` | `rowing` | `elliptical`; experience is beginner/no_experience (lower coordination demand).
- **Machine preference order for MVP (low → higher impact / skill):**
  1. `cycling_stationary` — lowest impact, easy intensity control (best default if present)
  2. `elliptical` — low impact, weight-bearing-ish without pounding
  3. `rowing` — low impact but more upper-body demand; good before full-body / pull days; keep very easy
  4. `treadmill` — use **walk / easy pace only** (map to walk or incline-walk style slug, not hard running)
- **Prefer jumping jacks / high knees only when:** no cardio machine available, `needsLowImpact` is false, and experience is at least beginner-comfortable with coordination. Even then, keep them short (≈30–60 s or low reps) as Raise, not the whole warm-up.
- **Never treat machine cardio as the whole warm-up**—always append 2–4 dynamic/specific drills matching the day’s patterns (squat/hinge/push/pull).
- Intensity cue for generator copy: conversational pace / light sweat / can speak in full sentences; do not prescribe HIIT on warm-up machines.

### Gaps
- No ACSM/NSCA rule that *forbids* jumping jacks for healthy adults; preference for machines in low-impact cases is inferred from joint-load and obesity/older-adult guidance, not a named “jumping jack contraindication” guideline.
- Limited primary evidence comparing rower vs bike vs elliptical *as warm-ups before strength* specifically; machine ranking above is pragmatic for MVP, not a ranked meta-analysis.

## How long should warm-up be relative to a 30–60 min session?

### Takeaway
For consumer strength sessions, budget roughly **5–10 minutes** total warm-up (about **10–20%** of a 30–60 min session), split between a short Raise and specific dynamic work; longer athletic RAMP protocols (10–15+ min) are optional and usually too long for MVP 30-min plans.

### Cited Findings
- ACSM-associated guidance: warm-up typically **5–10 minutes** light-to-moderate intensity; time may vary with session metabolic demands — [UH Libraries summarizing ACSM](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/); [USF thesis citing ACSM 2018 warm-up definition/duration](https://digitalcommons.usf.edu/cgi/viewcontent.cgi?article=10060&context=etd)
- ACE practical programming: effective warm-up ≈ **12–20% of session time**, e.g. **8–12 minutes** in a 60-minute session — [ACE – Activity-specific warm-up and mobility drills](https://www.acefitness.org/certifiednewsarticle/2910/a-detailed-guide-to-designing-activity-specific-warm-up-and-mobility-drills/)
- NSCA: general 5–10 min + specific dynamic block often described as ~8–12 min in athletic contexts (full athletic warm-ups can therefore exceed consumer needs) — [NSCA Basics Manual (PDF)](https://www.nsca.com/contentassets/48a12160221541acbdc048498d77192d/basics_of_strength_and_conditioning_manual.pdf); [NSCA TSAC module excerpt on warm-up order](https://www.nsca.com/contentassets/24f7e187e9aa4a588439c9612231c7fd/tsac-module-3.0--3.3.pdf)
- Jeffreys RAMP framework: warm-ups commonly **10–30 minutes** in athletic programming; RAMP phases = Raise → Activate & Mobilise → Potentiate — [Jeffreys RAMP PDF via scottishathletics](https://www.scottishathletics.org.uk/wp-content/uploads/2014/04/Warm-up-revisted-.pdf)
- Practitioner summaries of RAMP for field sports often target **10–15 minutes** total, with compressed ~8-minute versions for lighter gym sessions — [O’Hanlon Performance – RAMP guide](https://ohanlonperformance.com/ramp-warm-up-guide/); [Australian Athletics coach RAMP for runners](https://coachathletics.com.au/coaching-education/fatigue-wpdak-5m83h-8e62j)
- Consumer apps: Nike 5–10 min (even 2–3 min better than none); Fitbod beginner tip 5–8 min easy cardio/dynamic before warm-up sets — [Nike warm-up tips](https://www.nike.com/a/warmup-training-tips); [Fitbod start strength training](https://fitbod.me/blog/how-to-start-strength-training/)
- Fitbod: warm-up/cool-down stretching is part of planned session duration (not added on top)—if users want more main-lift time, they increase total workout length — [Fitbod Help – Stretching](https://help.fitbod.me/hc/en-us/articles/360019715433-Stretching-Warm-up-Cool-down)
- NordicTrack consumer guide: minimum warm-up often **5–15 minutes**, progressive, until lightly sweating/energized — [NordicTrack – Purpose of a warm-up](https://www.nordictrack.com/uk/blog/what-is-the-purpose-of-a-warm-up-and-how-should-it-be-performed)

### Inferences
- **MVP duration table (include inside session budget):**
  - 30 min session → **5–6 min** warm-up (~17–20%)
  - 45 min session → **6–8 min**
  - 60 min session → **8–10 min**
- **Split inside that budget:** ~40–50% Raise (machine or marching/jacks) + ~50–60% dynamic/specific; skip athletic Potentiate phase for general fitness MVP unless doing power/HIIT.
- **Warm-up sets** on the first compound are *additional but short* (1–2 sets) and should count toward the strength block more than the “cardio Raise” block—mirrors Fitbod’s separation of stretching warm-up vs warm-up sets.
- For 30-min plans, prefer **machine 3 min + 2 mobility drills** over a long mobility circuit.

### Gaps
- No authoritative source gives a single mandatory percentage for warm-up vs total session; ACE’s 12–20% and ACSM’s 5–10 min are complementary heuristics, not identical.
- Athletic RAMP durations (10–30 min) would cannibalize short consumer workouts; evidence does not require full RAMP for general fitness strength.

## How do apps or guidelines adapt warm-ups when impact should be low (age, BMI, injury)?

### Takeaway
Guidelines and consumer products converge on: replace jumping/running Raise with walking or low-impact machines, keep intensity light, use controlled mobility instead of plyometrics, and progress via lighter versions of the main lifts; Pacergo’s existing `needsLowImpact` triggers (injury obstacle, age ≥50, BMI ≥30) align with this literature and do not require a new onboarding question.

### Cited Findings
- NIA older-adult guidance: do a little light activity such as easy walking before/after aerobic work; for muscle-strengthening, warm up by doing the exercises with less weight; avoid overdoing to the point of joint pain — [National Institute on Aging – Three types of exercise](https://www.nia.nih.gov/health/exercise-and-physical-activity/three-types-exercise-can-improve-your-health-and-physical) *(fetch returned 405 in this research pass; URL retained as the canonical NIA page cited widely in search results)*
- Higher BMI / obesity programming: prefer walking and low-impact machines (treadmill, elliptical, bike); chair-supported options when needed; avoid high-intensity running/jogging/jumping because of joint/tendon/cartilage injury risk — [GMU Kinesiology feature](https://cehd.gmu.edu/features/2024/02/23/exercise-tips-for-reducing-risk-of-injury-in-obese-individuals/)
- Consumer senior/low-impact advice: warm up with easy movement; use sturdy support for balance; stop for chest pain, unusual dyspnea, dizziness, sharp joint pain — [Mutual of Omaha – Low-impact exercises for older adults](https://www.mutualofomaha.com/advice/health-and-well-being/health-and-aging/low-impact-exercises-for-older-adults)
- Older-women RT warm-up research: both static and dynamic stretching before elastic-band RT can aid mobility; participants doing dynamic stretching reported lower RPE, suggesting DS may suit beginners starting RT; static stretching showed mobility/stair-descent benefits in that specific study — [PMC / study summary on SS before RT in older women](https://exa.ai/library/publication/vwqfwkncpgv)
- Sports Medicine warm-up review: warm-ups should be individualized; substantial inter-individual variability; modality can be generic, sport-specific, or session-specific depending on goals and constraints — [Afonso et al., Sports Medicine 2023 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10798919/)
- Fitbod filters mobility/warm-up content by equipment availability, muscle relevance, excluded exercises, and **experience level**; soft-tissue omitted without foam roller — [Fitbod Help – Stretching](https://help.fitbod.me/hc/en-us/articles/360019715433-Stretching-Warm-up-Cool-down)
- Nike: “one size does not fit all”; check with clinician/PT for pains/injuries; match warm-up to workout type (mobility/activation for strength; plyos mainly for impact sports/HIIT) — [Nike – Warm-Up Training Tips](https://www.nike.com/a/warmup-training-tips)
- Pacergo current code already defines low-impact mode from injury / age≥50 / BMI≥30 and swaps `jumping-jack`+`high-knees` for `arm-circles`, `leg-swings-stretch`, `bodyweight-squat` — local `packages/shared/src/plan/generate-plan.ts` (`needsLowImpact`, `LOW_IMPACT_WARMUP_SLUGS`)

### Inferences
- **Deterministic low-impact warm-up package (no new question):**
  1. Raise: first available of `cycling_stationary` → `elliptical` → `rowing` (easy) → `treadmill` **walk** → marching in place / step-touches (bodyweight, no jump)
  2. Mobility: keep `arm-circles`, `leg-swings-stretch`, controlled `bodyweight-squat`; add glute bridge / bird-dog style activation if in catalog
  3. Hard exclude from warm-up: `jumping-jack`, `high-knees`, pogo/hop/plyo primers
  4. Strength block: emphasize lighter first set(s) on compounds (NIA “less weight” cue)
- Optional gentle static stretch for a known stiff area can be allowed for older/low-impact users *without* making static stretching the default for everyone (evidence mixed; ACSM still prefers dynamic for performance prep).
- Injury obstacle in onboarding is already a sufficient proxy; do not ask a dedicated “warm-up preference” question for MVP.

### Gaps
- NIA page could not be re-fetched (HTTP 405) during this pass; content summarized from search snippet + common NIA messaging—re-verify before treating quotes as verbatim.
- Guidelines rarely specify exact BMI cutoffs for warm-up modality; Pacergo’s BMI≥30 threshold is a product heuristic consistent with obesity low-impact advice, not an ACSM warm-up cutoff.
- Injury type is not differentiated (shoulder vs knee vs back)—MVP can only apply a blunt low-impact filter unless injury location is later collected.

## Concrete fallback chain when cardio machines are unavailable

### Takeaway
Use a strict ordered fallback: easy machine Raise if present → low-impact bodyweight Raise (march/step-touch) when low-impact needed → short jumping-jack/high-knees Raise only for healthy non-low-impact users → always finish with the same small dynamic mobility set and movement rehearsal; never fail the warm-up block because a machine is missing.

### Cited Findings
- General Raise can be accomplished with jogging, cycling, elliptical, rower, jump rope, or jumping jacks—i.e., equipment-optional paths exist — [UH Libraries warm-up chapter](https://uhlibraries.pressbooks.pub/appliedexercise/chapter/warm-up-for-different-exercise-types/)
- Nike time-crunched template starts with 1–2 min walk/jog even without prescribing a gym machine, then bodyweight mobility/activation — [Nike – Warm-Up Training Tips](https://www.nike.com/a/warmup-training-tips)
- Fitbod generates warm-up mobility only for equipment the user has; missing foam roller simply omits soft tissue rather than blocking the workout — [Fitbod Help – Stretching](https://help.fitbod.me/hc/en-us/articles/360019715433-Stretching-Warm-up-Cool-down)
- NordicTrack lists walking/cycling/rowing *or* dynamic bodyweight (jumping jacks, knee raises, run in place) as valid HR-raising options — [NordicTrack warm-up article](https://www.nordictrack.com/uk/blog/what-is-the-purpose-of-a-warm-up-and-how-should-it-be-performed)
- PT guidance: start with submaximal versions of upcoming movements + active ROM; high knees/jacks are optional light plyos, not mandatory — [STAR PTDC – Warm Ups](https://www.starptdc.com/blog/warm-ups)
- Low-impact populations should substitute walking/machine work for jumping when those options exist — [GMU obesity exercise tips](https://cehd.gmu.edu/features/2024/02/23/exercise-tips-for-reducing-risk-of-injury-in-obese-individuals/)

### Inferences
**MVP Raise fallback chain (pick first match):**

| Priority | Condition | Raise prescription | Equipment / slug mapping |
| ---: | --- | --- | --- |
| 1 | `cycling_stationary` available | 3–5 min easy pedal | equipment id `cycling_stationary` → exercise slug `cycling` |
| 2 | `elliptical` available | 3–5 min easy | `elliptical` → `elliptical` |
| 3 | `rowing` available | 3–5 min easy, low damper/resistance | `rowing` → `rowing` |
| 4 | `treadmill` available | 3–5 min easy **walk** (not run) | `treadmill` → walk / `treadmill-incline-walk` style; avoid hard `running` as warm-up |
| 5 | low-impact mode, no machines | 2–3 min march in place / step-touches + arm swings | bodyweight only; **do not** use `jumping-jack` / `high-knees` |
| 6 | not low-impact, no machines | 30–60 s `jumping-jack` **or** `high-knees` (one, not both long sets) | current `WARMUP_SLUGS` cardio pair |
| 7 | catalog missing even those | skip discrete Raise; extend dynamic mobility to 4–5 min | still include `bodyweight-squat` + arm/leg swings |

**Always after Raise (all users, 2–4 min):**
- Dynamic mobility set: `arm-circles`, `leg-swings-stretch`, `bodyweight-squat` (already in low-impact list; use for everyone in MVP)
- Optional session-specific add-ons if catalog allows: glute bridge (lower), band pull-apart / shoulder circles (upper)
- First compound lift: 1 lighter rehearsal set (beginners: 1–2)

**Experience overlay (no new question):**
- `no_experience` / `beginner`: prefer priorities 1–5; if forced to priority 6, keep volume minimal; more coaching-style mobility
- `intermediate` / `advanced`: any priority OK; can shorten Raise by ~1 min if total session is 30 min

**Product rule summary for the generator:**
1. Warm-up total ≈ 5–10 min scaled to session length (see duration table).
2. Structure = Raise → Dynamic specific → (later) warm-up sets on main lifts.
3. Machines beat jumping for Raise when available.
4. `needsLowImpact` removes jump-based Raise and plyometric primers.
5. Missing machines never omit warm-up—fall through the bodyweight chain.

### Gaps
- Catalog may not yet have explicit “march in place” / “step-touch” slugs; until added, low-impact no-machine path leans on mobility-only (`LOW_IMPACT_WARMUP_SLUGS`), which raises temperature less efficiently than easy marching—worth adding 1–2 low-impact cardio bodyweight slugs.
- Home users with only a jump rope: rope is higher skill/impact; not recommended as default warm-up for beginners or low-impact mode (insufficient app/guideline consensus found to put jump rope above marching in the fallback chain).
- Exact work:rest and rep schemes for each mobility drill vary by source; MVP should use low fixed volumes (e.g., 10 reps/side or 30–45 s) rather than claiming a single evidence-based dose.
