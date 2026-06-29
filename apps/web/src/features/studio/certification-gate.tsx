"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Clock, FileUp, Loader2, ShieldAlert } from "lucide-react";
import type { StudioVerification } from "@/lib/studio";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { validateCertFile } from "./certification";
import { submitCertification } from "./studio-actions";

/**
 * Tier A gate. A trainer must upload a certification (PDF, e.g. a gym instructor
 * licence) and have a platform admin approve it before Tier A unlocks. Shows the
 * current review state, or the upload form when nothing is pending/approved.
 */
export function CertificationGate({
  verification,
}: {
  verification: StudioVerification | null;
}) {
  const { t } = useTranslation("studio");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = verification?.status ?? "none";

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        <BadgeCheck size={16} className="shrink-0" />
        <span>{t("cert.approved")}</span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
        <Clock size={16} className="shrink-0" />
        <span>{t("cert.pending")}</span>
      </div>
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const invalid = validateCertFile(f);
    if (invalid) {
      setError(t(invalid === "type" ? "cert.hintType" : "cert.hintSize"));
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }

  async function submit() {
    if (!file) {
      setError(t("cert.needFile"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitCertification({ file, label: label.trim() });
      setFile(null);
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t("cert.title")}</p>
          <p className="text-xs text-muted-foreground">{t("cert.body")}</p>
        </div>
      </div>

      {status === "rejected" && (
        <p className="text-xs font-medium text-destructive">
          {t("cert.rejected")}
        </p>
      )}

      <Input
        label={t("cert.label")}
        placeholder={t("cert.labelPlaceholder")}
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
        <span className="truncate">{file ? file.name : t("cert.choose")}</span>
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        onClick={submit}
        disabled={busy || !file}
        className="w-full gap-2"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {t("cert.submit")}
      </Button>
    </div>
  );
}
