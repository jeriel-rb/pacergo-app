import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sessions from "@/locales/en/sessions.json";
import trainer from "@/locales/en/trainer.json";
import common from "@/locales/en/common.json";
import type { AvailabilitySlot } from "@pacergo/shared";
import { BookingWhenField } from "../booking-when-field";

function i18n() {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["sessions", "trainer", "common"],
    defaultNS: "sessions",
    resources: { en: { sessions, trainer, common } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const h = (hh: number) => hh * 60;
const monEvening: AvailabilitySlot[] = [{ weekday: 1, start_minute: h(18), end_minute: h(20) }];
const MONDAY = new Date(2026, 9, 26); // calendar cell, local midnight
const LONG_AGO = new Date("2026-01-01T00:00:00Z");

function renderField(
  props: Partial<React.ComponentProps<typeof BookingWhenField>> = {},
) {
  const onDateChange = vi.fn();
  const onTimeChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n()}>
      <BookingWhenField
        availability={monEvening}
        sessionMinutes={60}
        date={undefined}
        time=""
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        now={LONG_AGO}
        {...props}
      />
    </I18nextProvider>,
  );
  return { onDateChange, onTimeChange };
}

describe("Booking form → when", () => {
  it("shows the trainer's weekly windows the way the trainer page does", () => {
    renderField();
    expect(screen.getByText("Mon 18:00–20:00")).toBeInTheDocument();
  });

  it("groups days that share a window", () => {
    const sunToFri = [0, 1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      start_minute: h(18),
      end_minute: h(20),
    }));
    renderField({ availability: sunToFri });
    expect(screen.getByText("Sun, Mon, Tue, Wed, Thu, Fri 18:00–20:00")).toBeInTheDocument();
  });

  it("asks for a day before showing times", () => {
    renderField();
    expect(screen.getByText(sessions.book.pickDayFirst)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "18:00" })).not.toBeInTheDocument();
  });

  it("offers only start times inside the window for the chosen day", () => {
    const { onTimeChange } = renderField({ date: MONDAY, time: "18:00" });
    const group = screen.getByRole("group", { name: sessions.book.startTime });
    const times = Array.from(group.querySelectorAll("button")).map((b) => b.textContent);
    expect(times).toEqual(["18:00", "18:30", "19:00"]);
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "18:30" }));
    expect(onTimeChange).toHaveBeenCalledWith("18:30");
  });

  it("fits the chosen plan's length (a 2-hour session can only start at 18:00)", () => {
    renderField({ date: MONDAY, sessionMinutes: 120 });
    const group = screen.getByRole("group", { name: sessions.book.startTime });
    expect(Array.from(group.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "18:00",
    ]);
  });

  it("explains when the trainer has no availability, with no pickers to fight", () => {
    renderField({ availability: [] });
    expect(screen.getByText(sessions.book.noAvailability)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: sessions.book.whenDate })).not.toBeInTheDocument();
  });
});
