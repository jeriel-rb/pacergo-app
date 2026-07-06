import type {
  AgeBand,
  DietMode,
  ExperienceLevel,
  PlanGender,
  TrainingFrequency,
  TrainingGoal,
  TrainingLocation,
  WeightClass,
} from "@pacergo/shared";
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

/**
 * Deterministically compose the 60-minute training menu for a selection:
 * 暖身 10 分鐘 ＋ 主訓練 40 分鐘 ＋ 收操 10 分鐘 — always exactly one hour,
 * with the exercise pool constrained to the user's training location and the
 * intensity framed by level, body type, and age band.
 */
export function composePlan(sel: PlanSelection): string {
  const block = MAIN_BLOCK[sel.goal][sel.location];
  const schedule = WEEKLY_SCHEDULE[sel.frequency];
  const out: string[] = [];

  out.push(
    `# ${GOAL_TITLE[sel.goal]} · 60 分鐘訓練菜單（${LOCATION_LABEL[sel.location]}）`,
    "",
    `> 專為${GENDER_LABEL[sel.gender]}${LEVEL_LABEL[sel.level]}設計 — ${GOAL_INTRO[sel.goal]}。`,
    `> 每次訓練固定 60 分鐘：**暖身 10 分鐘 ＋ 主訓練 40 分鐘 ＋ 收操 10 分鐘**。`,
    "",
    AGE_NOTE[sel.ageBand][sel.locale],
    "",
    WEIGHT_NOTE[sel.gender][sel.weightClass],
  );

  out.push(
    "",
    `## 每週訓練安排（${FREQUENCY_LABEL[sel.frequency]}）`,
    "| 星期 | 安排 |",
    "| --- | --- |",
    ...schedule.rows.map(([day, plan]) => `| ${day} | ${plan} |`),
    "",
    schedule.note,
  );

  out.push(
    "",
    "## 暖身（10 分鐘）",
    ...WARMUP[sel.location].map((item) => `- ${item}`),
  );

  out.push(
    "",
    "## 主訓練（40 分鐘）",
    block.scheme[sel.level],
    "",
    ...block.exercises.map((ex) => `- **${ex.name}** — ${ex.rx}`),
  );

  out.push(
    "",
    "## 收操（10 分鐘）",
    ...COOLDOWN.map((item) => `- ${item}`),
  );

  out.push(
    "",
    "## 注意事項",
    ...[
      ...GOAL_NOTES[sel.goal],
      ...LOCATION_NOTES[sel.location],
      ...GENERIC_NOTES,
    ].map((n) => `- ${n}`),
  );

  if (sel.nutrition) {
    const diet = DIET_SECTION[sel.dietMode];
    out.push("", `## 營養建議（${DIET_LABEL[sel.dietMode]}）`);
    for (const p of diet.body) out.push("", p);
    out.push("", diet.byGender[sel.gender]);
    if (sel.weightClass === "heavy" && diet.heavyNote) {
      out.push("", diet.heavyNote);
    }
    if (sel.dietMode === "intermittent_fasting" && sel.ageBand === "youth") {
      out.push("", IF_YOUTH_CAUTION);
    }
  }

  return out.join("\n");
}
