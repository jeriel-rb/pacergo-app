"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, FileText, Loader2, X } from "lucide-react";
import {
  ACTIVITY_META,
  formatInAppTimeZone,
  isExperienceQualified,
  type ActivitySlug,
} from "@pacergo/shared";
import type { AdminVerification } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCertSignedUrl, reviewVerification } from "../admin-actions";
import { DashboardCard, EmptyState } from "./dashboard-parts";

export type Decision = "approved" | "rejected";

/** Side card for trainer verification requests still waiting on a decision: a
 *  scrolling list where each one can be opened, approved or rejected. Decided
 *  requests drop off the list (the KPI card keeps the approved / rejected counts). */
export function TrainerRequestsCard({
  queue,
  className,
}: {
  queue: AdminVerification[];
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const toast = useToast();
  const [review, setReview] = useState<{ item: AdminVerification; decision: Decision } | null>(
    null,
  );
  const [docBusy, setDocBusy] = useState<string | null>(null);

  const rows = useMemo(() => queue.filter((v) => v.status === "pending"), [queue]);

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, { year: "numeric", month: "short", day: "numeric" });

  async function openDoc(v: AdminVerification) {
    if (!v.document_path) return;
    setDocBusy(v.id);
    try {
      const url = await getCertSignedUrl(v.document_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.show(t("docError"), "destructive");
    } finally {
      setDocBusy(null);
    }
  }

  return (
    <DashboardCard title={t("dashboard.requests.title")} className={className}>
      {rows.length === 0 ? (
        <EmptyState>{t("dashboard.requests.empty")}</EmptyState>
      ) : (
        <ul className="-mr-2 max-h-[26rem] min-h-0 flex-1 divide-y divide-border overflow-y-auto pr-2 lg:max-h-none">
          {rows.map((v) => {
            const activity = v.activity
              ? (ACTIVITY_META[v.activity as ActivitySlug]?.[locale] ?? v.activity)
              : null;
            return (
              <li key={v.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <InitialAvatar name={v.display_name} src={v.photo_url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.display_name}</p>
                  {(activity || v.label) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[activity, v.label].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{stamp(v.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDoc(v)}
                    disabled={docBusy === v.id}
                    aria-label={t("viewDoc")}
                    title={t("viewDoc")}
                    className="h-8 w-8 p-0"
                  >
                    {docBusy === v.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <FileText size={15} />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReview({ item: v, decision: "rejected" })}
                    aria-label={t("reject")}
                    title={t("reject")}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X size={15} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setReview({ item: v, decision: "approved" })}
                    aria-label={t("approve")}
                    title={t("approve")}
                    className="h-8 w-8 p-0"
                  >
                    <Check size={15} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ReviewDialog state={review} onClose={() => setReview(null)} />
    </DashboardCard>
  );
}

/** Confirm an approve / reject, with the review bar for that activity and an
 *  optional note (shown to the trainer when rejected). */
export function ReviewDialog({
  state,
  onClose,
}: {
  state: { item: AdminVerification; decision: Decision } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const v = state?.item;
  const decision = state?.decision;

  // Review is the only enforcement point for document kind, so spell out the
  // per-activity bar: gym-style activities need a coaching licence, while
  // accompaniment activities accept experience proof instead.
  const barKey =
    v?.doc_type === "competition"
      ? "expected.competition"
      : v?.doc_type === "certification" && v.activity
        ? isExperienceQualified(v.activity)
          ? "expected.experience"
          : "expected.coachCert"
        : null;

  function close() {
    if (busy) return;
    setNotes("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!v || !decision) return;
    setBusy(true);
    setError(null);
    try {
      await reviewVerification(v.id, decision, notes.trim());
      toast.show(
        t(decision === "approved" ? "toast.verificationApproved" : "toast.verificationRejected"),
        "success",
      );
      setNotes("");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.verificationUpdateFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "approved"
              ? t("dashboard.requests.dialog.approveTitle")
              : t("dashboard.requests.dialog.rejectTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.requests.dialog.description", { name: v?.display_name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {barKey && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{t(barKey)}</p>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            {t("dashboard.requests.dialog.cancel")}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy}
            variant={decision === "rejected" ? "destructive" : "default"}
            className="gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {decision === "approved" ? t("approve") : t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
