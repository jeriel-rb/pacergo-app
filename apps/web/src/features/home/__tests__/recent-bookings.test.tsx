import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enHome from "@/locales/en/home.json";
import enSessions from "@/locales/en/sessions.json";
import type { BookingRecord } from "@pacergo/shared";
import { RecentBookings } from "../recent-bookings";

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["home", "sessions"],
    defaultNS: "home",
    resources: { en: { home: enHome, sessions: enSessions } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function booking(id: string, over: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id,
    seeker_id: "me",
    companion_id: "coach",
    offering_id: null,
    activity_slug: "gym",
    tier: "C",
    status: "accepted",
    scheduled_start: null,
    duration_min: 60,
    location_name: null,
    agreed_price: 400,
    is_free: false,
    seeker_note: null,
    seeker_name: "Me",
    seeker_photo: null,
    companion_name: `Coach ${id}`,
    companion_photo: null,
    completed_at: null,
    created_at: "2026-10-23T00:00:00Z",
    ...over,
  } as BookingRecord;
}

function renderRecent(bookings: BookingRecord[], currentUserId = "me") {
  return render(
    <I18nextProvider i18n={i18n()}>
      <RecentBookings bookings={bookings} currentUserId={currentUserId} />
    </I18nextProvider>,
  );
}

describe("Home → Recent bookings", () => {
  it("lists each booking, linking to its detail page, with View all to the bookings page", () => {
    renderRecent([booking("b1"), booking("b2", { status: "pending_payment" })]);
    const section = screen.getByRole("region", { name: "Recent bookings" });
    expect(within(section).getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/en/sessions",
    );
    expect(within(section).getByRole("link", { name: /Coach b1/ })).toHaveAttribute(
      "href",
      "/en/sessions/b1",
    );
    expect(within(section).getByText("Pending payment")).toBeInTheDocument();
  });

  it("labels the other party from the viewer's side (a trainer sees their client)", () => {
    renderRecent([booking("b1", { seeker_id: "client", seeker_name: "Ada" })], "coach");
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Your client")).toBeInTheDocument();
  });

  it("shows at most 5, newest first as given", () => {
    renderRecent(["b1", "b2", "b3", "b4", "b5", "b6", "b7"].map((id) => booking(id)));
    const rows = screen.getAllByRole("link", { name: /Coach b/ });
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveAccessibleName(/Coach b1/);
    expect(screen.queryByText("Coach b6")).not.toBeInTheDocument();
  });

  it("has an empty state that points to the trainers list", () => {
    renderRecent([]);
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a trainer" })).toHaveAttribute(
      "href",
      "/en/trainers",
    );
    // View all stays, so the bookings page is always one tap away.
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute("href", "/en/sessions");
  });
});
