"use client";

import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TIER_LABELS, type TrainerProfile } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { TierBadge } from "@/shared/components/atoms/tier-badge";
import { MessageButton } from "@/features/chat/message-button";
import { useLocale } from "@/shared/hooks/use-locale";

const GRADIENT =
  "linear-gradient(135deg, var(--hero-from), var(--hero-to))";

/**
 * Trainer detail hero: a banner cover photo (or brand gradient) with the avatar
 * overlapping a solid info panel below — text never sits on the image, so it
 * stays legible and responsive at every width.
 */
export function TrainerDetailHeader({
  trainer,
  backHref,
  canMessage = false,
}: {
  trainer: TrainerProfile;
  backHref: string;
  /** Show Message CTA beside the name when the viewer already has a booking. */
  canMessage?: boolean;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();

  const subtitle = [
    TIER_LABELS[trainer.tier][locale],
    trainer.is_bidding ? t("bidding") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      {/* Banner */}
      <div
        className="h-36 w-full bg-cover bg-center sm:h-48"
        style={
          trainer.banner_url
            ? { backgroundImage: `url(${trainer.banner_url})` }
            : { backgroundImage: GRADIENT }
        }
      >
        <Link
          href={backHref}
          aria-label={t("back", { defaultValue: "Back" })}
          className="m-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
        >
          <ChevronLeft size={20} />
        </Link>
      </div>

      {/* Info panel */}
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex items-end justify-between gap-3">
          <div className="-mt-10 w-fit rounded-full ring-4 ring-card">
            <InitialAvatar
              name={trainer.display_name}
              src={trainer.photo_url}
              size={80}
            />
          </div>
          <TierBadge
            tier={trainer.tier}
            locale={locale}
            showGrade
            className="mb-1"
          />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-2xl font-bold leading-tight">
              {trainer.display_name}
            </h1>
            {canMessage && (
              <MessageButton
                otherId={trainer.id}
                size="sm"
                className="shrink-0 rounded-full"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>

          <RatingStars value={trainer.rating_avg} count={trainer.rating_count} />

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin size={14} className="shrink-0" />
            <span>{trainer.home_area}</span>
          </div>

          <div className="inline-flex items-center rounded-full bg-accent px-3 py-1.5">
            <PriceTag
              amount={trainer.price_ntd}
              isFree={trainer.is_free}
              perHour
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
