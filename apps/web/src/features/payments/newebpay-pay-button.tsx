"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { useToast } from "@/shared/components/ui/toast";
import { confirmSimulatedPayment } from "./simulated-actions";

interface GatewayForm {
  action: string;
  fields: Record<string, string>;
}

export function NewebPayButton({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation("payments");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [gatewayForm, setGatewayForm] = useState<GatewayForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; amount: number } | null>(null);
  const [decision, setDecision] = useState<"approve" | "decline" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const keepAttemptRef = useRef(false);

  useEffect(() => {
    if (!gatewayForm) return;
    const timer = window.setTimeout(() => formRef.current?.submit(), 100);
    return () => window.clearTimeout(timer);
  }, [gatewayForm]);

  useEffect(() => {
    return () => {
      const id = pendingIdRef.current;
      if (!id || keepAttemptRef.current) return;
      pendingIdRef.current = null;
      void confirmSimulatedPayment(id, false);
    };
  }, []);

  function openConfirm(payment: { id: string; amount: number }) {
    pendingIdRef.current = payment.id;
    keepAttemptRef.current = false;
    setPending(payment);
    setDialogError(null);
    setConfirmOpen(true);
    setBusy(false);
  }

  async function releaseAttempt() {
    const id = pendingIdRef.current;
    pendingIdRef.current = null;
    setPending(null);
    setConfirmOpen(false);
    setDecision(null);
    if (!id || keepAttemptRef.current) return;
    try {
      await confirmSimulatedPayment(id, false);
      toast.show(t("toast.paymentDeclined"), "default");
    } catch {
      // Already closed, or the attempt was replaced. Pay securely can start again.
    }
  }

  async function payNow() {
    if (!pending) return;
    setDecision("approve");
    setDialogError(null);
    keepAttemptRef.current = true;
    try {
      await confirmSimulatedPayment(pending.id, true);
      pendingIdRef.current = null;
      toast.show(t("toast.paymentApproved"), "success");
      router.push(
        getLocalizedPath(`/payments/newebpay/result?payment=${pending.id}`, locale),
      );
    } catch (err) {
      keepAttemptRef.current = false;
      setDecision(null);
      const code = err instanceof Error ? err.message : "payment_request_failed";
      setDialogError(
        t(`errors.${code}`, { defaultValue: t("errors.payment_request_failed") }),
      );
      toast.show(t("toast.paymentActionFailed"), "destructive");
    }
  }

  async function startPayment() {
    if (pending) {
      setDialogError(null);
      setConfirmOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/newebpay/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, locale }),
      });
      const payload = (await response.json()) as {
        form?: GatewayForm;
        paymentId?: string;
        amount?: number;
        simulated?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "payment_request_failed");
      }
      if (payload.simulated && payload.paymentId) {
        openConfirm({ id: payload.paymentId, amount: payload.amount ?? 0 });
        return;
      }
      if (!payload.form) {
        throw new Error(payload.error ?? "payment_request_failed");
      }
      setGatewayForm(payload.form);
    } catch (err) {
      setBusy(false);
      const code = err instanceof Error ? err.message : "payment_request_failed";
      setError(t(`errors.${code}`, { defaultValue: t("errors.payment_request_failed") }));
      toast.show(t("toast.paymentActionFailed"), "destructive");
    }
  }

  if (gatewayForm) {
    return (
      <div className="space-y-3" aria-live="polite">
        <form ref={formRef} method="post" action={gatewayForm.action}>
          {Object.entries(gatewayForm.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" className="w-full gap-2">
            <Loader2 size={16} className="animate-spin" />
            {t("redirecting")}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          {t("manualContinue")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={startPayment}
        disabled={busy || decision !== null}
        className="w-full gap-2"
        aria-busy={busy}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        {busy ? t("starting") : t("paySecurely")}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (decision) return;
          if (!next) {
            void releaseAttempt();
            return;
          }
          setConfirmOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("simulated.title")}</DialogTitle>
            <DialogDescription>{t("simulated.notice")}</DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{t("review.total")}</span>
              <PriceTag
                amount={pending.amount}
                isFree={false}
                locale={locale}
                className="text-lg"
              />
            </div>
          )}
          {dialogError && (
            <p className="text-sm text-destructive" role="alert">
              {dialogError}
            </p>
          )}
          <DialogFooter className="flex-row justify-end">
            <Button
              type="button"
              variant="destructive"
              disabled={decision !== null}
              onClick={() => void releaseAttempt()}
            >
              {t("simulated.decline")}
            </Button>
            <Button
              type="button"
              disabled={decision !== null}
              onClick={() => void payNow()}
            >
              {decision === "approve" && <Loader2 size={16} className="animate-spin" />}
              {t("simulated.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
