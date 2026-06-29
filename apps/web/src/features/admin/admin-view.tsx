"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, FileText, Loader2, X } from "lucide-react";
import { ACTIVITY_META, type ActivitySlug } from "@pacergo/shared";
import type { AdminVerification } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import { getCertSignedUrl, reviewVerification } from "./admin-actions";

/** Admin review queue for Tier A certification requests. */
export function AdminView({ queue }: { queue: AdminVerification[] }) {
  const { t } = useTranslation("admin");
  const pending = queue.filter((v) => v.status === "pending");
  const reviewed = queue.filter((v) => v.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("pendingTitle")} ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("empty")}</Card>
        ) : (
          pending.map((v) => <Row key={v.id} v={v} />)
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("historyTitle")} ({reviewed.length})
          </h2>
          {reviewed.map((v) => (
            <Row key={v.id} v={v} />
          ))}
        </section>
      )}
    </div>
  );
}

function Row({ v }: { v: AdminVerification }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const router = useRouter();
  const activityLabel = v.activity
    ? ACTIVITY_META[v.activity as ActivitySlug]?.[locale] ?? v.activity
    : null;
  const [notes, setNotes] = useState(v.notes ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | "doc" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = v.status === "pending";

  async function openDoc() {
    setBusy("doc");
    setError(null);
    try {
      const url = await getCertSignedUrl(v.document_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("docError"));
    } finally {
      setBusy(null);
    }
  }

  async function decide(status: "approved" | "rejected") {
    setBusy(status === "approved" ? "approve" : "reject");
    setError(null);
    try {
      await reviewVerification(v.id, status, notes.trim());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <InitialAvatar name={v.display_name} src={v.photo_url} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{v.display_name}</p>
            {activityLabel && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {activityLabel}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {v.label || t("noLabel")}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("submitted", {
          date: new Date(v.created_at).toLocaleDateString(),
        })}
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={openDoc}
        disabled={busy !== null}
        className="w-full justify-start gap-2"
      >
        {busy === "doc" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        {t("viewDoc")}
      </Button>

      {isPending && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => decide("approved")}
              disabled={busy !== null}
              className="flex-1 gap-2"
            >
              {busy === "approve" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {t("approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => decide("rejected")}
              disabled={busy !== null}
              className="flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {busy === "reject" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <X size={16} />
              )}
              {t("reject")}
            </Button>
          </div>
        </>
      )}

      {!isPending && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: AdminVerification["status"] }) {
  const { t } = useTranslation("admin");
  const cls =
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        cls,
      )}
    >
      {t(status)}
    </span>
  );
}
