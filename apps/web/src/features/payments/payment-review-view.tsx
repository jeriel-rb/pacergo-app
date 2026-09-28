import Link from "next/link";
import {
  CalendarClock,
  Clock,
  CreditCard,
  MapPin,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { ACTIVITY_META, TIER_LABELS, formatInAppTimeZone } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { getLocalizedPath } from "@/lib/locale-path";
import type { PaymentReview } from "@/lib/payments";
import { NewebPayButton } from "./newebpay-pay-button";

export function PaymentReviewView({
  booking,
  locale,
  t,
}: {
  booking: PaymentReview;
  locale: "zh" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const activity = booking.activity_slug
    ? ACTIVITY_META[booking.activity_slug][locale]
    : t("unknown");
  const tier = booking.tier ? TIER_LABELS[booking.tier][locale] : "";
  const formattedDate = booking.scheduled_start
    ? formatInAppTimeZone(booking.scheduled_start, locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : t("flexible");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold lg:text-3xl">{t("review.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("review.notice")}</p>
      </header>

      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <ReceiptText size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{activity}</p>
            <p className="text-sm text-muted-foreground">
              {tier ? `${tier} · ` : ""}
              {booking.companion_name}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-4 text-sm">
          <Row label={t("review.partner")} value={booking.companion_name ?? t("unknown")} />
          <Row label={t("review.service")} value={activity} />
          <IconRow icon={CalendarClock} label={t("review.time")} value={formattedDate} />
          <IconRow
            icon={Clock}
            label={t("review.duration")}
            value={`${booking.duration_min} ${locale === "zh" ? "分鐘" : "min"}`}
          />
          {booking.location_name && (
            <IconRow icon={MapPin} label={t("review.location")} value={booking.location_name} />
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <span className="font-semibold">{t("review.total")}</span>
            <PriceTag
              amount={booking.agreed_price}
              isFree={false}
              locale={locale}
              className="text-lg"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <CreditCard size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>{t("review.paymentNotice")}</p>
        </div>
        <NewebPayButton bookingId={booking.id} />
      </Card>

      <Link
        href={getLocalizedPath(`/sessions/${booking.id}`, locale)}
        className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("viewBooking")}
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function IconRow({
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
