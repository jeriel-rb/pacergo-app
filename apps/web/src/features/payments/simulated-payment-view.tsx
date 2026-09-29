"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentDetail } from "@/lib/payments";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";
import { useToast } from "@/shared/components/ui/toast";
import { confirmSimulatedPayment } from "./simulated-actions";

/** Checkout screen for the simulated provider. Copy is a normal payment, with no test labeling. */
export function SimulatedPaymentView({ payment }: { payment: PaymentDetail }) {
  const { t } = useTranslation("payments");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "decline");
    setError(null);
    try {
      await confirmSimulatedPayment(payment.id, approve);
      toast.show(
        t(approve ? "toast.paymentApproved" : "toast.paymentDeclined"),
        approve ? "success" : "default",
      );
      router.push(
        getLocalizedPath(`/payments/newebpay/result?payment=${payment.id}`, locale),
      );
    } catch (e) {
      const code = e instanceof Error ? e.message : "payment_request_failed";
      setError(t(`errors.${code}`, { defaultValue: t("errors.payment_request_failed") }));
      toast.show(t("toast.paymentActionFailed"), "destructive");
      setBusy(null);
    }
  }

  const pending = payment.status === "created" || payment.status === "redirected" || payment.status === "processing";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold lg:text-3xl">{t("simulated.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("simulated.notice")}</p>
      </header>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{t("review.total")}</span>
          <PriceTag amount={payment.amount} isFree={false} locale={locale} className="text-lg" />
        </div>

        {!pending ? (
          <p className="text-sm text-muted-foreground">{t("simulated.alreadyResolved")}</p>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => void decide(true)}
                disabled={busy !== null}
                className="w-full gap-2 sm:flex-1"
              >
                {busy === "approve" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {t("simulated.approve")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void decide(false)}
                disabled={busy !== null}
                className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-1"
              >
                {busy === "decline" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <X size={16} />
                )}
                {t("simulated.decline")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
