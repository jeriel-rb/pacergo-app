"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BookingRecord } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { buttonVariants } from "@/shared/components/ui/button";
import { BookingRow, BookingsEmpty } from "@/features/booking/booking-row";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { RECENT_BOOKINGS_LIMIT } from "./recent-bookings-limit";

/**
 * Home's latest bookings, for members and trainers alike: whatever the user
 * booked or was booked for, newest first, with View all → My Sessions.
 */
export function RecentBookings({
  bookings,
  currentUserId,
}: {
  bookings: BookingRecord[];
  currentUserId: string | null;
}) {
  const { t } = useTranslation("home");
  const locale = useLocale();
  const recent = bookings.slice(0, RECENT_BOOKINGS_LIMIT);

  return (
    <Card className="p-4 sm:p-5">
      <section aria-labelledby="recent-bookings-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-bookings-title" className="text-sm font-semibold">
            {t("recentBookings.title")}
          </h2>
          <Link
            href={getLocalizedPath("/sessions", locale)}
            className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t("viewAll")}
            <ChevronRight size={16} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <BookingsEmpty
            title={t("recentBookings.emptyTitle")}
            body={t("recentBookings.emptyBody")}
            className="mt-4 border-dashed bg-transparent py-8"
            action={
              <Link
                href={getLocalizedPath("/trainers", locale)}
                className={cn(buttonVariants({ size: "sm" }), "gap-1.5 rounded-full")}
              >
                <Search size={14} aria-hidden />
                {t("recentBookings.findTrainer")}
              </Link>
            }
          />
        ) : (
          <div className="mt-4 space-y-2.5">
            {recent.map((b) => (
              <BookingRow key={b.id} booking={b} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>
    </Card>
  );
}
