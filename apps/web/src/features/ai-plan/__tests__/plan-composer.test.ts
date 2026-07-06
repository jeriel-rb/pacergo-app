import { describe, it, expect } from "vitest";
import {
  TRAINING_GOALS,
  TRAINING_LOCATIONS,
  TRAINING_FREQUENCIES,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  WEIGHT_CLASSES,
  AGE_BANDS,
  DIET_MODES,
} from "@pacergo/shared";
import { composePlan, type PlanSelection } from "../plan-composer";

const BASE: PlanSelection = {
  goal: "muscle_gain",
  gender: "male",
  level: "beginner",
  ageBand: "adult",
  weightClass: "medium",
  frequency: "mid",
  location: "full_gym",
  nutrition: true,
  dietMode: "none",
  locale: "zh",
};

describe("composePlan", () => {
  it("always emits the fixed 60-minute structure (10 warm-up / 40 main / 10 cool-down)", () => {
    for (const goal of TRAINING_GOALS) {
      for (const location of TRAINING_LOCATIONS) {
        for (const level of EXPERIENCE_LEVELS) {
          const md = composePlan({ ...BASE, goal, location, level });
          expect(md).toContain("60 分鐘");
          expect(md).toContain("## 暖身（10 分鐘）");
          expect(md).toContain("## 主訓練（40 分鐘）");
          expect(md).toContain("## 收操（10 分鐘）");
        }
      }
    }
  });

  it("composes a non-empty menu for every full combination", () => {
    for (const goal of TRAINING_GOALS)
      for (const gender of PLAN_GENDERS)
        for (const level of EXPERIENCE_LEVELS)
          for (const ageBand of AGE_BANDS)
            for (const weightClass of WEIGHT_CLASSES)
              for (const frequency of TRAINING_FREQUENCIES)
                for (const location of TRAINING_LOCATIONS)
                  for (const dietMode of DIET_MODES) {
                    const md = composePlan({
                      ...BASE,
                      goal,
                      gender,
                      level,
                      ageBand,
                      weightClass,
                      frequency,
                      location,
                      dietMode,
                    });
                    expect(md.length).toBeGreaterThan(500);
                    expect(md).not.toContain("undefined");
                  }
  });

  it("constrains exercises to the training location", () => {
    const home = composePlan({ ...BASE, goal: "muscle_gain", location: "home" });
    expect(home).not.toContain("史密斯機");
    expect(home).not.toContain("滑輪");
    const gym = composePlan({ ...BASE, goal: "muscle_gain", location: "full_gym" });
    expect(gym).toContain("史密斯機臥推");
  });

  it("includes the weekly schedule matching the chosen frequency", () => {
    expect(composePlan({ ...BASE, frequency: "low" })).toContain("一週 1–2 天");
    expect(composePlan({ ...BASE, frequency: "high" })).toContain("一週 5 天以上");
  });

  it("varies weight-class guidance by gender", () => {
    const f = composePlan({ ...BASE, gender: "female", weightClass: "slim" });
    const m = composePlan({ ...BASE, gender: "male", weightClass: "slim" });
    expect(f).toContain("練壯");
    expect(m).not.toContain("練壯");
  });

  it("omits nutrition when disabled, and labels the chosen diet mode", () => {
    expect(composePlan({ ...BASE, nutrition: false })).not.toContain("營養建議");
    expect(composePlan({ ...BASE, dietMode: "fat_loss" })).toContain(
      "## 營養建議（減脂飲食）",
    );
    expect(
      composePlan({ ...BASE, dietMode: "intermittent_fasting" }),
    ).toContain("16/8");
  });

  it("adds the fasting caution for youth users", () => {
    const md = composePlan({
      ...BASE,
      ageBand: "youth",
      dietMode: "intermittent_fasting",
    });
    expect(md).toContain("青少年成長期不建議長時間斷食");
  });

  it("supports the functional (Hyrox/CrossFit) goal at every location", () => {
    for (const location of TRAINING_LOCATIONS) {
      const md = composePlan({ ...BASE, goal: "functional", location });
      expect(md).toContain("功能性表現");
    }
  });
});
