import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sessions from "@/locales/en/sessions.json";
import type { BookingRecord, BookingStatus } from "@pacergo/shared";
import { BookingActionsBar } from "../booking-actions-bar";
import { StatusBadge } from "../booking-ui";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["sessions"],
    defaultNS: "sessions",
    resources: { en: { sessions } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const booking = (status: BookingStatus) =>
  ({ id: "b1", seeker_id: "member", companion_id: "coach", status }) as BookingRecord;

function renderBar(status: BookingStatus, currentUserId: string) {
  render(
    <I18nextProvider i18n={i18n()}>
      <BookingActionsBar booking={booking(status)} currentUserId={currentUserId} />
    </I18nextProvider>,
  );
}

describe("Only the trainer cancels", () => {
  it("gives the trainer a Cancel button while the booking waits for payment", () => {
    renderBar("pending_payment", "coach");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("gives the member no Cancel button, and says to message the trainer instead", () => {
    for (const status of ["requested", "pending_payment", "accepted"] as const) {
      renderBar(status, "member");
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    }
    expect(screen.getAllByText(sessions.cancelTrainerOnly)).toHaveLength(3);
  });

  it("drops the note once the booking is over", () => {
    renderBar("cancelled", "member");
    expect(screen.queryByText(sessions.cancelTrainerOnly)).not.toBeInTheDocument();
  });
});

describe("Cancelled tag", () => {
  it("is red in light and dark mode", () => {
    render(<StatusBadge status="cancelled" label="Cancelled" />);
    const cls = screen.getByText("Cancelled").className;
    expect(cls).toMatch(/\bbg-rose-/);
    expect(cls).toMatch(/\btext-rose-\d+/);
    expect(cls).toMatch(/\bdark:text-rose-/);
  });
});
