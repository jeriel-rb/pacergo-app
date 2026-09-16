"use client";

import type { BookingRecord, BookingStatus } from "@pacergo/shared";
import { formatInAppTimeZone } from "@pacergo/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<BookingStatus, string> = {
  requested: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  pending_payment: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  payment_processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  payment_failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-primary/15 text-primary",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

/** Colored status pill for a booking. */
export function StatusBadge({
  status,
  label,
}: {
  status: BookingStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {label}
    </span>
  );
}

/** The other party in a booking, from the current user's perspective. */
export function counterparty(b: BookingRecord, currentUserId: string | null) {
  const iAmSeeker = currentUserId === b.seeker_id;
  return {
    iAmSeeker,
    name: (iAmSeeker ? b.companion_name : b.seeker_name) ?? "—",
    photo: iAmSeeker ? b.companion_photo : b.seeker_photo,
  };
}

/** Format a booking's scheduled time, or a "flexible" fallback when unset. */
export function formatWhen(
  iso: string | null,
  locale: "zh" | "en",
  fallback: string,
): string {
  if (!iso) return fallback;
  return formatInAppTimeZone(iso, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
