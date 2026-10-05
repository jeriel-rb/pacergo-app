"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACTIVITY_META, type TrainerSummary } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { CursorTooltip } from "@/shared/components/atoms/cursor-tooltip";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { TierBadge } from "@/shared/components/atoms/tier-badge";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { ActivityIcon, ActivityIconCircle } from "@/shared/components/atoms/activity";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { toggleSaved } from "@/features/saved/saved-actions";
import { useToast } from "@/shared/components/ui/toast";
import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

/** A card has room for four activity circles. Up to four activities are all shown;
 *  with more, the last slot becomes a "+N" badge (so three icons + the badge) and
 *  the rest go in its tooltip. Either way the row is one line, so every card keeps
 *  the same height. */
const ACTIVITY_SLOTS = 4;

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
  const overflow = trainer.activities.length > ACTIVITY_SLOTS;
  const visibleActivities = overflow
    ? trainer.activities.slice(0, ACTIVITY_SLOTS - 1)
    : trainer.activities;
  const hiddenActivities = overflow ? trainer.activities.slice(ACTIVITY_SLOTS - 1) : [];
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
            <div className="flex h-8 flex-nowrap items-center gap-1.5 pt-1">
              {visibleActivities.map((slug) => (
                <ActivityIconCircle key={slug} slug={slug} className="h-7 w-7 shrink-0" />
              ))}
              {hiddenActivities.length > 0 && (
                <CursorTooltip
                  label={t("moreActivitiesAria", { count: hiddenActivities.length })}
                  className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                  tooltipClassName="min-w-40"
                  content={
                    <>
                      <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-muted-foreground">
                        {t("moreActivities")}
                      </p>
                      <ul className="space-y-0.5">
                        {hiddenActivities.map((slug) => (
                          <li
                            key={slug}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-foreground/70">
                              <ActivityIcon slug={slug} size={14} />
                            </span>
                            {ACTIVITY_META[slug][locale]}
                          </li>
                        ))}
                      </ul>
                    </>
                  }
                >
                  +{hiddenActivities.length}
                </CursorTooltip>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
