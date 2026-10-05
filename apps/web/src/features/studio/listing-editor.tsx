"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { ListingStatus, StudioListing } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { SaveButton } from "@/shared/components/atoms/save-button";
import { useToast } from "@/shared/components/ui/toast";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";
import { cn } from "@/lib/utils";
import { upsertMyListing } from "./studio-actions";
import { ConsentCheckboxRow } from "@/features/legal/consent-checkbox-row";
import { CONSENT_VERSIONS } from "@/lib/consent";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STATUSES: ListingStatus[] = ["draft", "active", "paused"];

/** Edit the trainer's listing: headline, bio, served area, publish status. */
export function ListingEditor({ listing }: { listing: StudioListing | null }) {
  const { t } = useTranslation("studio");
  const router = useRouter();
  const toast = useToast();

  const [headline, setHeadline] = useState(listing?.headline ?? "");
  const [bio, setBio] = useState(listing?.bio_long ?? "");
  const [area, setArea] = useState(listing?.served_area ?? "");
  const [status, setStatus] = useState<ListingStatus>(listing?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A10: partner conduct rules only apply once someone becomes a trainer —
  // gate the FIRST listing creation only (an existing listing means they
  // already agreed on an earlier save; don't re-ask on every edit).
  const isFirstListing = listing === null;
  const [conductChecked, setConductChecked] = useState(false);

  const { dirty, markClean } = useFormDirty({ headline, bio, area, status });
  // Creating the very first listing is always a change (there's nothing saved yet).
  const canSave = isFirstListing || dirty;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    if (isFirstListing && !conductChecked) {
      setError(t("listing.conductRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertMyListing({
        headline: headline.trim() || null,
        bioLong: bio.trim() || null,
        servedArea: area.trim() || null,
        status,
      });
      markClean();
      toast.show(t("toast.listingSaved"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      toast.show(t("toast.listingSaveFailed"), "destructive");
      return;
    } finally {
      setSaving(false);
    }

    // Record consent AFTER the listing save has already succeeded, in its
    // own try/catch — a consent-bookkeeping failure here must never look
    // like the listing save itself failed (the save already went through).
    // Best-effort: if this RPC call fails, the user isn't blocked, and
    // conductChecked stays true so a retry on the next save attempt (there
    // won't be one, since isFirstListing flips false after listing !== null
    // on the next render) isn't required — this is logged for follow-up
    // instead of surfaced as a user-facing error.
    if (isFirstListing) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.rpc("accept_consent", {
          p_document_slug: "partner_conduct_rules",
          p_version_label: CONSENT_VERSIONS.partner_conduct_rules,
        });
      } catch (err) {
        console.warn("accept_consent_failed", { slug: "partner_conduct_rules", err });
      }
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

        {isFirstListing && (
          <ConsentCheckboxRow
            id="studio-conduct-consent"
            checked={conductChecked}
            onChange={(checked) => {
              setConductChecked(checked);
              setError(null);
            }}
            label="partnerAgreement"
            documents={[
              {
                slug: "partner_conduct_rules",
                labelKey: "partner_conduct_rules.linkLabel",
              },
            ]}
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <SaveButton type="submit" dirty={canSave} saving={saving} label={t("save")} />
      </form>
    </Card>
  );
}
