import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enHome from "@/locales/en/home.json";
import enTrainer from "@/locales/en/trainer.json";
import enCommon from "@/locales/en/common.json";
import type { UserProfile } from "@pacergo/shared";

vi.mock("../profile-setup-dialog", () => ({ ProfileSetupDialog: () => null }));
vi.mock("../recommended-trainers", () => ({ RecommendedTrainers: () => null }));
vi.mock("../weekly-progress-card", () => ({ WeeklyProgressCard: () => null }));

import { HomeView } from "../home-view";

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["home", "trainer", "common"],
    defaultNS: "home",
    resources: { en: { home: enHome, trainer: enTrainer, common: enCommon } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const user = { id: "u1", display_name: "Ada Lin" } as UserProfile;

function renderHome(hasActivePlan: boolean) {
  return render(
    <I18nextProvider i18n={i18n()}>
      <HomeView
        trainers={[]}
        user={user}
        weeklyProgress={{ target: 3, done: 1, planId: hasActivePlan ? "plan-1" : null } as never}
        hasActivePlan={hasActivePlan}
      />
    </I18nextProvider>,
  );
}

describe("Home → AI plan button", () => {
  it("starts a fresh onboarding (/ai-plan/new) when the user already has a plan", () => {
    renderHome(true);
    const link = screen.getByRole("link", { name: /AI plan/i });
    expect(link).toHaveAttribute("href", "/en/ai-plan/new");
    expect(link.getAttribute("href")).not.toMatch(/\/plan\/|my-plans|setup|about-you/);
  });

  it("goes through /ai-plan (which resumes an interrupted build) when there is no plan", () => {
    renderHome(false);
    expect(screen.getByRole("link", { name: /^AI plan/i })).toHaveAttribute("href", "/en/ai-plan");
  });
});
