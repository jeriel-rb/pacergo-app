import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enSessions from "@/locales/en/sessions.json";
import zhSessions from "@/locales/zh/sessions.json";
import enTrainer from "@/locales/en/trainer.json";
import enCommon from "@/locales/en/common.json";
import type { CompanionOffering } from "@pacergo/shared";
import { bookingErrorKey } from "../booking-errors";
import { BookingSheet } from "../booking-sheet";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en/trainers/coach",
}));

const createBooking = vi.fn();
vi.mock("../booking-actions", () => ({
  createBooking: (...a: unknown[]) => createBooking(...a),
}));

const SERVER_MESSAGES = [
  "booking_time_overlap",
  "booking_undated_request_open",
  "booking_open_request_limit",
  "you already have an open booking with this companion",
  "cannot book a time in the past",
  "cannot book yourself",
  "offering not available",
  "booking not available",
  "not authenticated",
  "booking_unauthenticated",
  "accept not allowed",
  "decline not allowed",
  "complete not allowed",
  "booking_not_found",
  "booking_cancel_trainer_only",
  "booking_cancel_not_allowed",
];

function lookup(json: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], json);
}

describe("bookingErrorKey", () => {
  it("maps each server refusal to a key that exists in both languages", () => {
    for (const message of SERVER_MESSAGES) {
      const key = bookingErrorKey(new Error(message));
      expect(key, message).not.toBe("error");
      expect(typeof lookup(enSessions, key), `en ${key}`).toBe("string");
      expect(typeof lookup(zhSessions, key), `zh ${key}`).toBe("string");
    }
  });

  it("falls back to the generic message for anything unknown", () => {
    expect(bookingErrorKey(new Error("duplicate key value violates unique constraint"))).toBe("error");
    expect(bookingErrorKey("nope")).toBe("error");
    expect(bookingErrorKey(undefined)).toBe("error");
  });
});

function i18n(lng: "en" | "zh") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["sessions", "trainer", "common"],
    defaultNS: "sessions",
    resources: {
      en: { sessions: enSessions, trainer: enTrainer, common: enCommon },
      zh: { sessions: zhSessions, trainer: enTrainer, common: enCommon },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const offering = {
  id: "o1",
  activity: "walking",
  tier: "C",
  price_ntd: 600,
  is_free: false,
  session_minutes: 60,
} as CompanionOffering;

describe("Booking form errors", () => {
  it("shows the server's refusal in the reader's language, never raw English", async () => {
    createBooking.mockRejectedValueOnce(
      new Error("you already have an open booking with this companion"),
    );
    render(
      <I18nextProvider i18n={i18n("zh")}>
        <BookingSheet
          companionId="coach"
          companionName="Coach"
          offerings={[offering]}
          availability={[]}
          trigger={<button type="button">open</button>}
        />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    fireEvent.click(screen.getByRole("button", { name: zhSessions.book.submit }));

    expect(await screen.findByText(zhSessions.errors.openBookingExists)).toBeInTheDocument();
    expect(screen.queryByText(/open booking with this companion/)).not.toBeInTheDocument();
  });
});
