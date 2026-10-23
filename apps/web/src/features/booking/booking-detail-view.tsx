"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  CalendarClock,
  Clock,
  MapPin,
  Dumbbell,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_META,
  TIER_LABELS,
  type BookingRecord,
  type OnboardingObstacle,
} from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MyReview } from "@/lib/reviews";
import { MessageButton } from "@/features/chat/message-button";
import { StatusBadge, counterparty, formatWhen } from "./booking-ui";
import { BookingActionsBar } from "./booking-actions-bar";
import { ReviewSection } from "./review-section";

/** A single booking/session detail + its available actions. */
export function BookingDetailView({
  booking,
  currentUserId,
  myReview,
  clientObstacle,
}: {
  booking: BookingRecord;
  currentUserId: string | null;
  myReview: MyReview | null;
  /** Set only when the viewer is the trainer on this booking. */
  clientObstacle: OnboardingObstacle | null;
}) {
  const { t } = useTranslation("sessions");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const routeLocale = getCurrentLocale(pathname);
  const backHref = getLocalizedPath("/sessions", routeLocale);

  const other = counterparty(booking, currentUserId);
  const otherId =
    currentUserId === booking.seeker_id
      ? booking.companion_id
      : booking.seeker_id;
  const canMessage = ["pending_payment", "payment_processing", "payment_failed", "accepted"].includes(booking.status);
  const activityLabel = booking.activity_slug
    ? ACTIVITY_META[booking.activity_slug][locale]
    : "—";
  const tierLabel = booking.tier ? TIER_LABELS[booking.tier][locale] : "";

  // The trainer's accept/decline is an UPDATE on this exact row.  Refreshing
  // the server-rendered detail on that event gives the trainee Pay/Message or
  // the declined state immediately, without polling or a hard reload.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || disposed) return;
      channel = supabase
        .channel(`booking:${booking.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` },
          () => router.refresh(),
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [booking.id, router]);

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
          {clientObstacle && currentUserId === booking.companion_id && (
            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground">{t("detail.obstacle")}</p>
              <p className="mt-1 text-foreground/80">{t(`detail.obstacles.${clientObstacle}`)}</p>
            </div>
          )}
        </div>
      </Card>

      {booking.status === "requested" && <p className="text-sm text-muted-foreground">{t("detail.awaitingAcceptance")}</p>}
      {booking.status === "pending_payment" && <p className="text-sm text-muted-foreground">{t("detail.acceptedAwaitingPayment")}</p>}

      {booking.status !== "cancelled" && (
        // Wraps so the actions bar's full-width notes (basis-full) get their own line.
        <div className="flex flex-wrap items-stretch gap-2">
          <BookingActionsBar booking={booking} currentUserId={currentUserId} />

          {currentUserId === booking.seeker_id &&
            booking.agreed_price > 0 &&
            [
              "pending_payment",
              "payment_processing",
              "payment_failed",
            ].includes(booking.status) && (
              <Link
                href={getLocalizedPath(
                  `/payments/newebpay/review?booking=${booking.id}`,
                  routeLocale,
                )}
                className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4 sm:text-sm"
              >
                <CreditCard size={16} className="shrink-0" />
                {booking.status === "payment_processing"
                  ? t("actions.viewPayment")
                  : t("actions.pay")}
              </Link>
            )}

          {canMessage && <MessageButton otherId={otherId} className="min-h-10 min-w-0 flex-1 whitespace-normal px-2 text-center text-xs sm:px-4 sm:text-sm" />}
          {booking.status === "completed" &&
            currentUserId === booking.seeker_id &&
            !myReview && (
              <ReviewSection bookingId={booking.id} myReview={null} inline />
            )}
        </div>
      )}

      {booking.status === "completed" &&
        currentUserId === booking.seeker_id &&
        myReview && (
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
