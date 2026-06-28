"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  TIERS,
  ACTIVITY_META,
  type ActivitySlug,
  type Tier,
} from "@pacergo/shared";
import type { StudioOffering } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import { addOffering, removeOffering } from "./studio-actions";

const ACTIVITIES: ActivitySlug[] = ["gym", "running", "hiking"];

/** Manage the trainer's offerings (activity × tier × price). */
export function OfferingsEditor({
  offerings,
  hasListing,
}: {
  offerings: StudioOffering[];
  hasListing: boolean;
}) {
  const { t } = useTranslation("studio");
  const locale = useLocale();
  const router = useRouter();

  const [activity, setActivity] = useState<ActivitySlug>("gym");
  const [tier, setTier] = useState<Tier>("C");
  const [price, setPrice] = useState("600");
  const [minutes, setMinutes] = useState("60");
  const [isFree, setIsFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await addOffering({
        activity,
        tier,
        priceNtd: isFree ? 0 : parseInt(price, 10) || 0,
        isFree,
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

          <div className="space-y-3 border-t border-border pt-4">
            <ChipRow
              label={t("offerings.activity")}
              options={ACTIVITIES.map((a) => ({
                value: a,
                label: ACTIVITY_META[a][locale],
              }))}
              value={activity}
              onChange={setActivity}
            />
            <ChipRow
              label={t("offerings.tier")}
              options={TIERS.map((tr) => ({ value: tr, label: tr }))}
              value={tier}
              onChange={setTier}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                label={t("offerings.price")}
                value={isFree ? "0" : price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isFree}
                min={0}
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("offerings.free")}</span>
              <Switch checked={isFree} onChange={setIsFree} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              variant="outline"
              onClick={add}
              disabled={busy}
              className="w-full gap-2"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {t("offerings.add")}
            </Button>
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
  options: { value: T; label: string }[];
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
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card hover:bg-accent",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
