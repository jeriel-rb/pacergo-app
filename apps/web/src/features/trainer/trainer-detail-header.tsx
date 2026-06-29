"use client";

import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TIER_LABELS, type TrainerProfile } from "@pacergo/shared";
import { GradientHeader } from "@/shared/components/atoms/gradient-header";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";

/** Gradient hero for the trainer detail page. */
export function TrainerDetailHeader({
  trainer,
  backHref,
}: {
  trainer: TrainerProfile;
  backHref: string;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();

  const gradeLabel = locale === "zh" ? `${trainer.tier} 級` : `Tier ${trainer.tier}`;
  const subtitle = [
    TIER_LABELS[trainer.tier][locale],
    trainer.is_bidding ? t("bidding") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <GradientHeader className="rounded-[24px] p-5">
      {trainer.banner_url && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${trainer.banner_url})` }}
          />
          {/* Darken so the white hero text stays legible over any image. */}
          <div aria-hidden className="absolute inset-0 bg-black/45" />
        </>
      )}

      <Link
        href={backHref}
        aria-label={t("back", { defaultValue: "Back" })}
        className="absolute left-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
      >
        <ChevronLeft size={20} />
      </Link>

      <div className="relative z-10 flex items-start justify-between gap-4 pt-8">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
            {gradeLabel}
          </span>
          <h1 className="mt-2 text-2xl font-bold">{trainer.display_name}</h1>
          <p className="mt-1 text-sm text-white/85">{subtitle}</p>
          <div className="mt-2">
            <RatingStars
              value={trainer.rating_avg}
              count={trainer.rating_count}
              tone="onDark"
            />
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
            <MapPin size={14} />
            <span>{trainer.home_area}</span>
          </div>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1.5">
            <PriceTag
              amount={trainer.price_ntd}
              isFree={trainer.is_free}
              perHour
              locale={locale}
              tone="onDark"
            />
          </div>
        </div>

        <InitialAvatar
          name={trainer.display_name}
          src={trainer.photo_url}
          size={72}
          className="shrink-0 bg-white/25 text-white ring-2 ring-white/40"
        />
      </div>
    </GradientHeader>
  );
}
