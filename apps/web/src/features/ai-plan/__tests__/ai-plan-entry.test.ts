import { describe, it, expect, vi, beforeEach } from "vitest";

const getActivePlanIdServer = vi.fn();
const getPlanGenerationInProgressServer = vi.fn();
vi.mock("@/lib/plan-view.server", () => ({
  getActivePlanIdServer: () => getActivePlanIdServer(),
  getPlanGenerationInProgressServer: () => getPlanGenerationInProgressServer(),
}));

// Next's redirect() throws; mirror that so the target path can be asserted.
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import AiPlanPage from "../../../app/[locale]/(tabs)/ai-plan/page";

async function entryTarget(locale: string): Promise<string> {
  try {
    await AiPlanPage({ params: Promise.resolve({ locale }) });
  } catch (e) {
    return (e as Error).message.replace("REDIRECT:", "");
  }
  throw new Error("expected a redirect");
}

describe("AI Training Plan entry (/ai-plan)", () => {
  beforeEach(() => {
    getActivePlanIdServer.mockReset();
    getPlanGenerationInProgressServer.mockReset().mockResolvedValue(false);
  });

  it("opens the active plan directly (state C)", async () => {
    getActivePlanIdServer.mockResolvedValue("plan-123");
    expect(await entryTarget("en")).toBe("/en/ai-plan/plan/plan-123");
  });

  it("keeps the locale prefix for zh", async () => {
    getActivePlanIdServer.mockResolvedValue("plan-123");
    expect(await entryTarget("zh")).toMatch(/\/ai-plan\/plan\/plan-123$/);
  });

  it("goes to setup when there is no plan (states A and D)", async () => {
    getActivePlanIdServer.mockResolvedValue(null);
    expect(await entryTarget("en")).toMatch(/\/ai-plan\/setup$/);
  });

  it("falls back to setup, not an error page, if the lookup throws", async () => {
    getActivePlanIdServer.mockRejectedValue(new Error("rpc failed"));
    expect(await entryTarget("en")).toMatch(/\/ai-plan\/setup$/);
  });

  describe("interrupted generation (tab closed mid-build)", () => {
    it("resumes creating the plan instead of showing setup / 'no plan'", async () => {
      getActivePlanIdServer.mockResolvedValue(null);
      getPlanGenerationInProgressServer.mockResolvedValue(true);
      expect(await entryTarget("en")).toBe("/en/ai-plan/creating-plan");
    });

    it("an existing active plan always wins over a pending build", async () => {
      getActivePlanIdServer.mockResolvedValue("plan-123");
      getPlanGenerationInProgressServer.mockResolvedValue(true);
      expect(await entryTarget("en")).toBe("/en/ai-plan/plan/plan-123");
    });

    it("goes to setup if the marker lookup fails", async () => {
      getActivePlanIdServer.mockResolvedValue(null);
      getPlanGenerationInProgressServer.mockRejectedValue(new Error("rpc failed"));
      expect(await entryTarget("en")).toMatch(/\/ai-plan\/setup$/);
    });
  });
});
