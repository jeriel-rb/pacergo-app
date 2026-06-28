"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  CalendarClock,
  Clock,
  MapPin,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_META,
  TIER_LABELS,
  type BookingRecord,
} from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import type { MyReview } from "@/lib/reviews";
import { StatusBadge, counterparty, formatWhen } from "./booking-ui";
import { BookingActionsBar } from "./booking-actions-bar";
import { ReviewSection } from "./review-section";

/** A single booking/session detail + its available actions. */
export function BookingDetailView({
  booking,
  currentUserId,
  myReview,
}: {
  booking: BookingRecord;
  currentUserId: string | null;
  myReview: MyReview | null;
}) {
  const { t } = useTranslation("sessions");
  const locale = useLocale();
  const pathname = usePathname();
  const backHref = getLocalizedPath("/sessions", getCurrentLocale(pathname));

  const other = counterparty(booking, currentUserId);
  const activityLabel = booking.activity_slug
    ? ACTIVITY_META[booking.activity_slug][locale]
    : "—";
  const tierLabel = booking.tier ? TIER_LABELS[booking.tier][locale] : "";

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft size={16} />
        {t("back")}
      </Link>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <InitialAvatar name={other.name} src={other.photo} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{other.name}</p>
            <p className="text-xs text-muted-foreground">
              {other.iAmSeeker ? t("roles.asSeeker") : t("roles.asCompanion")}
            </p>
          </div>
          <StatusBadge
            status={booking.status}
            label={t(`status.${booking.status}`)}
          />
        </div>

        <div className="space-y-2.5 border-t border-border pt-4 text-sm">
          <DetailRow
            icon={Dumbbell}
            label={t("detail.activity")}
            value={`${activityLabel}${tierLabel ? ` · ${tierLabel}` : ""}`}
          />
          <DetailRow
            icon={CalendarClock}
            label={t("detail.when")}
            value={formatWhen(booking.scheduled_start, locale, t("flexible"))}
          />
          <DetailRow
            icon={Clock}
            label={t("detail.duration")}
            value={`${booking.duration_min} ${locale === "zh" ? "分鐘" : "min"}`}
          />
          {booking.location_name && (
            <DetailRow
              icon={MapPin}
              label={t("detail.location")}
              value={booking.location_name}
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("detail.price")}</span>
            <PriceTag
              amount={booking.agreed_price}
              isFree={booking.is_free}
              perHour
              locale={locale}
              className="text-sm"
            />
          </div>
          {booking.seeker_note && (
            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground">{t("detail.note")}</p>
              <p className="mt-1 text-foreground/80">{booking.seeker_note}</p>
            </div>
          )}
        </div>
      </Card>

      <BookingActionsBar booking={booking} currentUserId={currentUserId} />

      {booking.status === "completed" && (
        <ReviewSection bookingId={booking.id} myReview={myReview} />
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium">{value}</span>
    </div>
  );
}
