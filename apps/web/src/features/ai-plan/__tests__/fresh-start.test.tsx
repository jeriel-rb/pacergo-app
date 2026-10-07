import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ONBOARDING_ANSWERS_DEFAULT, TRAINING_PREFERENCES_DEFAULT, GYM_EQUIPMENT_DEFAULT } from "@pacergo/shared";
import type { SavedFitnessProfile } from "@/lib/fitness-profile-row";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/en/ai-plan/new",
}));

const saveOnboardingAnswers = vi.fn();
vi.mock("@/lib/plans", () => ({
  saveOnboardingAnswers: (...a: unknown[]) => saveOnboardingAnswers(...a),
}));

import { OnboardingProvider, useOnboarding } from "../onboarding-store";
import { NewPlanStart } from "../onboarding/new-plan-start";

const saved: SavedFitnessProfile = {
  answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "build_muscle", age: 31, heightCm: 172, weightKg: 70 },
  trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, experience: "intermediate" },
  gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym" },
  nutrition: null,
  nutritionStatus: null,
  updatedAt: "2026-10-01T00:00:00Z",
};

let ctx: ReturnType<typeof useOnboarding>;
function Probe() {
  ctx = useOnboarding();
  return (
    <p data-testid="probe">
      {String(ctx.answers.goal)}|{String(ctx.answers.age)}|{String(ctx.trainingPreferences.experience)}|
      {String(ctx.gymEquipment.gymType)}|{String(ctx.hasSavedProfile)}
    </p>
  );
}

const mount = (child?: React.ReactNode) =>
  render(
    <OnboardingProvider userId="u1" savedProfile={saved}>
      <Probe />
      {child}
    </OnboardingProvider>,
  );

beforeEach(() => {
  replace.mockClear();
  saveOnboardingAnswers.mockReset().mockResolvedValue({ nutrition: null, updatedAt: "2026-10-02T00:00:00Z" });
  window.sessionStorage.clear();
});

describe("Fresh onboarding (Home → AI plan with an existing plan)", () => {
  it("normally prefills the wizard from the saved profile (baseline)", () => {
    mount();
    expect(screen.getByTestId("probe")).toHaveTextContent("build_muscle|31|intermediate|large_gym|true");
  });

  it("/ai-plan/new blanks every answer — the saved profile's hydrate does not overwrite it", async () => {
    mount(<NewPlanStart />);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(screen.getByTestId("probe")).toHaveTextContent("null|null|null|null|false");
  });

  it("then opens the Let's Get Started hub — not a question or the plan", async () => {
    mount(<NewPlanStart />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/en/ai-plan/setup"));
  });

  it("does not save partial answers over the account profile while answering", async () => {
    mount();
    act(() => ctx.startFresh());
    act(() => ctx.setGoal("lose_weight"));
    act(() => ctx.markStepComplete("aboutYou"));
    act(() => ctx.markStepComplete("trainingPreferences"));
    await act(async () => {});
    expect(saveOnboardingAnswers).not.toHaveBeenCalled();
  });

  it("saves the profile once the plan is built, and later sections save normally again", async () => {
    mount();
    act(() => ctx.startFresh());
    act(() => ctx.setGoal("lose_weight"));
    await act(async () => {
      await ctx.persistProfile();
    });
    expect(saveOnboardingAnswers).toHaveBeenCalledTimes(1);
    expect(saveOnboardingAnswers.mock.calls[0][0].answers.goal).toBe("lose_weight");

    act(() => ctx.markStepComplete("aboutYou"));
    await waitFor(() => expect(saveOnboardingAnswers).toHaveBeenCalledTimes(2));
  });

  it("outside a fresh start, finishing a section still saves right away", async () => {
    mount();
    act(() => ctx.markStepComplete("aboutYou"));
    await waitFor(() => expect(saveOnboardingAnswers).toHaveBeenCalledTimes(1));
  });
});
