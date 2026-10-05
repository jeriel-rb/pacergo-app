"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { actionLabelKey, performOrderAction, type OrderAction } from "./order-actions";

export interface PendingOrderAction {
  orderId: string;
  action: OrderAction;
  /** One line naming the order, e.g. "Alice → Bob · NT$1,200". */
  summary: string;
}

/** Asks for the reason a ledger action needs, then records it. The server
 *  requires a reason, so an empty one is rejected here first. */
export function OrderActionDialog({
  state,
  onClose,
  onDone,
}: {
  state: PendingOrderAction | null;
  onClose: () => void;
  /** Called after the action was recorded. */
  onDone: (orderId: string) => void;
}) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = state ? t(actionLabelKey(state.action)) : "";

  function close() {
    if (busy) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!state) return;
    if (reason.trim() === "") {
      setError(t("orders.reasonRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await performOrderAction(state.orderId, state.action, reason.trim());
      toast.show(t("toast.orderUpdated"), "success");
      const id = state.orderId;
      setReason("");
      onClose();
      onDone(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.orderUpdateFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("orders.dialog.title", { action: label })}</DialogTitle>
          <DialogDescription>{state?.summary}</DialogDescription>
        </DialogHeader>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t("orders.actionsNotice")}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("orders.reasonPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            {t("orders.dialog.cancel")}
          </Button>
          <Button type="button" onClick={confirm} disabled={busy} className="gap-2">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
