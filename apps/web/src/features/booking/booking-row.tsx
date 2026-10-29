"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACTIVITY_META, type BookingRecord } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { RefundBadge, StatusBadge, counterparty, formatWhen, visibleRefund } from "./booking-ui";

/** One booking in a list (My Sessions, Home's recent bookings): links to its detail page. */
export function BookingRow({
  booking,
  currentUserId,
}: {
  booking: BookingRecord;
  currentUserId: string | null;
}) {
  const { t } = useTranslation("sessions");
  const locale = useLocale();
  const href = getLocalizedPath(`/sessions/${booking.id}`, locale);
  const other = counterparty(booking, currentUserId);
  const refund = visibleRefund(booking);
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
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge
          status={booking.status}
          label={t(`status.${booking.status}`)}
        />
        {refund && <RefundBadge status={refund} label={t(`refund.${refund}`)} />}
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** "No bookings" placeholder, with an optional next step underneath. */
export function BookingsEmpty({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <CalendarClock size={28} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {body && <p className="text-xs text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
