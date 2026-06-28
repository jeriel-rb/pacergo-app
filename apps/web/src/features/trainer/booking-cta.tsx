"use client";

import { useTranslation } from "react-i18next";
import type { CompanionOffering } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
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
  /** True when the viewer is looking at their own listing — booking hidden. */
  isSelf?: boolean;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();

  if (isSelf) return null;

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
