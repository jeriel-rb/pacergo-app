import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import payments from "@/locales/en/payments.json";
import legal from "@/locales/en/legal.json";
import { NewebPayButton } from "../newebpay-pay-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("../simulated-actions", () => ({ confirmSimulatedPayment: vi.fn() }));

const acceptBookingTerms = vi.fn();
vi.mock("@/features/booking/booking-actions", () => ({
  acceptBookingTerms: (...a: unknown[]) => acceptBookingTerms(...a),
}));

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["payments", "legal"],
    defaultNS: "payments",
    resources: { en: { payments, legal } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const fetchMock = vi.fn();
const terms = legal.bookingTerms;

beforeEach(() => {
  acceptBookingTerms.mockReset().mockResolvedValue(undefined);
  fetchMock.mockReset().mockResolvedValue({
    ok: false,
    json: async () => ({ error: "payment_terms_not_accepted" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderButton() {
  render(
    <I18nextProvider i18n={i18n()}>
      <NewebPayButton bookingId="b1" activitySlug="hyrox" />
    </I18nextProvider>,
  );
}

describe("Member agrees to the safety terms before paying", () => {
  it("opens the terms first and starts no checkout", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: payments.paySecurely }));
    expect(screen.getByText(terms.dialog.title.seeker)).toBeInTheDocument();
    expect(screen.getByText(terms.activities.hyrox.title)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records the agreement, then starts the checkout", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: payments.paySecurely }));
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.confirm.seeker }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(acceptBookingTerms).toHaveBeenCalledWith("b1", "en");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/payments/newebpay/create");
    expect(JSON.parse(String(init.body))).toMatchObject({ bookingId: "b1" });
  });

  it("explains a server refusal for missing terms", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: payments.paySecurely }));
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.confirm.seeker }));
    expect(await screen.findByText(payments.errors.payment_terms_not_accepted)).toBeInTheDocument();
  });
});
