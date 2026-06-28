import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgeBand,
  ExperienceLevel,
  PlanGender,
  TrainingGoal,
} from "@pacergo/shared";

export interface PlanSelection {
  goal: TrainingGoal;
  gender: PlanGender;
  level: ExperienceLevel;
  ageBand: AgeBand;
  /** When false, the "## 營養建議" section is stripped from the output. */
  nutrition: boolean;
  locale: "zh" | "en";
}

const PLANS_DIR = path.join(
  process.cwd(),
  "src",
  "features",
  "ai-plan",
  "plans",
);

const NUTRITION_HEADING = "## 營養建議";

/** Short age-band framing prepended to every plan. Plans themselves are
 *  authored in zh; the callout matches the UI locale. */
const AGE_NOTE: Record<AgeBand, { zh: string; en: string }> = {
  youth: {
    zh: "**年齡層提醒（青少年 15–25）：** 身體恢復快，重點放在學會正確姿勢與建立規律運動習慣，避免過度訓練與比較重量。",
    en: "**Age note (Youth 15–25):** You recover fast — focus on learning proper form and building a consistent habit rather than chasing heavy loads.",
  },
  adult: {
    zh: "**年齡層提醒（成人 26–45）：** 時間有限，重視訓練效率與作息平衡，安排好工作、訓練與恢復的節奏。",
    en: "**Age note (Adult 26–45):** Time is tight — prioritise training efficiency and balance work, training, and recovery.",
  },
  senior: {
    zh: "**年齡層提醒（熟齡 46+）：** 關節與恢復需多留意，加強暖身、循序漸進，必要時先諮詢專業教練或醫師。",
    en: "**Age note (Senior 46+):** Mind your joints and recovery — warm up thoroughly, progress gradually, and check with a coach or doctor when in doubt.",
  },
};

export function planKey(
  goal: TrainingGoal,
  gender: PlanGender,
  level: ExperienceLevel,
): string {
  return `${goal}-${gender}-${level}`;
}

/**
 * Load the authored markdown for a selection, optionally stripping the
 * nutrition section and prepending an age-band callout. Returns null if no
 * plan file exists for the combination.
 */
export async function loadPlanMarkdown(
  sel: PlanSelection,
): Promise<string | null> {
  const file = path.join(PLANS_DIR, `${planKey(sel.goal, sel.gender, sel.level)}.md`);
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return null;
  }

  let body = raw.trimEnd();

  if (!sel.nutrition) {
    const idx = body.indexOf(NUTRITION_HEADING);
    if (idx !== -1) body = body.slice(0, idx).trimEnd();
  }

  // Insert the age callout just before the first "## " section heading.
  const note = AGE_NOTE[sel.ageBand][sel.locale];
  const firstSection = body.indexOf("\n## ");
  if (firstSection !== -1) {
    body =
      body.slice(0, firstSection) +
      `\n\n${note}\n` +
      body.slice(firstSection);
  } else {
    body = `${body}\n\n${note}\n`;
  }

  return body;
}
