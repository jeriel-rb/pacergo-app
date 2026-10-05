"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Check, Loader2, X } from "lucide-react";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { PayoutListRow, PayoutStatus } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusBadge, type StatusTone } from "@/shared/components/atoms/status-badge";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { setWithdrawalStatus } from "../admin-actions";
import { DashboardCard, EmptyState, ntd } from "./dashboard-parts";

/** The next step forward for a payout that is still open. */
const FORWARD: Partial<Record<PayoutStatus, "processing" | "paid">> = {
  requested: "processing",
  processing: "paid",
};
const STATUS_TONE: Record<PayoutStatus, StatusTone> = {
  requested: "warning",
  processing: "info",
  paid: "success",
  rejected: "danger",
  cancelled: "muted",
};

type Pending = { row: PayoutListRow; to: "processing" | "paid" | "rejected" };

/** Side card for trainer withdrawal requests that still need an admin: a list of
 *  requested / processing payouts where each one can be moved forward
 *  (requested → processing → paid) or rejected. Paid, rejected and cancelled
 *  payouts leave the list; the full history is on the Payouts page. */
export function PayoutsCard({ rows, className }: { rows: PayoutListRow[]; className?: string }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const routeLocale = getCurrentLocale(usePathname());
  const [pending, setPending] = useState<Pending | null>(null);

  const open = useMemo(
    () => rows.filter((r) => r.status === "requested" || r.status === "processing"),
    [rows],
  );

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, { year: "numeric", month: "short", day: "numeric" });

  return (
    <DashboardCard title={t("dashboard.payouts.title")} className={className}>
      {open.length === 0 ? (
        <EmptyState>{t("dashboard.payouts.empty")}</EmptyState>
      ) : (
        <ul className="-mr-2 max-h-[26rem] min-h-0 flex-1 divide-y divide-border overflow-y-auto pr-2 lg:max-h-none">
          {open.map((r) => {
            const next = FORWARD[r.status]!;
            return (
              <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={getLocalizedPath(`/admin/payouts/${r.id}`, routeLocale)}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {r.trainer_name}
                  </Link>
                  <p className="text-sm font-semibold">{ntd(r.amount)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusBadge tone={STATUS_TONE[r.status]}>
                      {t(`payouts.status.${r.status}`)}
                    </StatusBadge>
                    {stamp(r.requested_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setPending({ row: r, to: next })}
                    aria-label={t(`payouts.action.${next}`)}
                    title={t(`payouts.action.${next}`)}
                    className="h-8 w-8 p-0"
                  >
                    {next === "paid" ? <Banknote size={15} /> : <Check size={15} />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPending({ row: r, to: "rejected" })}
                    aria-label={t("payouts.action.rejected")}
                    title={t("payouts.action.rejected")}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X size={15} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PayoutDialog state={pending} onClose={() => setPending(null)} />
    </DashboardCard>
  );
}

/** Confirm moving a payout forward or rejecting it. A rejection needs a reason
 *  (the server enforces it too); moving forward may carry an optional note. */
function PayoutDialog({ state, onClose }: { state: Pending | null; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const row = state?.row;
  const to = state?.to;
  const label = to ? t(`payouts.action.${to}`) : "";

  function close() {
    if (busy) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!row || !to) return;
    if (to === "rejected" && !reason.trim()) {
      setError(t("payouts.reasonRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setWithdrawalStatus(row.id, to, reason.trim());
      toast.show(t("toast.payoutUpdated"), "success");
      setReason("");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.payoutUpdateFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dashboard.payouts.dialog.title", { action: label })}</DialogTitle>
          <DialogDescription>
            {row ? `${row.trainer_name} · ${ntd(row.amount)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("payouts.reasonPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            {t("dashboard.payouts.dialog.cancel")}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy}
            variant={to === "rejected" ? "destructive" : "default"}
            className="gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
