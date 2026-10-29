import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/studio.json";
import type { EarningsData, TrainerOrder } from "@/lib/earnings";
import { EarningsView, expectedEligibleAt } from "../earnings-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../earnings-actions", () => ({ requestWithdrawal: vi.fn() }));
vi.mock("../bank-account-form", () => ({ BankAccountForm: () => null }));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));

const DAY = 24 * 60 * 60 * 1000;
const future = (ms: number) => new Date(Date.now() + ms).toISOString();
const past = (ms: number) => new Date(Date.now() - ms).toISOString();

function order(over: Partial<TrainerOrder> & { payment_id: string }): TrainerOrder {
  return {
    booking_id: `b-${over.payment_id}`,
    seeker_name: "Mei",
    activity_slug: "gym",
    tier: "C",
    scheduled_start: past(3 * DAY),
    duration_min: 60,
    trainer_payable: 380,
    payment_status: "paid",
    refund_status: "none",
    service_completed_at: past(2 * DAY),
    settlement_hold_until: past(DAY),
    admin_hold: false,
    settlement_eligibility_status: "eligible",
    settlement_status: "unsettled",
    created_at: past(4 * DAY),
    ...over,
  };
}

function renderView(orders: TrainerOrder[], balance = 380) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["studio"],
    defaultNS: "studio",
    resources: { en: { studio: en } },
    interpolation: { escapeValue: false },
  });
  const data: EarningsData = { balance, orders, withdrawals: [], bank: null };
  return render(
    <I18nextProvider i18n={instance}>
      <EarningsView data={data} />
    </I18nextProvider>,
  );
}

describe("EarningsView — payout timing (B-6 visibility)", () => {
  it("explains the settlement rules on the page", () => {
    renderView([]);
    expect(screen.getByText("How payouts work")).toBeInTheDocument();
    expect(screen.getByText(/24-hour settlement hold/)).toBeInTheDocument();
  });

  it("tells an eligible order since when it has been payable", () => {
    renderView([order({ payment_id: "a" })]);
    expect(screen.getByText(/^Eligible for payout since /)).toBeInTheDocument();
  });

  it("shows the end of the hold for a completed service still inside it", () => {
    renderView([
      order({
        payment_id: "b",
        service_completed_at: past(DAY / 2),
        settlement_hold_until: future(DAY / 2),
        settlement_eligibility_status: "ineligible",
      }),
    ]);
    expect(screen.getByText(/^Service completed · eligible for payout from /)).toBeInTheDocument();
  });

  it("projects session end + 24 h for a session that has not happened yet", () => {
    renderView([
      order({
        payment_id: "c",
        scheduled_start: future(DAY),
        service_completed_at: null,
        settlement_hold_until: null,
        settlement_eligibility_status: "ineligible",
      }),
    ]);
    expect(screen.getByText(/^Session ends .* · eligible after the 24 h hold, about /)).toBeInTheDocument();
  });

  it("says why held or unpaid orders are not in the balance", () => {
    renderView([
      order({ payment_id: "d", admin_hold: true, settlement_eligibility_status: "ineligible" }),
      order({ payment_id: "e", payment_status: "failed", settlement_eligibility_status: "ineligible" }),
    ]);
    expect(screen.getByText("On hold by PacerGo admin · not counted in your balance")).toBeInTheDocument();
    expect(screen.getByText("Not paid · not counted in your balance")).toBeInTheDocument();
  });

  it("totals the money still inside the hold and names the next release", () => {
    renderView(
      [
        order({ payment_id: "a" }),
        order({
          payment_id: "b",
          trainer_payable: 475,
          service_completed_at: past(DAY / 2),
          settlement_hold_until: future(DAY / 2),
          settlement_eligibility_status: "ineligible",
        }),
        order({
          payment_id: "c",
          trainer_payable: 1140,
          scheduled_start: future(DAY),
          service_completed_at: null,
          settlement_hold_until: null,
          settlement_eligibility_status: "ineligible",
        }),
        order({ payment_id: "d", admin_hold: true, settlement_eligibility_status: "ineligible" }),
      ],
      380,
    );
    expect(screen.getByText(/In 24 h hold: NT\$1,615 · next release /)).toBeInTheDocument();
  });
});

describe("expectedEligibleAt", () => {
  it("prefers the recorded hold end, then completion + 24 h, then session end + 24 h", () => {
    const hold = future(DAY);
    expect(expectedEligibleAt(order({ payment_id: "x", settlement_hold_until: hold }))?.toISOString()).toBe(hold);
    const done = new Date("2026-10-26T11:00:00Z");
    expect(
      expectedEligibleAt(
        order({ payment_id: "y", settlement_hold_until: null, service_completed_at: done.toISOString() }),
      )?.getTime(),
    ).toBe(done.getTime() + DAY);
    const start = new Date("2026-11-01T02:00:00Z");
    expect(
      expectedEligibleAt(
        order({
          payment_id: "z",
          settlement_hold_until: null,
          service_completed_at: null,
          scheduled_start: start.toISOString(),
          duration_min: 90,
        }),
      )?.getTime(),
    ).toBe(start.getTime() + 90 * 60_000 + DAY);
    expect(
      expectedEligibleAt(
        order({ payment_id: "w", settlement_hold_until: null, service_completed_at: null, scheduled_start: null }),
      ),
    ).toBeNull();
  });
});
