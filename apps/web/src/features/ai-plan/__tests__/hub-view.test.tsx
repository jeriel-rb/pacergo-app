import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/onboarding.json";
import zh from "@/locales/zh/onboarding.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/en/ai-plan/setup",
}));

const resetForUpdate = vi.fn();
let store: Record<string, unknown>;
vi.mock("@/features/ai-plan/onboarding-store", () => ({
  useOnboarding: () => store,
}));

import { HubView } from "../onboarding/hub-view";

function i18n(lng: "en" | "zh") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["onboarding"],
    defaultNS: "onboarding",
    resources: { en: { onboarding: en }, zh: { onboarding: zh } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function setStore(done: { aboutYou: boolean; trainingPreferences: boolean; gymEquipment: boolean }) {
  store = {
    answers: {},
    trainingPreferences: {},
    completedSteps: done,
    generatedPlan: null,
    hasSavedProfile: done.aboutYou,
    resetForUpdate,
  };
}

const ALL = { aboutYou: true, trainingPreferences: true, gymEquipment: true };

function renderHub(activePlanId: string | null, lng: "en" | "zh" = "en") {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <HubView activePlanId={activePlanId} />
    </I18nextProvider>,
  );
}

describe("Setup hub (/ai-plan/setup)", () => {
  beforeEach(() => {
    push.mockClear();
    resetForUpdate.mockClear();
  });

  describe("A. onboarding not completed", () => {
    it("shows the Start CTA and routes into onboarding", () => {
      setStore({ aboutYou: false, trainingPreferences: false, gymEquipment: false });
      renderHub(null);
      fireEvent.click(screen.getByRole("button", { name: "Go to Basics" }));
      expect(push).toHaveBeenCalledWith(expect.stringContaining("/ai-plan/about-you/"));
    });

    it("resumes at the first incomplete section instead of restarting", () => {
      setStore({ aboutYou: true, trainingPreferences: false, gymEquipment: false });
      renderHub(null);
      fireEvent.click(screen.getByRole("button", { name: /^Go to / }));
      expect(push).toHaveBeenCalledWith(expect.stringContaining("/ai-plan/training-preferences/"));
    });

    it("a fresh start shows every section to do — no Edit, no plan CTAs — even with a plan", () => {
      setStore({ aboutYou: false, trainingPreferences: false, gymEquipment: false });
      (store as { hasSavedProfile: boolean }).hasSavedProfile = false;
      renderHub("plan-abc");
      expect(screen.getByRole("button", { name: "Go to Basics" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByText("View My Training Plan")).not.toBeInTheDocument();
      expect(screen.queryByText(/filled in what we already know/i)).not.toBeInTheDocument();
    });

    it("does not offer plan CTAs", () => {
      setStore({ aboutYou: true, trainingPreferences: true, gymEquipment: false });
      renderHub(null);
      expect(screen.queryByText("View My Training Plan")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Plan from My Profile")).not.toBeInTheDocument();
    });
  });

  describe("C. onboarding complete + active plan", () => {
    it("is not a dead end: View My Training Plan opens the active plan", () => {
      setStore(ALL);
      renderHub("plan-abc");
      fireEvent.click(screen.getByRole("button", { name: "View My Training Plan" }));
      expect(push).toHaveBeenCalledWith("/en/ai-plan/plan/plan-abc");
    });

    it("does not restart onboarding automatically", () => {
      setStore(ALL);
      renderHub("plan-abc");
      expect(screen.queryByRole("button", { name: /Go to Basics/ })).not.toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("replacing the plan is an explicit action (Create New Plan → split step)", () => {
      setStore(ALL);
      renderHub("plan-abc");
      fireEvent.click(screen.getByRole("button", { name: "Create New Plan" }));
      expect(push).toHaveBeenCalledWith("/en/ai-plan/recommended-split");
    });

    it("editing answers only happens via Review/Edit and resets the draft first", () => {
      setStore(ALL);
      renderHub("plan-abc");
      fireEvent.click(screen.getByRole("button", { name: "Review My Answers" }));
      expect(resetForUpdate).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith(expect.stringContaining("/ai-plan/about-you/"));
    });

    it("renders the View CTA in Chinese too", () => {
      setStore(ALL);
      renderHub("plan-abc", "zh");
      expect(screen.getByRole("button", { name: "查看我的訓練計畫" })).toBeInTheDocument();
    });
  });

  describe("D. onboarding complete but active plan missing", () => {
    it("shows the recovery message and a regenerate CTA", () => {
      setStore(ALL);
      renderHub(null);
      expect(screen.getByText(/no active training plan/i)).toBeInTheDocument();
      expect(screen.queryByText("View My Training Plan")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Create Plan from My Profile" }));
      expect(push).toHaveBeenCalledWith("/en/ai-plan/recommended-split");
    });

    it("still allows reviewing answers", () => {
      setStore(ALL);
      renderHub(null);
      expect(screen.getByRole("button", { name: "Review My Answers" })).toBeInTheDocument();
    });
  });
});
