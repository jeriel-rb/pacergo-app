"use client";

import { useTranslation } from "react-i18next";
import type { AvailabilitySlot, CompanionOffering } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { useToast } from "@/shared/components/ui/toast";
import { BookingSheet } from "@/features/booking/booking-sheet";

const PER_HOUR: Record<"zh" | "en", string> = { zh: "/ 小時", en: "/ hr" };

/** Booking entry point on the trainer detail page — opens the request form. */
export function BookingCTA({
  companionId,
  companionName,
  offerings,
  availability,
  price,
  isFree: _isFree,
  ratingAvg,
  ratingCount,
  isSelf = false,
}: {
  companionId: string;
  companionName: string;
  offerings: CompanionOffering[];
  /** The trainer's weekly windows; the booking form only offers these. */
  availability: AvailabilitySlot[];
  price: number;
  isFree: boolean;
  ratingAvg: number;
  ratingCount: number;
  /** True when the viewer is looking at their own listing — the button only toasts. */
  isSelf?: boolean;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();
  const toast = useToast();

  const priceLabel = `NT$${price.toLocaleString()} ${PER_HOUR[locale]}`;

  const button = (
    <Button size="lg" className="w-full rounded-2xl text-base">
      {t("bookNow")} — {priceLabel}
    </Button>
  );

  // No self-booking: the button stays visible on your own listing but only
  // explains why (create_booking also rejects it server-side).
  if (isSelf) {
    return (
      <div className="pt-1">
        <Button
          size="lg"
          aria-disabled="true"
          onClick={() => toast.show(t("cannotBookSelf"), "destructive")}
          className="w-full cursor-not-allowed rounded-2xl text-base opacity-50"
        >
          {t("bookNow")} — {priceLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      {offerings.length === 0 ? (
        <Button size="lg" disabled className="w-full rounded-2xl text-base">
          {t("bookNow")} — {priceLabel}
        </Button>
      ) : (
        <BookingSheet
          companionId={companionId}
          companionName={companionName}
          offerings={offerings}
          availability={availability}
          rating={{ avg: ratingAvg, count: ratingCount }}
          trigger={button}
        />
      )}
      <p className="text-center text-xs text-muted-foreground">{t("bookHint")}</p>
    </div>
  );
}
