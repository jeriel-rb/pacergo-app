"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Star, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACTIVITY_META } from "@pacergo/shared";
import { useLocale } from "@/shared/hooks/use-locale";
import type { MyListing } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { ListingEditor } from "./listing-editor";
import { OfferingsEditor } from "./offerings-editor";
import { AvailabilityEditor } from "./availability-editor";
import { tierStates } from "./tier-eligibility";

/** 陪練後台 — manage your listing, offerings, and availability. */
export function StudioView({ data }: { data: MyListing }) {
  const { t } = useTranslation("studio");
  const locale = useLocale();
  const pathname = usePathname();
  const sessionsHref = getLocalizedPath("/sessions", getCurrentLocale(pathname));
  const earningsHref = getLocalizedPath("/studio/earnings", getCurrentLocale(pathname));
  const hasListing = data.listing !== null;
  const established = data.is_companion || data.application?.status === "approved";
  // Plans whose tier isn't verified for that activity (e.g. Tier C trainers
  // from before C needed proof). They're asked to upload it.
  const maps = {
    backgrounds: data.backgrounds,
    verifications: data.verifications,
    competitions: data.competitions,
  };
  const unverified = data.offerings.filter(
    (o) => tierStates(o.activity, maps)[o.tier] !== "verified",
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {!established && data.application?.status === "pending" && (
        <Card className="space-y-1.5 border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            {t("application.pendingTitle")}
          </p>
          <p className="text-sm text-amber-700/90 dark:text-amber-300/90">
            {t("application.pendingBody")}
          </p>
        </Card>
      )}

      {!established && data.application?.status === "rejected" && (
        <Card className="space-y-1.5 border-destructive/30 bg-destructive/5 p-5">
          <p className="font-semibold">{t("application.rejectedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("application.rejectedBody")}</p>
        </Card>
      )}

      {!established && data.application?.status !== "pending" && (
        <Card className="space-y-1.5 border-primary/20 bg-primary/5 p-5">
          <p className="font-semibold">{t("intro.title")}</p>
          <p className="text-sm text-muted-foreground">{t("intro.body")}</p>
        </Card>
      )}

      {established && unverified.length > 0 && (
        <Card className="space-y-1.5 border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            {t("bg.missingTitle")}
          </p>
          <p className="text-sm text-amber-700/90 dark:text-amber-300/90">
            {t("bg.missingBody", {
              activities: unverified
                .map((o) => ACTIVITY_META[o.activity][locale])
                .join(locale === "zh" ? "、" : ", "),
            })}
          </p>
        </Card>
      )}

      {hasListing && data.listing && (
        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-2">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <span className="font-semibold">
              {data.listing.rating_avg.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({data.listing.rating_count})
            </span>
          </div>
          <Link
            href={sessionsHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t("viewRequests")}
            <ChevronRight size={16} />
          </Link>
        </Card>
      )}

      <Link href={earningsHref} className="block">
        <Card className="flex items-center justify-between gap-3 p-5 transition-colors hover:bg-accent">
          <span className="flex items-center gap-2 font-semibold">
            <Wallet size={18} className="text-primary" />
            {t("earnings.cta")}
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Card>
      </Link>

      <ListingEditor
        listing={data.listing}
        hasPricing={data.offerings.length > 0}
        hasAvailability={data.availability.length > 0}
        isCompanion={established}
        applicationStatus={data.application?.status ?? null}
        eligibility={data.eligibility}
      >
        <OfferingsEditor
          offerings={data.offerings}
          hasListing={hasListing}
          verifications={data.verifications}
          competitions={data.competitions}
          backgrounds={data.backgrounds}
          isCompanion={established}
        />
        <AvailabilityEditor
          availability={data.availability}
          hasListing={hasListing}
        />
      </ListingEditor>
    </div>
  );
}
