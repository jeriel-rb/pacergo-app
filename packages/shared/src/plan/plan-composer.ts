import {
  COOLDOWN,
  DIET_SECTION,
  FREQUENCY_LABEL,
  GENDER_LABEL,
  GENERIC_NOTES,
  GOAL_INTRO,
  GOAL_NOTES,
  GOAL_TITLE,
  LEVEL_LABEL,
  LOCATION_LABEL,
  LOCATION_NOTES,
  MAIN_BLOCK,
  WARMUP,
  WEEKLY_SCHEDULE,
  WEIGHT_NOTE,
} from "./plan-data";
import type {
  Bi,
  PlanDay,
  PlanExerciseEntry,
  PlanSelection,
  PlanSessionContent,
  PlanWeek,
  ResolvedNutrition,
  TrainingPlan,
} from "./plan-types";

const WEEKS_PER_PLAN = 4;
const DAYS_PER_WEEK = 7;
const WEEKDAY: Bi[] = [
  { zh: "週一", en: "Mon" },
  { zh: "週二", en: "Tue" },
  { zh: "週三", en: "Wed" },
  { zh: "週四", en: "Thu" },
  { zh: "週五", en: "Fri" },
  { zh: "週六", en: "Sat" },
  { zh: "週日", en: "Sun" },
];

const EMPTY_RX: Bi = { zh: "", en: "" };

/** Main-block exercises carry a separate name + rx (prescription). */
function withRefs(entries: { name: Bi; rx: Bi }[], refPrefix: string): PlanExerciseEntry[] {
  return entries.map((e, i) => ({ ref: `${refPrefix}_${i}`, name: e.name, rx: e.rx }));
}

/** Warm-up/cool-down items are single self-contained sentences (activity +
 *  duration already inline) rather than a separate name/rx pair. */
function withRefsFromText(items: Bi[], refPrefix: string): PlanExerciseEntry[] {
  return items.map((text, i) => ({ ref: `${refPrefix}_${i}`, name: text, rx: EMPTY_RX }));
}

function buildSession(sel: PlanSelection): PlanSessionContent {
  const block = MAIN_BLOCK[sel.goal][sel.location];
  return {
    focus: block.focus,
    scheme: block.scheme[sel.level],
    warmup: withRefsFromText(WARMUP[sel.location], `warmup_${sel.location}`),
    main: withRefs(block.exercises, `main_${sel.goal}_${sel.location}`),
    cooldown: withRefsFromText(COOLDOWN, "cooldown"),
  };
}

/**
 * Deterministically compose the full 4-week Personalized Workout Plan
 * (Beta) for a selection: fixed 60-minute sessions (10 warm-up + 40 main +
 * 10 cool-down), the exercise pool constrained to the user's location, and
 * training days placed per the chosen frequency. Same inputs always
 * produce a structurally identical plan (A-2 determinism) — this function
 * makes no network/AI calls of any kind.
 *
 * Every week uses the same day pattern and session content; the spec has
 * no requirement that content vary week to week, only that all 4 weeks
 * are generated and visible immediately (A-2/A-3) with nothing
 * drip-released.
 */
export function composeTrainingPlan(sel: PlanSelection): TrainingPlan {
  const session = buildSession(sel);
  const schedule = WEEKLY_SCHEDULE[sel.frequency];

  const weeks: PlanWeek[] = [];
  for (let weekIndex = 1; weekIndex <= WEEKS_PER_PLAN; weekIndex++) {
    const days: PlanDay[] = [];
    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex++) {
      const isTrainingDay = schedule.trainingDays[dayIndex];
      days.push({
        dayIndex,
        dayLabel: WEEKDAY[dayIndex]!,
        isRestDay: !isTrainingDay,
        session: isTrainingDay ? session : null,
      });
    }
    weeks.push({ weekIndex, days });
  }

  const diet = DIET_SECTION[sel.dietMode];
  const nutrition: ResolvedNutrition = {
    label: diet.label,
    body: diet.body,
    genderNote: diet.byGender[sel.gender],
    heavyNote: sel.weightClass === "heavy" ? diet.heavyNote : undefined,
  };

  return {
    selection: sel,
    intro: {
      zh: `專為${GENDER_LABEL[sel.gender].zh}${LEVEL_LABEL[sel.level].zh}設計 — ${GOAL_INTRO[sel.goal].zh}。每次訓練固定 60 分鐘：暖身 10 分鐘 ＋ 主訓練 40 分鐘 ＋ 收操 10 分鐘。`,
      en: `Designed for ${LEVEL_LABEL[sel.level].en} (${GENDER_LABEL[sel.gender].en}) — ${GOAL_INTRO[sel.goal].en}. Every session is a fixed 60 minutes: warm-up 10 min + main training 40 min + cool-down 10 min.`,
    },
    weightNote: WEIGHT_NOTE[sel.gender][sel.weightClass],
    weeklyScheduleNote: schedule.note,
    weeks,
    notes: [...GOAL_NOTES[sel.goal], ...LOCATION_NOTES[sel.location], ...GENERIC_NOTES],
    nutrition,
  };
}

/**
 * Render a `TrainingPlan` as markdown for display — glue for the existing
 * single-page UI (`PlanMarkdown`) so this data-model change doesn't also
 * require rebuilding the program-overview/daily/detail screens (that's a
 * separate Stage 5 step). All 4 weeks are rendered; nothing is
 * drip-released.
 */
export function renderPlanMarkdown(plan: TrainingPlan, locale: "zh" | "en"): string {
  const pick = (bi: Bi) => bi[locale];
  const sel = plan.selection;
  const out: string[] = [];

  const menuSuffix = locale === "zh" ? "60 分鐘訓練菜單" : "60-Minute Training Menu";
  out.push(
    `# ${pick(GOAL_TITLE[sel.goal])} · ${menuSuffix}（${pick(LOCATION_LABEL[sel.location])}）`,
    "",
    `> ${pick(plan.intro)}`,
    "",
    pick(plan.weightNote),
  );

  const freqHeading =
    locale === "zh"
      ? `每週訓練安排（${pick(FREQUENCY_LABEL[sel.frequency])}）`
      : `Weekly Schedule (${pick(FREQUENCY_LABEL[sel.frequency])})`;
  const dayCol = locale === "zh" ? "星期" : "Day";
  const planCol = locale === "zh" ? "安排" : "Plan";
  const restLabel = locale === "zh" ? "休息" : "Rest";

  out.push("", `## ${freqHeading}`, `| ${dayCol} | ${planCol} |`, "| --- | --- |");
  for (const day of plan.weeks[0]!.days) {
    const planCell = day.isRestDay
      ? restLabel
      : locale === "zh"
        ? "本菜單（60 分鐘）"
        : "This menu (60 min)";
    out.push(`| ${pick(day.dayLabel)} | ${planCell} |`);
  }
  out.push("", pick(plan.weeklyScheduleNote));

  const firstSession = plan.weeks[0]!.days.find((d) => d.session)?.session;
  if (firstSession) {
    const warmupHeading = locale === "zh" ? "暖身（10 分鐘）" : "Warm-up (10 min)";
    const mainHeading = locale === "zh" ? "主訓練（40 分鐘）" : "Main Training (40 min)";
    const cooldownHeading = locale === "zh" ? "收操（10 分鐘）" : "Cool-down (10 min)";

    out.push("", `## ${warmupHeading}`, ...firstSession.warmup.map((e) => `- ${pick(e.name)}`));
    out.push(
      "",
      `## ${mainHeading}`,
      pick(firstSession.scheme),
      "",
      ...firstSession.main.map((e) => `- **${pick(e.name)}** — ${pick(e.rx)}`),
    );
    out.push("", `## ${cooldownHeading}`, ...firstSession.cooldown.map((e) => `- ${pick(e.name)}`));
  }

  const notesHeading = locale === "zh" ? "注意事項" : "Notes";
  out.push("", `## ${notesHeading}`, ...plan.notes.map((n) => `- ${pick(n)}`));

  const nutritionHeading =
    locale === "zh"
      ? `營養建議（${pick(plan.nutrition.label)}）`
      : `Nutrition Guidance (${pick(plan.nutrition.label)})`;
  out.push("", `## ${nutritionHeading}`);
  for (const p of plan.nutrition.body) out.push("", pick(p));
  out.push("", pick(plan.nutrition.genderNote));
  if (plan.nutrition.heavyNote) out.push("", pick(plan.nutrition.heavyNote));

  return out.join("\n");
}
