"use client";

import { useEffect, useState } from "react";
import { Clock, Dumbbell, FileText, MapPin, Megaphone, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACTIVITY_META, TIER_LABELS, type ActivitySlug, type Tier } from "@pacergo/shared";
import type { AdminVerification, TrainerApplication } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Accordion, type AccordionItem } from "@/shared/components/atoms/accordion";
import { StatusBadge, type StatusTone } from "@/shared/components/atoms/status-badge";
import { useLocale } from "@/shared/hooks/use-locale";
import { fetchTrainerApplication } from "./admin-actions";
import { EmptyRow, InfoRow } from "./dashboard/user-sheet";
import { ntd } from "./dashboard/dashboard-parts";

const LISTING_TONE: Record<string, StatusTone> = {
  active: "success",
  paused: "warning",
  draft: "muted",
};

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** What the applicant filled in: listing, plans, and availability. */
export function TrainerRequestSheet({
  request,
  onOpenChange,
  onDecide,
  onViewPdf,
}: {
  request: AdminVerification | null;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: "approved" | "rejected") => void;
  onViewPdf: () => void;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const [detail, setDetail] = useState<TrainerApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = request?.user_id ?? null;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setDetail(null);
    setError(false);
    setLoading(true);
    void fetchTrainerApplication(userId)
      .then((data) => {
        if (alive) setDetail(data);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId, attempt]);

  const text = (v: string | null | undefined) => (v ? v : "—");
  const activityName = (slug: string) =>
    ACTIVITY_META[slug as ActivitySlug]?.[locale] ?? slug;
  const f = (key: string) => t(`users.sheet.fields.${key}`);
  const weekdays = t("verifications.sheet.weekdays", { returnObjects: true }) as string[];

  function sections(d: TrainerApplication): AccordionItem[] {
    const listing = d.listing;
    return [
      {
        id: "listing",
        title: t("verifications.sheet.sections.listing"),
        children: listing ? (
          <div className="space-y-2">
            <InfoRow icon={Megaphone} label={f("headline")}>
              {text(listing.headline)}
            </InfoRow>
            <InfoRow icon={FileText} label={f("bio")}>
              {text(listing.bio_long)}
            </InfoRow>
            <InfoRow icon={MapPin} label={f("servedArea")}>
              {text(listing.served_area)}
            </InfoRow>
            <InfoRow icon={Radio} label={f("listingStatus")}>
              <StatusBadge tone={LISTING_TONE[listing.status] ?? "muted"} className="align-middle">
                {t(`users.sheet.listingStatus.${listing.status}`)}
              </StatusBadge>
            </InfoRow>
          </div>
        ) : (
          <EmptyRow>{t("verifications.sheet.noListing")}</EmptyRow>
        ),
      },
      {
        id: "plans",
        title: t("verifications.sheet.sections.plans"),
        children: (
          <div className="space-y-2">
            {d.offerings.length === 0 ? (
              <EmptyRow>{t("verifications.sheet.noPlans")}</EmptyRow>
            ) : (
              d.offerings.map((o, i) => (
                <InfoRow
                  key={i}
                  icon={Dumbbell}
                  label={`${activityName(o.activity)} · ${TIER_LABELS[o.tier as Tier]?.[locale] ?? o.tier}`}
                >
                  {o.is_free ? t("users.sheet.free") : ntd(o.price_ntd)}
                  {" · "}
                  {t("users.sheet.minutes", { count: o.session_minutes })}
                </InfoRow>
              ))
            )}
          </div>
        ),
      },
      {
        id: "availability",
        title: t("verifications.sheet.sections.availability"),
        children: (
          <div className="space-y-2">
            {d.availability.length === 0 ? (
              <EmptyRow>{t("verifications.sheet.noAvailability")}</EmptyRow>
            ) : (
              d.availability.map((slot, i) => (
                <InfoRow key={i} icon={Clock} label={weekdays[slot.weekday] ?? String(slot.weekday)}>
                  {hhmm(slot.start_minute)}–{hhmm(slot.end_minute)}
                </InfoRow>
              ))
            )}
          </div>
        ),
      },
    ];
  }

  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl" closeClassName="right-6 top-[35px]">
        <SheetHeader className="gap-0 px-6 pb-2 pr-16 pt-6">
          <SheetTitle className="truncate leading-7">
            {request ? request.display_name : t("verifications.sheet.title")}
          </SheetTitle>
          <SheetDescription className="truncate leading-5">
            {request?.label ? request.label : t("verifications.sheet.title")}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading || (!detail && !error) ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error || !detail ? (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">{t("verifications.sheet.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                {t("verifications.sheet.retry")}
              </Button>
            </div>
          ) : (
            <Accordion key={userId ?? "none"} items={sections(detail)} />
          )}
        </div>

        {request?.status === "pending" && (
          <div className="flex flex-wrap justify-end gap-2 p-6">
            {request.document_path && (
              <Button type="button" variant="outline" onClick={onViewPdf}>
                {t("verifications.viewPdf")}
              </Button>
            )}
            <Button type="button" variant="destructive" onClick={() => onDecide("rejected")}>
              {t("reject")}
            </Button>
            <Button type="button" onClick={() => onDecide("approved")}>
              {t("approve")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
