import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/onboarding.json";
import enPlan from "@/locales/en/plan.json";

const push = vi.fn();
let pathname = "/en/ai-plan/plan-ready";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

const saveTrainingPlan = vi.fn();
const beginPlanGeneration = vi.fn();
const composeSavedPlan = vi.fn();
vi.mock("@/lib/plans", () => ({
  saveTrainingPlan: (...a: unknown[]) => saveTrainingPlan(...a),
  beginPlanGeneration: () => beginPlanGeneration(),
  composeSavedPlan: (...a: unknown[]) => composeSavedPlan(...a),
}));
vi.mock("@/lib/exercises", () => ({ fetchAllExercises: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/workout-logs", () => ({
  fetchPlanPerformanceHistory: vi.fn().mockResolvedValue({}),
}));

const setSavedPlanId = vi.fn();
const setGeneratedPlan = vi.fn();
const markStepComplete = vi.fn();
const persistProfile = vi.fn().mockResolvedValue(undefined);
let store: Record<string, unknown>;
vi.mock("@/features/ai-plan/onboarding-store", () => ({
  useOnboarding: () => store,
}));

import { PlanReadyView } from "../onboarding/plan-ready-view";
import { CreatingPlanView } from "../onboarding/creating-plan-view";
import { PlanNotFound } from "../plan/plan-not-found";

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["onboarding", "plan"],
    defaultNS: "onboarding",
    resources: { en: { onboarding: en, plan: enPlan } },
    interpolation: { escapeValue: false },
  });
  return instance;
}
const wrap = (ui: React.ReactElement) => <I18nextProvider i18n={i18n()}>{ui}</I18nextProvider>;

function makeStore(over: Record<string, unknown> = {}) {
  store = {
    answers: { goal: "build_muscle", heightCm: 170, weightKg: 65, unit: "metric", age: 30 },
    trainingPreferences: {},
    gymEquipment: {},
    generatedPlan: { weeks: [] },
    savedPlanId: null,
    nutritionStatus: "built", // skip the nutrition detour so targets are the plan path
    setGeneratedPlan,
    setSavedPlanId,
    markStepComplete,
    persistProfile,
    ...over,
  };
}

beforeEach(() => {
  push.mockClear();
  saveTrainingPlan.mockReset();
  beginPlanGeneration.mockReset().mockResolvedValue(undefined);
  composeSavedPlan.mockReset().mockResolvedValue({ weeks: [{ days: [] }] });
  setSavedPlanId.mockClear();
  markStepComplete.mockClear();
  pathname = "/en/ai-plan/plan-ready";
  makeStore();
});

describe("Plan-ready (setup-complete) screen — not a dead end", () => {
  it("shows 'View My Training Plan' once the plan is saved and opens it", () => {
    makeStore({ savedPlanId: "plan-1" });
    render(wrap(<PlanReadyView />));
    fireEvent.click(screen.getByRole("button", { name: "View My Training Plan" }));
    expect(push).toHaveBeenCalledWith("/en/ai-plan/plan/plan-1");
  });

  it("offers an AI-nutrition detour the first time, carrying the plan as `next`", () => {
    makeStore({ savedPlanId: "plan-1", nutritionStatus: null });
    render(wrap(<PlanReadyView />));
    fireEvent.click(screen.getByRole("button", { name: "View My Training Plan" }));
    expect(push).toHaveBeenCalledWith(
      `/en/ai-plan/nutrition?next=${encodeURIComponent("/en/ai-plan/plan/plan-1")}`,
    );
  });

  it("recovers when the earlier auto-save failed: Save My Plan saves and opens the plan", async () => {
    saveTrainingPlan.mockResolvedValue("plan-2");
    render(wrap(<PlanReadyView />));
    fireEvent.click(screen.getByRole("button", { name: "Save My Plan" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/en/ai-plan/plan/plan-2"));
    expect(saveTrainingPlan).toHaveBeenCalledTimes(1);
    expect(setSavedPlanId).toHaveBeenCalledWith("plan-2");
    expect(markStepComplete).toHaveBeenCalledWith("gymEquipment");
  });

  it("regenerates the plan if none is in memory (screen opened directly)", async () => {
    makeStore({ generatedPlan: null });
    saveTrainingPlan.mockResolvedValue("plan-3");
    render(wrap(<PlanReadyView />));
    fireEvent.click(screen.getByRole("button", { name: "Save My Plan" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/en/ai-plan/plan/plan-3"));
    expect(composeSavedPlan).toHaveBeenCalledTimes(1);
  });

  it("shows an error and keeps the retry button when saving fails", async () => {
    saveTrainingPlan.mockRejectedValue(new Error("boom"));
    render(wrap(<PlanReadyView />));
    fireEvent.click(screen.getByRole("button", { name: "Save My Plan" }));
    expect(await screen.findByText(/Something went wrong saving your plan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save My Plan" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("Creating-plan screen (state B: generating)", () => {
  beforeEach(() => {
    pathname = "/en/ai-plan/creating-plan";
    vi.useFakeTimers({ toFake: ["setTimeout", "performance", "requestAnimationFrame", "cancelAnimationFrame"] });
  });
  afterEach(() => vi.useRealTimers());

  it("shows a progress/loading state while generating", () => {
    saveTrainingPlan.mockReturnValue(new Promise(() => {}));
    render(wrap(<CreatingPlanView />));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("saves the generated plan to the account without waiting for a later tap", async () => {
    saveTrainingPlan.mockResolvedValue("plan-9");
    render(wrap(<CreatingPlanView />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(saveTrainingPlan).toHaveBeenCalledTimes(1);
    expect(persistProfile).toHaveBeenCalled();
    expect(setSavedPlanId).toHaveBeenCalledWith("plan-9");
    expect(push).toHaveBeenCalledWith("/en/ai-plan/plan-ready");
  });

  it("marks the build as started before saving, so a closed tab can be resumed", async () => {
    const order: string[] = [];
    beginPlanGeneration.mockImplementation(async () => void order.push("begin"));
    saveTrainingPlan.mockImplementation(async () => {
      order.push("save");
      return "plan-9";
    });
    render(wrap(<CreatingPlanView />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(order).toEqual(["begin", "save"]);
  });

  it("still saves the plan if marking the build fails (marker is only a safety net)", async () => {
    beginPlanGeneration.mockRejectedValue(new Error("rpc down"));
    saveTrainingPlan.mockResolvedValue("plan-9");
    render(wrap(<CreatingPlanView />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(setSavedPlanId).toHaveBeenCalledWith("plan-9");
    expect(push).toHaveBeenCalledWith("/en/ai-plan/plan-ready");
  });

  it("hands off to plan-ready (retry UI) instead of hanging when saving fails", async () => {
    saveTrainingPlan.mockRejectedValue(new Error("offline"));
    render(wrap(<CreatingPlanView />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(setSavedPlanId).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/en/ai-plan/plan-ready");
  });
});

describe("Plan not found", () => {
  it("links back to the current plan entry and My Plans (never a dead end)", () => {
    render(wrap(<PlanNotFound />));
    expect(screen.getByRole("link", { name: "Open my current plan" })).toHaveAttribute("href", "/en/ai-plan");
    expect(screen.getByRole("link", { name: /My Plans/i })).toHaveAttribute("href", "/en/ai-plan/my-plans");
  });
});
