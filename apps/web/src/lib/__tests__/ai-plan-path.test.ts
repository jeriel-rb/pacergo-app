import { describe, expect, it } from "vitest";
import { aiPlanHref, aiPlanRoot, planOverviewHref, workoutDayHref, workoutOverviewHref } from "../ai-plan-path";

describe("ai plan paths", () => {
  it("keeps an English prefix and lands on a known page", () => {
    expect(aiPlanHref("/en/ai-plan/plan/abc/update", "/my-plans")).toBe("/en/ai-plan/my-plans");
    expect(aiPlanHref("/en/ai-plan/plan-ready", "/plan/plan-1")).toBe("/en/ai-plan/plan/plan-1");
  });

  it("keeps the unprefixed Chinese root", () => {
    expect(aiPlanRoot("/ai-plan/setup")).toBe("/ai-plan");
    expect(aiPlanHref("/ai-plan/my-plans", "/nutrition")).toBe("/ai-plan/nutrition");
  });

  it("walks the plan, day, and exercise segments", () => {
    expect(planOverviewHref("/en/ai-plan/plan/abc/update")).toBe("/en/ai-plan/plan/abc");
    expect(workoutOverviewHref("/en/ai-plan/plan/abc/day/3")).toBe("/en/ai-plan/plan/abc");
    expect(workoutDayHref("/en/ai-plan/plan/abc/day/3/exercise/squat")).toBe("/en/ai-plan/plan/abc/day/3");
  });
});
