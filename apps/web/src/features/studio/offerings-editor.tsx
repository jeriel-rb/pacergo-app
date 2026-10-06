"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  TIERS,
  ACTIVITY_META,
  TIER_PRICE_FLOORS,
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
import { useToast } from "@/shared/components/ui/toast";
import { cn } from "@/lib/utils";
import { addOffering, removeOffering } from "./studio-actions";
import { VerificationGate } from "./certification-gate";
import { useEnsureDraftListing, useStudioDraftRegistration } from "./listing-editor";

const ACTIVITIES: ActivitySlug[] = ["gym", "walking", "running", "hiking", "hyrox"];

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
  const toast = useToast();
  const ensureDraftListing = useEnsureDraftListing();
  const registerDraft = useStudioDraftRegistration();
  const canEdit = hasListing || Boolean(ensureDraftListing);
  const [touched, setTouched] = useState(false);
  const [extra, setExtra] = useState<StudioOffering[]>([]);

  const visibleOfferings = ACTIVITIES.flatMap((slug) => {
    const updated = extra.find((row) => row.activity === slug);
    if (updated) return [updated];
    const saved = offerings.find((row) => row.activity === slug);
    return saved ? [saved] : [];
  });

  const [activity, setActivity] = useState<ActivitySlug>(ACTIVITIES[0] ?? "gym");
  const [tier, setTier] = useState<Tier>("C");
  const [price, setPrice] = useState(String(TIER_PRICE_FLOORS.C));
  const [minutes, setMinutes] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectActivity(next: ActivitySlug) {
    setActivity(next);
    const saved = visibleOfferings.find((row) => row.activity === next);
    if (!saved) return;
    setTier(saved.tier);
    setPrice(String(saved.price_ntd));
    setMinutes(String(saved.session_minutes));
    setTouched(false);
  }

  // A Tier B certificate (pending or approved) is not asked for again. Tier A
  // then collects only the competition document. A missing or rejected
  // certificate still has to be uploaded first. Tier C is open.
  const activityCertStatus = verifications[activity]?.status;
  const activityCompStatus = competitions[activity]?.status;
  const certOnFile = activityCertStatus === "pending" || activityCertStatus === "approved";
  const needsComp =
    TIER_REQUIRES_COMPETITION[tier] && certOnFile && activityCompStatus !== "approved";
  // Pending still shows the review note, not a second upload. Approved opens the price form.
  const certRequired =
    TIER_REQUIRES_CERT[tier] && !needsComp && activityCertStatus !== "approved";
  const competitionRequired = needsComp;

  const floor = TIER_PRICE_FLOORS[tier];
  const priceHint = t("offerings.priceHintFloor", { tier, min: floor });
  const priceValid = isPriceInTierBand(tier, parseInt(price, 10));

  /** Switching tier: reset the price to that tier's floor so it's in-band. */
  function selectTier(next: Tier) {
    setTouched(true);
    setTier(next);
    const saved = visibleOfferings.find((row) => row.activity === activity);
    setPrice(
      String(saved && saved.tier === next ? saved.price_ntd : TIER_PRICE_FLOORS[next]),
    );
  }

  const priceNtd = parseInt(price, 10) || 0;
  const sessionMinutes = parseInt(minutes, 10) || 60;
  const matchesSaved = visibleOfferings.some(
    (o) =>
      o.activity === activity &&
      o.tier === tier &&
      o.price_ntd === priceNtd &&
      o.session_minutes === sessionMinutes,
  );
  const canCommitPlan =
    touched && canEdit && !certRequired && !competitionRequired && priceValid && !matchesSaved;
  const planRef = useRef({
    canCommitPlan,
    hasListing,
    activity,
    tier,
    priceNtd,
    sessionMinutes,
    ensureDraftListing,
  });
  planRef.current = {
    canCommitPlan,
    hasListing,
    activity,
    tier,
    priceNtd,
    sessionMinutes,
    ensureDraftListing,
  };

  const flushPlan = useCallback(async () => {
    const d = planRef.current;
    if (!d.canCommitPlan) return;
    if (!d.hasListing) await d.ensureDraftListing?.();
    const id = await addOffering({
      activity: d.activity,
      tier: d.tier,
      priceNtd: d.priceNtd,
      isFree: false,
      sessionMinutes: d.sessionMinutes,
    });
    setExtra((prev) => [
      ...prev,
      {
        id,
        activity: d.activity,
        tier: d.tier,
        price_ntd: d.priceNtd,
        is_free: false,
        session_minutes: d.sessionMinutes,
      },
    ]);
    registerDraft?.noteSaved("offering");
    setTouched(false);
  }, [registerDraft]);

  useEffect(() => {
    registerDraft?.registerOffering(flushPlan, canCommitPlan);
    return () => registerDraft?.registerOffering(null, false);
  }, [registerDraft, flushPlan, canCommitPlan]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      if (!hasListing) await ensureDraftListing?.();
      const id = await addOffering({
        activity,
        tier,
        priceNtd: parseInt(price, 10) || 0,
        isFree: false,
        sessionMinutes: parseInt(minutes, 10) || 60,
      });
      setExtra((prev) => [
        ...prev,
        {
          id,
          activity,
          tier,
          price_ntd: parseInt(price, 10) || 0,
          is_free: false,
          session_minutes: parseInt(minutes, 10) || 60,
        },
      ]);
      registerDraft?.noteSaved("offering");
      setTouched(false);
      toast.show(t("toast.offeringAdded"), "success");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.offeringAddFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      setExtra((prev) => prev.filter((row) => row.id !== id));
      await removeOffering(id);
      toast.show(t("toast.offeringRemoved"), "success");
      router.refresh();
    } catch {
      toast.show(t("toast.offeringRemoveFailed"), "destructive");
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

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">{t("offerings.needListing")}</p>
      ) : (
        <>
          <div className="space-y-2">
            {visibleOfferings.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("offerings.empty")}</p>
            )}
            {visibleOfferings.map((o) => (
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

          <div className="space-y-3 border-t border-border pt-4">
              <ChipRow
                label={t("offerings.activity")}
                options={ACTIVITIES.map((a) => ({
                  value: a,
                  label: ACTIVITY_META[a][locale],
                }))}
                value={activity}
                onChange={selectActivity}
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
                  tier={tier}
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
                      onChange={(e) => {
                        setTouched(true);
                        setPrice(e.target.value);
                      }}
                      min={floor}
                    />
                    <Input
                      type="number"
                      label={t("offerings.minutes")}
                      value={minutes}
                      onChange={(e) => {
                        setTouched(true);
                        setMinutes(e.target.value);
                      }}
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
