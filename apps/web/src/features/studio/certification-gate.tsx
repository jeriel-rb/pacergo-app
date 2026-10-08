"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, FileUp, ShieldAlert } from "lucide-react";
import type { ActivitySlug, Tier } from "@pacergo/shared";
import type { VerificationStatus } from "@/lib/studio";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { validateCertFile, type VerificationDocType } from "./certification";
import { submitVerificationDoc } from "./studio-actions";
import { useReviewDraftSlot } from "./listing-editor";

/**
 * Per-activity proof upload for every tier (all three are admin-reviewed):
 * `background` — a sports-background proof for Tier C (`bg.*`);
 * `certification` — a coach certification for Tier B (`cert.*`);
 * `competition` — competition / award proof, with the certification, for
 * Tier A (`comp.*`). Upload mechanics come from `cert.*` / `comp.*`. When
 * Tier A is selected, the certification card also notes the extra
 * competition-proof requirement so A doesn't read identically to B.
 */
export function VerificationGate({
  docType,
  activity,
  activityLabel,
  status,
  tier,
}: {
  docType: VerificationDocType;
  activity: ActivitySlug;
  activityLabel: string;
  status: VerificationStatus | undefined;
  tier?: Tier;
}) {
  const { t } = useTranslation("studio");
  const setReviewDraft = useReviewDraftSlot()?.setDraft;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Copy prefix per document kind. Mechanics (file picker/submit/hints) stay
  // under `cert.*`/`comp.*`.
  const k = docType === "competition" ? "comp" : docType === "background" ? "bg" : "cert";
  const m = docType === "competition" ? "comp" : "cert";
  const showTierANote = docType === "certification" && tier === "A";

  // Only a started upload becomes the pending submission, so an empty card
  // doesn't block saving other listing edits.
  const started = Boolean(file || label.trim());
  useEffect(() => {
    if (!setReviewDraft || status === "pending" || !started) return;
    setReviewDraft({
      ready: Boolean(file && label.trim()),
      submit: async () => {
        if (!file || !label.trim()) return;
        await submitVerificationDoc({ docType, activity, file, label: label.trim() });
      },
    });
    return () => setReviewDraft(null);
  }, [setReviewDraft, status, started, file, label, docType, activity]);

  if (status === "pending") {
    return (
      <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <span>{t(`${k}.pending`, { activity: activityLabel })}</span>
        </div>
        {showTierANote && (
          <p className="pl-6 text-xs">{t("cert.tierANote")}</p>
        )}
      </div>
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const invalid = validateCertFile(f);
    if (invalid) {
      setError(t(invalid === "type" ? `${m}.hintType` : `${m}.hintSize`));
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {t(`${k}.title`, { activity: activityLabel })}
          </p>
          <p className="text-xs text-muted-foreground">{t(`${k}.body`)}</p>
          {showTierANote && (
            <p className="text-xs font-medium text-primary">
              {t("cert.tierANote")}
            </p>
          )}
        </div>
      </div>

      {status === "rejected" && (
        <p className="text-xs font-medium text-destructive">
          {t(`${k}.rejected`)}
        </p>
      )}

      <Input
        label={
          <>
            {t(`${k}.label`)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </>
        }
        required
        placeholder={t(`${k}.labelPlaceholder`)}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-full justify-start gap-2 font-normal"
      >
        <FileUp size={16} />
        <span className="truncate">{file ? file.name : t(`${m}.choose`)}</span>
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
