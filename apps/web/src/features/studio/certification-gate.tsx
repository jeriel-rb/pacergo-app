"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Clock, FileUp, Loader2, ShieldAlert } from "lucide-react";
import { isExperienceQualified, type ActivitySlug, type Tier } from "@pacergo/shared";
import type { VerificationStatus } from "@/lib/studio";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { validateCertFile, type VerificationDocType } from "./certification";
import { submitVerificationDoc } from "./studio-actions";

/**
 * Per-activity verification gate for the certified tiers. Handles both document
 * kinds via `docType`: a `certification` (unlocks Tiers B & A) and a
 * `competition` experience proof (additionally required for Tier A). The
 * certification copy is qualification-aware (ACTIVITY_QUALIFICATION): gym-style
 * activities ask for a coaching licence (`cert.*`), accompaniment activities
 * (running/hiking/Hyrox…) accept experience proof instead (`certExp.*`);
 * upload mechanics always come from `cert.*` / `comp.*`. When Tier A is
 * selected, the certification card also notes the extra competition-proof
 * requirement so A doesn't read identically to B.
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
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy prefix: competitions `comp.*`; certifications `cert.*`, or `certExp.*`
  // for experience-qualified activities. Mechanics (file picker/submit/hints)
  // stay under `cert.*`/`comp.*`.
  const isExperience =
    docType === "certification" && isExperienceQualified(activity);
  const k = docType === "competition" ? "comp" : isExperience ? "certExp" : "cert";
  const m = docType === "competition" ? "comp" : "cert";
  const showTierANote = docType === "certification" && tier === "A";

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

  async function submit() {
    if (!label.trim()) {
      setError(t(`${m}.needLabel`));
      return;
    }
    if (!file) {
      setError(t(`${m}.needFile`));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitVerificationDoc({ docType, activity, file, label: label.trim() });
      setFile(null);
      setLabel("");
      toast.show(t("toast.verificationSubmitted"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      toast.show(t("toast.verificationSubmitFailed"), "destructive");
    } finally {
      setBusy(false);
    }
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

      <Button
        type="button"
        onClick={submit}
        disabled={busy || !file || !label.trim()}
        className="w-full gap-2"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {t(`${m}.submit`)}
      </Button>
    </div>
  );
}
