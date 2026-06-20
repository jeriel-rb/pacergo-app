"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";

const PER_HOUR: Record<"zh" | "en", string> = { zh: "/ 小時", en: "/ hr" };

/** Sticky-feel booking button + 24h-confirmation hint, with a mock toast. */
export function BookingCTA({
  price,
  isFree,
}: {
  price: number;
  isFree: boolean;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();
  const [sent, setSent] = useState(false);

  const priceLabel = isFree
    ? locale === "zh"
      ? "免費"
      : "Free"
    : `NT$${price.toLocaleString()} ${PER_HOUR[locale]}`;

  function handleClick() {
    setSent(true);
    window.setTimeout(() => setSent(false), 3500);
  }

  return (
    <div className="space-y-2 pt-1">
      <Button
        size="lg"
        onClick={handleClick}
        className="w-full rounded-2xl text-base"
      >
        {t("bookNow")} — {priceLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t("bookHint")}
      </p>

      {sent && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-foreground px-4 py-3 text-center text-sm font-medium text-background shadow-lg lg:bottom-8"
        >
          {t("bookingRequested")}
        </div>
      )}
    </div>
  );
}
