"use client";

import { useTranslation } from "react-i18next";
import type { CompanionOffering } from "@pacergo/shared";
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
  price,
  isFree,
  isSelf = false,
}: {
  companionId: string;
  companionName: string;
  offerings: CompanionOffering[];
  price: number;
  isFree: boolean;
  /** True when the viewer is looking at their own listing — the button only toasts. */
  isSelf?: boolean;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();
  const toast = useToast();

  const priceLabel = isFree
    ? locale === "zh"
      ? "免費"
      : "Free"
    : `NT$${price.toLocaleString()} ${PER_HOUR[locale]}`;

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
          trigger={button}
        />
      )}
      <p className="text-center text-xs text-muted-foreground">{t("bookHint")}</p>
    </div>
  );
}
