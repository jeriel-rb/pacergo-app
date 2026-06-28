"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_META,
  type BookingRecord,
  type BookingStatus,
} from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { StatusBadge, counterparty, formatWhen } from "./booking-ui";

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
      items: bookings.filter((b) => b.status === "requested"),
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
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <CalendarClock size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
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

function BookingRow({
  booking,
  currentUserId,
}: {
  booking: BookingRecord;
  currentUserId: string | null;
}) {
  const { t } = useTranslation("sessions");
  const locale = useLocale();
  const pathname = usePathname();
  const href = getLocalizedPath(
    `/sessions/${booking.id}`,
    getCurrentLocale(pathname),
  );
  const other = counterparty(booking, currentUserId);
  const activity = booking.activity_slug
    ? ACTIVITY_META[booking.activity_slug][locale]
    : "";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-accent"
    >
      <InitialAvatar name={other.name} src={other.photo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{other.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {other.iAmSeeker ? t("roles.asSeeker") : t("roles.asCompanion")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {activity}
          {activity && " · "}
          {formatWhen(booking.scheduled_start, locale, t("flexible"))}
        </p>
      </div>
      <StatusBadge
        status={booking.status}
        label={t(`status.${booking.status}`)}
      />
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}
