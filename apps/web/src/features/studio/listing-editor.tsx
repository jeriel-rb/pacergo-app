"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { ListingStatus, StudioListing, VerificationStatus } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";
import { cn } from "@/lib/utils";
import { submitTrainerApplication, upsertMyListing } from "./studio-actions";
import { ConsentCheckboxRow } from "@/features/legal/consent-checkbox-row";
import { CONSENT_VERSIONS } from "@/lib/consent";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STATUSES: ListingStatus[] = ["draft", "active", "paused"];

const ListingDraftContext = createContext<(() => Promise<void>) | null>(null);

export type ReviewDraft = {
  /** Certificate name and PDF are both filled in. */
  ready: boolean;
  submit: () => Promise<void>;
};

const ReviewDraftContext = createContext<{
  draft: ReviewDraft | null;
  setDraft: (draft: ReviewDraft | null) => void;
} | null>(null);

/** The tier card registers the certificate here. The bottom button is what sends it. */
export function useReviewDraftSlot() {
  return useContext(ReviewDraftContext);
}

type DraftFlush = () => Promise<void>;

const StudioDraftContext = createContext<{
  registerOffering: (flush: DraftFlush | null, pending: boolean) => void;
  registerAvailability: (flush: DraftFlush | null, pending: boolean) => void;
  /** A plan or slot was stored. The list can show it before the page reloads. */
  noteSaved: (which: "offering" | "availability") => void;
} | null>(null);

/** Plans and availability register here so Save and Submit for review write them too. */
export function useStudioDraftRegistration() {
  return useContext(StudioDraftContext);
}

const ListingSaveContext = createContext<{
  ready: boolean;
  saving: boolean;
  error: string | null;
  hint: string | null;
  /** Save for Tier C. Submit for review while a Tier B or A certificate is open. */
  label: string;
} | null>(null);

const LISTING_FORM_ID = "studio-listing-form";

/** Bottom of the availability card. Save, or Submit for review when a certificate is open. */
export function ListingSaveBar() {
  const save = useContext(ListingSaveContext);
  if (!save) return null;
  return (
    <div className="space-y-3">
      {save.hint && <p className="text-sm text-muted-foreground">{save.hint}</p>}
      {save.error && <p className="text-sm text-destructive">{save.error}</p>}
      <div className="flex sm:justify-end">
        <Button
          type="submit"
          form={LISTING_FORM_ID}
          disabled={save.saving || !save.ready}
          className="w-full gap-2 sm:w-auto"
        >
          {save.saving && <Loader2 size={16} className="animate-spin" />}
          {save.label}
        </Button>
      </div>
    </div>
  );
}

/** Saves the listing as a draft so a plan or time slot can be stored first. */
export function useEnsureDraftListing() {
  return useContext(ListingDraftContext);
}

/** Edit the trainer's listing. Submit for review lives on the availability card. */
export function ListingEditor({
  listing,
  hasPricing,
  hasAvailability,
  isCompanion = true,
  applicationStatus = null,
  children,
}: {
  listing: StudioListing | null;
  hasPricing: boolean;
  hasAvailability: boolean;
  /** False until an admin approves the first trainer request. */
  isCompanion?: boolean;
  applicationStatus?: VerificationStatus | null;
  children?: ReactNode;
}) {
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
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [offeringPending, setOfferingPending] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [savedPricing, setSavedPricing] = useState(hasPricing);
  const [savedAvailability, setSavedAvailability] = useState(hasAvailability);
  const offeringFlushRef = useRef<DraftFlush | null>(null);
  const availabilityFlushRef = useRef<DraftFlush | null>(null);

  const registerOffering = useCallback((flush: DraftFlush | null, pending: boolean) => {
    offeringFlushRef.current = flush;
    setOfferingPending((prev) => (prev === pending ? prev : pending));
  }, []);
  const registerAvailability = useCallback((flush: DraftFlush | null, pending: boolean) => {
    availabilityFlushRef.current = flush;
    setAvailabilityPending((prev) => (prev === pending ? prev : pending));
  }, []);
  const noteSaved = useCallback((which: "offering" | "availability") => {
    if (which === "offering") setSavedPricing(true);
    else setSavedAvailability(true);
  }, []);
  const drafts = useMemo(
    () => ({ registerOffering, registerAvailability, noteSaved }),
    [registerOffering, registerAvailability, noteSaved],
  );

  const { dirty, markClean } = useFormDirty({ headline, bio, area, status });
  const profileReady =
    (hasPricing || savedPricing || offeringPending) &&
    (hasAvailability || savedAvailability || availabilityPending);
  // Tier C has no certificate card, so this stays a listing save. Selecting
  // Tier B or A mounts the certificate card, which registers a draft and
  // turns the same button into the trainer-request submit.
  const reviewing = reviewDraft != null;
  // A filled certificate is a change. Listing text, a new plan, or a new
  // slot are the others. Unchanged data must not be written again.
  const hasChange =
    dirty || offeringPending || availabilityPending || Boolean(reviewDraft?.ready);
  // An approved trainer edits with Save. Submit for review is the first
  // application, or a Tier A/B upload that is not already on file.
  const established = isCompanion || applicationStatus === "approved";
  const needsApplication = !established;
  const awaitingReview = needsApplication && applicationStatus === "pending";
  const ready =
    profileReady &&
    !awaitingReview &&
    (reviewing ? Boolean(reviewDraft?.ready) : needsApplication || hasChange);
  const hint = reviewing && !reviewDraft?.ready ? t("cert.needFile") : null;
  const label = needsApplication || reviewing ? t("cert.submit") : t("save");

  const ensureDraftListing = useCallback(async () => {
    await upsertMyListing({
      headline: headline.trim() || null,
      bioLong: bio.trim() || null,
      servedArea: area.trim() || null,
      status: status === "active" ? "draft" : status,
    });
  }, [headline, bio, area, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !ready) return;
    if (!profileReady) {
      setError(t("listing.needPlanAndAvailability"));
      return;
    }
    if (reviewDraft && !reviewDraft.ready) {
      setError(t("cert.needFile"));
      return;
    }
    if (isFirstListing && !conductChecked) {
      setError(t("listing.conductRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = {
        headline: headline.trim() || null,
        bioLong: bio.trim() || null,
        servedArea: area.trim() || null,
      };
      // An active listing cannot be stored before a price plan exists, so a
      // plan still sitting in the form is written first, then the listing
      // goes active.
      const becoming = needsApplication && !reviewDraft?.ready;
      const planStillPending = !becoming && status === "active" && !hasPricing;
      await upsertMyListing({
        ...fields,
        status: becoming || planStillPending ? "draft" : status,
      });
      await offeringFlushRef.current?.();
      await availabilityFlushRef.current?.();
      if (planStillPending) {
        await upsertMyListing({ ...fields, status: "active" });
      }
      if (reviewDraft?.ready) await reviewDraft.submit();
      else if (needsApplication) await submitTrainerApplication();
      markClean();
      toast.show(
        reviewDraft?.ready || needsApplication
          ? t("toast.verificationSubmitted")
          : t("toast.listingSaved"),
        "success",
      );
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(raw.includes("setup_required") ? t("listing.needPlanAndAvailability") : raw || t("error"));
      toast.show(
        reviewing || needsApplication
          ? t("toast.verificationSubmitFailed")
          : t("toast.listingSaveFailed"),
        "destructive",
      );
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
    <ListingDraftContext.Provider value={ensureDraftListing}>
    <StudioDraftContext.Provider value={drafts}>
    <ReviewDraftContext.Provider value={{ draft: reviewDraft, setDraft: setReviewDraft }}>
    <ListingSaveContext.Provider value={{ ready, saving, error, hint, label }}>
    <form id={LISTING_FORM_ID} onSubmit={onSubmit} className="contents">
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{t("listing.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("listing.subtitle")}</p>
      </div>

      <div className="space-y-4">
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
      </div>
    </Card>
    {children}
    </form>
    </ListingSaveContext.Provider>
    </ReviewDraftContext.Provider>
    </StudioDraftContext.Provider>
    </ListingDraftContext.Provider>
  );
}
