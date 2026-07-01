"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  TIERS,
  ACTIVITY_META,
  TIER_PRICE_BANDS,
  isPriceInTierBand,
  TIER_REQUIRES_CERT,
  TIER_REQUIRES_COMPETITION,
  type ActivitySlug,
  type Tier,
} from "@pacergo/shared";
import type { StudioOffering, VerificationMap } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import { addOffering, removeOffering } from "./studio-actions";
import { VerificationGate } from "./certification-gate";

const ACTIVITIES: ActivitySlug[] = ["gym", "running", "hiking"];

/** Manage the trainer's offerings — one tier per activity. */
export function OfferingsEditor({
  offerings,
  hasListing,
  verifications,
  competitions,
}: {
  offerings: StudioOffering[];
  hasListing: boolean;
  verifications: VerificationMap;
  competitions: VerificationMap;
}) {
  const { t } = useTranslation("studio");
  const locale = useLocale();
  const router = useRouter();

  const usedActivities = new Set(offerings.map((o) => o.activity));
  const availableActivities = ACTIVITIES.filter((a) => !usedActivities.has(a));

  const [activity, setActivity] = useState<ActivitySlug>(
    availableActivities[0] ?? "gym",
  );
  const [tier, setTier] = useState<Tier>("C");
  const [price, setPrice] = useState(String(TIER_PRICE_BANDS.C.min));
  const [minutes, setMinutes] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the selected activity within what's still addable (one tier per activity).
  useEffect(() => {
    if (availableActivities.length > 0 && !availableActivities.includes(activity)) {
      setActivity(availableActivities[0]);
    }
  }, [availableActivities, activity]);

  // Certified tiers (B & A) require an approved certification *for the selected
  // activity*; Tier A additionally requires approved competition experience.
  // Tier C is open. Cert is gated first, then competition (A only).
  const activityCertStatus = verifications[activity]?.status;
  const activityCompStatus = competitions[activity]?.status;
  const certRequired =
    TIER_REQUIRES_CERT[tier] && activityCertStatus !== "approved";
  const competitionRequired =
    TIER_REQUIRES_COMPETITION[tier] && activityCompStatus !== "approved";

  const band = TIER_PRICE_BANDS[tier];
  const priceHint = t("offerings.priceHintRange", {
    tier,
    min: band.min,
    max: band.max,
  });
  const priceValid = isPriceInTierBand(tier, parseInt(price, 10));

  /** Switching tier: reset the price to that tier's floor so it's in-band. */
  function selectTier(next: Tier) {
    setTier(next);
    setPrice(String(TIER_PRICE_BANDS[next].min));
  }

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await addOffering({
        activity,
        tier,
        priceNtd: parseInt(price, 10) || 0,
        isFree: false,
        sessionMinutes: parseInt(minutes, 10) || 60,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await removeOffering(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{t("offerings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("offerings.subtitle")}</p>
      </div>

      {!hasListing ? (
        <p className="text-sm text-muted-foreground">{t("offerings.needListing")}</p>
      ) : (
        <>
          <div className="space-y-2">
            {offerings.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("offerings.empty")}</p>
            )}
            {offerings.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {ACTIVITY_META[o.activity][locale]}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {o.tier} · {o.session_minutes}
                    {locale === "zh" ? " 分" : "m"}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <PriceTag
                    amount={o.price_ntd}
                    isFree={o.is_free}
                    perHour
                    locale={locale}
                    className="text-sm"
                  />
                  <button
                    type="button"
                    aria-label={t("offerings.remove")}
                    onClick={() => remove(o.id)}
                    disabled={busy}
                    className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {availableActivities.length === 0 ? (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              {t("offerings.allAdded")}
            </p>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <ChipRow
                label={t("offerings.activity")}
                options={ACTIVITIES.map((a) => ({
                  value: a,
                  label: ACTIVITY_META[a][locale],
                  disabled: usedActivities.has(a),
                }))}
                value={activity}
                onChange={setActivity}
              />
              <ChipRow
                label={t("offerings.tier")}
                options={TIERS.map((tr) => ({ value: tr, label: tr }))}
                value={tier}
                onChange={selectTier}
              />

              {certRequired ? (
                <VerificationGate
                  docType="certification"
                  activity={activity}
                  activityLabel={ACTIVITY_META[activity][locale]}
                  status={activityCertStatus}
                />
              ) : competitionRequired ? (
                <VerificationGate
                  docType="competition"
                  activity={activity}
                  activityLabel={ACTIVITY_META[activity][locale]}
                  status={activityCompStatus}
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label={t("offerings.price")}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min={band.min}
                      max={band.max}
                    />
                    <Input
                      type="number"
                      label={t("offerings.minutes")}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      min={15}
                      step={15}
                    />
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      priceValid
                        ? "text-muted-foreground"
                        : "text-destructive",
                    )}
                  >
                    💡 {priceHint}
                  </p>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={add}
                    disabled={busy || !priceValid}
                    className="w-full gap-2"
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {t("offerings.add")}
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            aria-disabled={o.disabled || undefined}
            onClick={() => !o.disabled && onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              value === o.value && !o.disabled
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card hover:bg-accent",
              o.disabled && "cursor-not-allowed opacity-50 hover:bg-card",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
