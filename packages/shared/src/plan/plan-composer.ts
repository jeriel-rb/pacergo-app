import type {
  AgeBand,
  DietMode,
  TrainingFrequency,
  TrainingGoal,
  TrainingLocation,
  WeightClass,
} from "../enums/training";
import type { ExperienceLevel } from "../enums/experience";
import type { PlanGender } from "../enums/gender";
import {
  AGE_NOTE,
  COOLDOWN,
  DIET_LABEL,
  DIET_SECTION,
  FREQUENCY_LABEL,
  GENDER_LABEL,
  GENERIC_NOTES,
  GOAL_INTRO,
  GOAL_NOTES,
  GOAL_TITLE,
  IF_YOUTH_CAUTION,
  LEVEL_LABEL,
  LOCATION_LABEL,
  LOCATION_NOTES,
  MAIN_BLOCK,
  WARMUP,
  WEEKLY_SCHEDULE,
  WEIGHT_NOTE,
  type Bi,
} from "./plan-data";

export interface PlanSelection {
  goal: TrainingGoal;
  gender: PlanGender;
  level: ExperienceLevel;
  ageBand: AgeBand;
  weightClass: WeightClass;
  frequency: TrainingFrequency;
  location: TrainingLocation;
  /** When false, the nutrition section is omitted entirely. */
  nutrition: boolean;
  /** Which nutrition logic to pair with the menu (ignored when !nutrition). */
  dietMode: DietMode;
  locale: "zh" | "en";
}

/** Select the string for `locale` out of a bilingual pair. */
function pick(bi: Bi, locale: "zh" | "en"): string {
  return bi[locale];
}

/** Section headers and other composer-owned copy (not authored content). */
const UI: Record<"zh" | "en", {
  menuSuffix: string;
  introFor: (gender: string, level: string, intro: string) => string;
  fixedDuration: string;
  weeklyHeading: (freq: string) => string;
  dayCol: string;
  planCol: string;
  warmupHeading: string;
  mainHeading: string;
  cooldownHeading: string;
  notesHeading: string;
  nutritionHeading: (diet: string) => string;
}> = {
  zh: {
    menuSuffix: "60 分鐘訓練菜單",
    introFor: (gender, level, intro) => `專為${gender}${level}設計 — ${intro}。`,
    fixedDuration: "每次訓練固定 60 分鐘：**暖身 10 分鐘 ＋ 主訓練 40 分鐘 ＋ 收操 10 分鐘**。",
    weeklyHeading: (freq) => `每週訓練安排（${freq}）`,
    dayCol: "星期",
    planCol: "安排",
    warmupHeading: "暖身（10 分鐘）",
    mainHeading: "主訓練（40 分鐘）",
    cooldownHeading: "收操（10 分鐘）",
    notesHeading: "注意事項",
    nutritionHeading: (diet) => `營養建議（${diet}）`,
  },
  en: {
    menuSuffix: "60-Minute Training Menu",
    introFor: (gender, level, intro) => `Designed for ${level} (${gender}) — ${intro}.`,
    fixedDuration: "Every session is a fixed 60 minutes: **warm-up 10 min + main training 40 min + cool-down 10 min**.",
    weeklyHeading: (freq) => `Weekly Schedule (${freq})`,
    dayCol: "Day",
    planCol: "Plan",
    warmupHeading: "Warm-up (10 min)",
    mainHeading: "Main Training (40 min)",
    cooldownHeading: "Cool-down (10 min)",
    notesHeading: "Notes",
    nutritionHeading: (diet) => `Nutrition Guidance (${diet})`,
  },
};

/**
 * Deterministically compose the 60-minute training menu for a selection:
 * warm-up 10 min + main training 40 min + cool-down 10 min — always exactly
 * one hour, with the exercise pool constrained to the user's training
 * location and the intensity framed by level, body type, and age band.
 * Every string is authored in `plan-data.ts` as a `{ zh, en }` pair and
 * selected here via `sel.locale` — nothing in the output is hardcoded to
 * one language.
 */
export function composePlan(sel: PlanSelection): string {
  const ui = UI[sel.locale];
  const block = MAIN_BLOCK[sel.goal][sel.location];
  const schedule = WEEKLY_SCHEDULE[sel.frequency];
  const out: string[] = [];

  out.push(
    `# ${pick(GOAL_TITLE[sel.goal], sel.locale)} · ${ui.menuSuffix}（${pick(LOCATION_LABEL[sel.location], sel.locale)}）`,
    "",
    `> ${ui.introFor(
      pick(GENDER_LABEL[sel.gender], sel.locale),
      pick(LEVEL_LABEL[sel.level], sel.locale),
      pick(GOAL_INTRO[sel.goal], sel.locale),
    )}`,
    `> ${ui.fixedDuration}`,
    "",
    pick(AGE_NOTE[sel.ageBand], sel.locale),
    "",
    pick(WEIGHT_NOTE[sel.gender][sel.weightClass], sel.locale),
  );

  out.push(
    "",
    `## ${ui.weeklyHeading(pick(FREQUENCY_LABEL[sel.frequency], sel.locale))}`,
    `| ${ui.dayCol} | ${ui.planCol} |`,
    "| --- | --- |",
    ...schedule.rows.map(
      ([day, plan]) => `| ${pick(day, sel.locale)} | ${pick(plan, sel.locale)} |`,
    ),
    "",
    pick(schedule.note, sel.locale),
  );

  out.push(
    "",
    `## ${ui.warmupHeading}`,
    ...WARMUP[sel.location].map((item) => `- ${pick(item, sel.locale)}`),
  );

  out.push(
    "",
    `## ${ui.mainHeading}`,
    pick(block.scheme[sel.level], sel.locale),
    "",
    ...block.exercises.map(
      (ex) => `- **${pick(ex.name, sel.locale)}** — ${pick(ex.rx, sel.locale)}`,
    ),
  );

  out.push(
    "",
    `## ${ui.cooldownHeading}`,
    ...COOLDOWN.map((item) => `- ${pick(item, sel.locale)}`),
  );

  out.push(
    "",
    `## ${ui.notesHeading}`,
    ...[
      ...GOAL_NOTES[sel.goal],
      ...LOCATION_NOTES[sel.location],
      ...GENERIC_NOTES,
    ].map((n) => `- ${pick(n, sel.locale)}`),
  );

  if (sel.nutrition) {
    const diet = DIET_SECTION[sel.dietMode];
    out.push("", `## ${ui.nutritionHeading(pick(DIET_LABEL[sel.dietMode], sel.locale))}`);
    for (const p of diet.body) out.push("", pick(p, sel.locale));
    out.push("", pick(diet.byGender[sel.gender], sel.locale));
    if (sel.weightClass === "heavy" && diet.heavyNote) {
      out.push("", pick(diet.heavyNote, sel.locale));
    }
    if (sel.dietMode === "intermittent_fasting" && sel.ageBand === "youth") {
      out.push("", pick(IF_YOUTH_CAUTION, sel.locale));
    }
  }

  return out.join("\n");
}
