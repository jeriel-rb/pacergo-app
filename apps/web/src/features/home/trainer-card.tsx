"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { TierBadge } from "@/shared/components/atoms/tier-badge";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { ActivityIconCircle } from "@/shared/components/atoms/activity";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { toggleSaved } from "@/features/saved/saved-actions";
import { useToast } from "@/shared/components/ui/toast";
import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

const GRADIENT = "linear-gradient(135deg, var(--hero-from), var(--hero-to))";

/** Discovery card for a trainer: banner cover + overlapping avatar, then details.
 *  The whole card links to the detail page; the star toggles save. */
export function TrainerCard({
  trainer,
  locale,
  saved: initialSaved = false,
}: {
  trainer: TrainerSummary;
  locale: Locale;
  /** Whether the signed-in user has this trainer saved. */
  saved?: boolean;
}) {
  const { t } = useTranslation("home");
  const pathname = usePathname();
  const routeLocale = getCurrentLocale(pathname);
  const href = getLocalizedPath(`/trainers/${trainer.id}`, routeLocale);
  const [saved, setSaved] = useState(initialSaved);
  const toast = useToast();

  async function onToggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const optimistic = !saved;
    setSaved(optimistic);
    try {
      const result = await toggleSaved(trainer.id);
      if (result !== null) setSaved(result);
    } catch {
      setSaved(!optimistic); // revert
      toast.show(t(optimistic ? "toast.saveFailed" : "toast.unsaveFailed"), "destructive");
    }
  }

  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {/* Banner cover (or brand gradient) */}
        <div className="relative h-20 overflow-hidden sm:h-24">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={
              trainer.banner_url
                ? { backgroundImage: `url(${trainer.banner_url})` }
                : { backgroundImage: GRADIENT }
            }
          />
          <button
            type="button"
            aria-label={saved ? t("unsaveTrainer") : t("saveTrainer")}
            aria-pressed={saved}
            onClick={onToggleSave}
            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          >
            <Star
              size={14}
              className={cn(saved && "fill-amber-400 text-amber-400")}
            />
          </button>
        </div>

        <div className="px-3 pb-3">
          {/* Avatar overlaps the banner (z-10 so the relative banner doesn't cover it) */}
          <div className="relative z-10 -mt-7 w-fit rounded-full ring-4 ring-card">
            <InitialAvatar
              name={trainer.display_name}
              src={trainer.photo_url}
              size={48}
            />
          </div>

          <div className="mt-2 space-y-1">
            <TierBadge tier={trainer.tier} locale={locale} showGrade />
            <p className="truncate pt-0.5 font-semibold leading-tight">
              {trainer.display_name}
            </p>
            <PriceTag
              amount={trainer.price_ntd}
              isFree={trainer.is_free}
              perHour
              locale={locale}
              className="text-sm"
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} className="shrink-0" />
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
        </div>
      </Card>
    </Link>
  );
}
