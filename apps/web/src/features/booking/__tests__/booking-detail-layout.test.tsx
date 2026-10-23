import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sessions from "@/locales/en/sessions.json";
import chat from "@/locales/en/chat.json";
import type { BookingRecord } from "@pacergo/shared";
import { BookingDetailView } from "../booking-detail-view";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/sessions/b1",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    removeChannel: vi.fn(),
  }),
}));

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["sessions", "chat"],
    defaultNS: "sessions",
    resources: { en: { sessions, chat } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const booking = {
  id: "b1",
  seeker_id: "member",
  companion_id: "coach",
  status: "pending_payment",
  activity_slug: "gym",
  tier: "C",
  scheduled_start: null,
  duration_min: 60,
  location_name: null,
  agreed_price: 400,
  is_free: false,
  seeker_name: "Ada",
  companion_name: "jeriel",
  seeker_photo: null,
  companion_photo: null,
} as unknown as BookingRecord;

describe("Booking detail → member awaiting payment", () => {
  it("keeps Pay and Message side by side, with the cancel note on its own line", () => {
    render(
      <I18nextProvider i18n={i18n()}>
        <BookingDetailView booking={booking} currentUserId="member" myReview={null} clientObstacle={null} />
      </I18nextProvider>,
    );
    const pay = screen.getByRole("link", { name: sessions.actions.pay });
    const note = screen.getByText(sessions.cancelTrainerOnly);
    const row = pay.parentElement!;

    expect(row).toContainElement(note);
    // the row wraps and the note claims a whole line after the buttons, so it
    // can never take a slot beside Pay / Message again
    expect(row.className).toMatch(/\bflex-wrap\b/);
    expect(note.className).toMatch(/\bbasis-full\b/);
    expect(note.className).toMatch(/\border-last\b/);
    expect(screen.getByRole("button", { name: /message/i })).toBeInTheDocument();
  });
});
