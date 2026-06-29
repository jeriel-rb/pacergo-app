"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MyListing } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { ListingEditor } from "./listing-editor";
import { OfferingsEditor } from "./offerings-editor";
import { AvailabilityEditor } from "./availability-editor";

/** 陪練師後台 — manage your listing, offerings, and availability. */
export function StudioView({ data }: { data: MyListing }) {
  const { t } = useTranslation("studio");
  const pathname = usePathname();
  const sessionsHref = getLocalizedPath("/sessions", getCurrentLocale(pathname));
  const hasListing = data.listing !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {!data.is_companion && (
        <Card className="space-y-1.5 border-primary/20 bg-primary/5 p-5">
          <p className="font-semibold">{t("intro.title")}</p>
          <p className="text-sm text-muted-foreground">{t("intro.body")}</p>
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

      <ListingEditor listing={data.listing} />
      <OfferingsEditor
        offerings={data.offerings}
        hasListing={hasListing}
        verification={data.verification}
      />
      <AvailabilityEditor
        availability={data.availability}
        hasListing={hasListing}
      />
    </div>
  );
}
