"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ListingStatus, StudioListing } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { upsertMyListing } from "./studio-actions";

const STATUSES: ListingStatus[] = ["draft", "active", "paused"];

/** Edit the trainer's listing: headline, bio, served area, publish status. */
export function ListingEditor({ listing }: { listing: StudioListing | null }) {
  const { t } = useTranslation("studio");
  const router = useRouter();

  const [headline, setHeadline] = useState(listing?.headline ?? "");
  const [bio, setBio] = useState(listing?.bio_long ?? "");
  const [area, setArea] = useState(listing?.served_area ?? "");
  const [status, setStatus] = useState<ListingStatus>(listing?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await upsertMyListing({
        headline: headline.trim() || null,
        bioLong: bio.trim() || null,
        servedArea: area.trim() || null,
        status,
      });
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{t("listing.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("listing.subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label={t("listing.headline")}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder={t("listing.headlinePlaceholder")}
          maxLength={80}
        />
        <Textarea
          label={t("listing.bio")}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("listing.bioPlaceholder")}
          maxLength={500}
        />
        <Input
          label={t("listing.area")}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder={t("listing.areaPlaceholder")}
          maxLength={80}
        />

        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("listing.status")}</span>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                  status === s
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card hover:bg-accent",
                )}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t(`statusHint.${status}`)}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saved && !saving && <Check size={16} />}
          {saved && !saving ? t("saved") : t("save")}
        </Button>
      </form>
    </Card>
  );
}
