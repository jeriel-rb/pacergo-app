"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import type { TrainerSummary } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { TierBadge } from "@/shared/components/atoms/tier-badge";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { ActivityIconCircle } from "@/shared/components/atoms/activity";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

/** Discovery card for a trainer. Links to the detail page; star toggles save. */
export function TrainerCard({
  trainer,
  locale,
}: {
  trainer: TrainerSummary;
  locale: Locale;
}) {
  const pathname = usePathname();
  const routeLocale = getCurrentLocale(pathname);
  const href = getLocalizedPath(`/trainers/${trainer.id}`, routeLocale);
  const [saved, setSaved] = useState(false);

  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative flex items-center justify-center bg-accent/60 py-7">
          <InitialAvatar name={trainer.display_name} size={72} />
          <button
            type="button"
            aria-label="Save"
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved((s) => !s);
            }}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm"
          >
            <Star
              size={14}
              className={cn(saved && "fill-amber-400 text-amber-400")}
            />
          </button>
        </div>

        <div className="space-y-1.5 p-3">
          <TierBadge tier={trainer.tier} locale={locale} showGrade />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">
              {trainer.display_name}
            </span>
            <PriceTag
              amount={trainer.price_ntd}
              isFree={trainer.is_free}
              perHour
              locale={locale}
              className="shrink-0 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} />
            <span className="truncate">{trainer.home_area}</span>
          </div>
          <RatingStars
            value={trainer.rating_avg}
            count={trainer.rating_count}
            size={12}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {trainer.activities.map((slug) => (
              <ActivityIconCircle key={slug} slug={slug} />
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
