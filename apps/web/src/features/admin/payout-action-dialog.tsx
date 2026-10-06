"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PayoutStatus } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/components/ui/toast";
import { setWithdrawalStatus } from "./admin-actions";
import { isCorrection } from "./payout-actions";

export interface PendingPayoutAction {
  id: string;
  from: PayoutStatus;
  to: PayoutStatus;
  /** One line naming the payout, e.g. "Alice Chen · NT$1,200". */
  summary: string;
}

/** Confirms a payout status change from the table menu. Corrections (reject,
 *  cancel, revert) need a reason note; forward steps take an optional one. */
export function PayoutActionDialog({
  state,
  onClose,
  onDone,
}: {
  state: PendingPayoutAction | null;
  onClose: () => void;
  /** Called after the change was recorded (e.g. to reload an open sheet). */
  onDone?: (id: string) => void;
}) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correction = state ? isCorrection(state.from, state.to) : false;
  const label = state ? t(`payouts.action.${state.to}`) : "";
  const destructive = state?.to === "rejected" || state?.to === "cancelled";

  function close() {
    if (busy) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!state) return;
    if (correction && reason.trim() === "") {
      setError(t("payouts.reasonRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setWithdrawalStatus(state.id, state.to, reason.trim());
      toast.show(t("toast.payoutUpdated"), "success");
      setReason("");
      onClose();
      router.refresh();
      onDone?.(state.id);
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
          <DialogTitle>{t("payouts.dialog.title", { action: label })}</DialogTitle>
          <DialogDescription>{state?.summary}</DialogDescription>
        </DialogHeader>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t(correction ? "payouts.reasonPlaceholder" : "payouts.dialog.reasonOptional")}
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
            variant={destructive ? "destructive" : "default"}
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
