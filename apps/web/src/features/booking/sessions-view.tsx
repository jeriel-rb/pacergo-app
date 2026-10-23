"use client";

import { useTranslation } from "react-i18next";
import type { BookingRecord, BookingStatus } from "@pacergo/shared";
import { BookingRow, BookingsEmpty } from "./booking-row";

const PAST: BookingStatus[] = ["completed", "declined", "cancelled", "expired"];

/** "Sessions" page (under Me) — the user's bookings grouped by state. */
export function SessionsView({
  bookings,
  currentUserId,
}: {
  bookings: BookingRecord[];
  currentUserId: string | null;
}) {
  const { t } = useTranslation("sessions");

  const groups = [
    {
      key: "requests",
      items: bookings.filter((b) =>
        ["requested", "pending_payment", "payment_processing", "payment_failed"].includes(
          b.status,
        ),
      ),
    },
    { key: "upcoming", items: bookings.filter((b) => b.status === "accepted") },
    { key: "past", items: bookings.filter((b) => PAST.includes(b.status)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {bookings.length === 0 ? (
        <BookingsEmpty title={t("empty")} />
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <h2 className="text-sm font-semibold">{t(`groups.${g.key}`)}</h2>
            <div className="space-y-2.5">
              {g.items.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
