import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sessions from "@/locales/en/sessions.json";
import legal from "@/locales/en/legal.json";
import type { BookingRecord } from "@pacergo/shared";
import { BookingActionsBar } from "../booking-actions-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const acceptBooking = vi.fn();
const acceptBookingTerms = vi.fn();
vi.mock("../booking-actions", () => ({
  acceptBooking: (...a: unknown[]) => acceptBooking(...a),
  acceptBookingTerms: (...a: unknown[]) => acceptBookingTerms(...a),
  declineBooking: vi.fn(),
  cancelBooking: vi.fn(),
  completeBooking: vi.fn(),
}));

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["sessions", "legal"],
    defaultNS: "sessions",
    resources: { en: { sessions, legal } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const booking = {
  id: "b1",
  seeker_id: "member",
  companion_id: "coach",
  status: "requested",
  activity_slug: "running",
} as BookingRecord;

function renderBar(currentUserId: string) {
  render(
    <I18nextProvider i18n={i18n()}>
      <BookingActionsBar booking={booking} currentUserId={currentUserId} />
    </I18nextProvider>,
  );
}

const terms = legal.bookingTerms;

beforeEach(() => {
  acceptBooking.mockReset().mockResolvedValue(undefined);
  acceptBookingTerms.mockReset().mockResolvedValue(undefined);
});

describe("Trainer agrees to the safety terms before accepting", () => {
  it("opens the terms instead of accepting straight away", () => {
    renderBar("coach");
    fireEvent.click(screen.getByRole("button", { name: sessions.actions.accept }));
    expect(screen.getByText(terms.dialog.title.companion)).toBeInTheDocument();
    expect(screen.getByText(terms.activities.running.title)).toBeInTheDocument();
    expect(acceptBooking).not.toHaveBeenCalled();
  });

  it("records the agreement, then accepts", async () => {
    renderBar("coach");
    fireEvent.click(screen.getByRole("button", { name: sessions.actions.accept }));
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.confirm.companion }));
    await waitFor(() => expect(acceptBooking).toHaveBeenCalledWith("b1"));
    expect(acceptBookingTerms).toHaveBeenCalledWith("b1", "en");
    expect(acceptBookingTerms.mock.invocationCallOrder[0]).toBeLessThan(
      acceptBooking.mock.invocationCallOrder[0],
    );
  });

  it("does not accept when the trainer backs out", () => {
    renderBar("coach");
    fireEvent.click(screen.getByRole("button", { name: sessions.actions.accept }));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.back }));
    expect(acceptBookingTerms).not.toHaveBeenCalled();
    expect(acceptBooking).not.toHaveBeenCalled();
  });

  it("explains a server refusal for missing terms in plain words", async () => {
    acceptBooking.mockRejectedValueOnce(new Error("booking_terms_not_accepted"));
    renderBar("coach");
    fireEvent.click(screen.getByRole("button", { name: sessions.actions.accept }));
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.confirm.companion }));
    expect(await screen.findByText(terms.notAccepted)).toBeInTheDocument();
  });
});
