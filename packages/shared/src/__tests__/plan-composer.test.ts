import { describe, it, expect } from "vitest";
import {
  TRAINING_GOALS,
  TRAINING_LOCATIONS,
  TRAINING_FREQUENCIES,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  WEIGHT_CLASSES,
  DIET_MODES,
} from "../index";
import { composeTrainingPlan, renderPlanMarkdown } from "../plan/plan-composer";
import type { PlanSelection } from "../plan/plan-types";

const BASE: PlanSelection = {
  goal: "muscle_gain",
  gender: "male",
  level: "beginner",
  weightClass: "medium",
  frequency: "3x",
  location: "gym",
  dietMode: "none",
  locale: "zh",
};

describe("composeTrainingPlan", () => {
  it("generates exactly 4 weeks of 7 days each, with no drip-release", () => {
    const plan = composeTrainingPlan(BASE);
    expect(plan.weeks).toHaveLength(4);
    for (const week of plan.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it("is deterministic: identical inputs produce a structurally identical plan", () => {
    const a = composeTrainingPlan({ ...BASE });
    const b = composeTrainingPlan({ ...BASE });
    expect(a).toEqual(b);
    // Every week is generated the same way today (no periodization), so all
    // 4 weeks' day content (everything but the week number) should match too.
    expect(a.weeks[1]!.days).toEqual(a.weeks[0]!.days);
    expect(a.weeks[2]!.days).toEqual(a.weeks[0]!.days);
    expect(a.weeks[3]!.days).toEqual(a.weeks[0]!.days);
  });

  it("places training days per the chosen frequency", () => {
    const everyDay = composeTrainingPlan({ ...BASE, frequency: "every_day" });
    expect(everyDay.weeks[0]!.days.every((d) => !d.isRestDay)).toBe(true);

    const onceAWeek = composeTrainingPlan({ ...BASE, frequency: "1x" });
    expect(onceAWeek.weeks[0]!.days.filter((d) => !d.isRestDay)).toHaveLength(1);
  });

  it("gives every training day the fixed 60-minute structure (10/40/10)", () => {
    for (const goal of TRAINING_GOALS) {
      for (const location of TRAINING_LOCATIONS) {
        for (const level of EXPERIENCE_LEVELS) {
          const plan = composeTrainingPlan({ ...BASE, goal, location, level });
          const trainingDay = plan.weeks[0]!.days.find((d) => !d.isRestDay)!;
          expect(trainingDay.session).not.toBeNull();
          expect(trainingDay.session!.warmup.length).toBeGreaterThan(0);
          expect(trainingDay.session!.main.length).toBeGreaterThan(0);
          expect(trainingDay.session!.cooldown.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("produces a complete, non-empty plan for every A-1 combination", () => {
    for (const goal of TRAINING_GOALS)
      for (const gender of PLAN_GENDERS)
        for (const level of EXPERIENCE_LEVELS)
          for (const weightClass of WEIGHT_CLASSES)
            for (const frequency of TRAINING_FREQUENCIES)
              for (const location of TRAINING_LOCATIONS)
                for (const dietMode of DIET_MODES) {
                  const plan = composeTrainingPlan({
                    ...BASE,
                    goal,
                    gender,
                    level,
                    weightClass,
                    frequency,
                    location,
                    dietMode,
                  });
                  const md = renderPlanMarkdown(plan, "zh");
                  expect(md.length).toBeGreaterThan(300);
                  expect(md).not.toContain("undefined");
                }
  });

  it("constrains exercises to the training location", () => {
    const bodyweight = renderPlanMarkdown(
      composeTrainingPlan({ ...BASE, goal: "muscle_gain", location: "bodyweight" }),
      "zh",
    );
    expect(bodyweight).not.toContain("史密斯機");
    expect(bodyweight).not.toContain("滑輪");
    const gym = renderPlanMarkdown(
      composeTrainingPlan({ ...BASE, goal: "muscle_gain", location: "gym" }),
      "zh",
    );
    expect(gym).toContain("史密斯機臥推");
  });

  it("varies weight-class guidance by gender", () => {
    const f = composeTrainingPlan({ ...BASE, gender: "female", weightClass: "slim" });
    const m = composeTrainingPlan({ ...BASE, gender: "male", weightClass: "slim" });
    expect(f.weightNote.zh).toContain("練壯");
    expect(m.weightNote.zh).not.toContain("練壯");
  });

  it("always includes nutrition guidance (no on/off toggle) and labels the diet mode", () => {
    const plan = composeTrainingPlan({ ...BASE, dietMode: "fat_loss" });
    expect(plan.nutrition.label.zh).toBe("減脂飲食");
    const fasting = composeTrainingPlan({ ...BASE, dietMode: "intermittent_fasting" });
    expect(fasting.nutrition.body.some((p) => p.zh.includes("16/8"))).toBe(true);
  });

  it("supports the functional (Hyrox/CrossFit) and general_fitness goals at every location", () => {
    for (const location of TRAINING_LOCATIONS) {
      const functional = composeTrainingPlan({ ...BASE, goal: "functional", location });
      expect(functional.weeks[0]!.days.find((d) => d.session)!.session!.main.length).toBeGreaterThan(0);
      const general = composeTrainingPlan({ ...BASE, goal: "general_fitness", location });
      expect(general.weeks[0]!.days.find((d) => d.session)!.session!.main.length).toBeGreaterThan(0);
    }
  });

  it("gives every exercise a stable ref", () => {
    const plan = composeTrainingPlan(BASE);
    const session = plan.weeks[0]!.days.find((d) => d.session)!.session!;
    for (const entry of [...session.warmup, ...session.main, ...session.cooldown]) {
      expect(entry.ref.length).toBeGreaterThan(0);
    }
  });
});

describe("renderPlanMarkdown", () => {
  it("renders the fixed 60-minute section headers in the selected locale", () => {
    const plan = composeTrainingPlan(BASE);
    const zh = renderPlanMarkdown(plan, "zh");
    expect(zh).toContain("暖身（10 分鐘）");
    expect(zh).toContain("主訓練（40 分鐘）");
    expect(zh).toContain("收操（10 分鐘）");

    const en = renderPlanMarkdown(plan, "en");
    expect(en).toContain("Warm-up (10 min)");
    expect(en).toContain("Main Training (40 min)");
    expect(en).toContain("Cool-down (10 min)");
  });
});
