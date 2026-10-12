import { describe, expect, it } from "vitest";
import { generateTrainingPlan } from "../plan/generate-plan";
import { generatorInputFromMobileSelection } from "../plan/from-mobile-selection";
import type { PlanSelection } from "../plan/plan-types";
import { loadMigrationCatalog } from "./helpers/migration-catalog";

const selection: PlanSelection = {
  goal: "fat_loss",
  gender: "male",
  level: "beginner",
  frequency: "2x",
  location: "gym",
  locale: "en",
};

describe("mobile selection → plan generator", () => {
  it("keeps Beginner and Basic as the web plan words, and one session for 1x", () => {
    const input = generatorInputFromMobileSelection(selection);
    expect(input.trainingPreferences.experience).toBe("beginner");
    expect(
      generatorInputFromMobileSelection({ ...selection, level: "basic" }).trainingPreferences
        .experience,
    ).toBe("basic");
    expect(input.answers.goal).toBe("lose_weight");
    const once = generatorInputFromMobileSelection({ ...selection, frequency: "1x" });
    expect(once.trainingPreferences.daysPerWeek).toBe("1");
    expect(once.trainingPreferences.trainingDays).toEqual([2]);
  });

  it("builds the same plan twice from the same chips", () => {
    const exercises = loadMigrationCatalog();
    const input = generatorInputFromMobileSelection({ ...selection, level: "intermediate" });
    const a = generateTrainingPlan({ ...input, exercises });
    const b = generateTrainingPlan({ ...input, exercises });
    expect(a).toEqual(b);
    expect(a.weeks).toHaveLength(4);
    expect(a.weeks[0]?.days.filter((d) => !d.isRestDay)).toHaveLength(2);
  });
});
