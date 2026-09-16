"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FlaskConical, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentDetail } from "@/lib/payments";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";
import { confirmSimulatedPayment } from "./simulated-actions";

/** B-2 Phase 1 simulated checkout screen — explicit approve/decline test
 *  controls, clearly labeled test/beta, no card data collected. */
export function SimulatedPaymentView({ payment }: { payment: PaymentDetail }) {
  const { t } = useTranslation("payments");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "decline");
    setError(null);
    try {
      await confirmSimulatedPayment(payment.id, approve);
      router.push(
        getLocalizedPath(`/payments/newebpay/result?payment=${payment.id}`, locale),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.payment_request_failed"));
      setBusy(null);
    }
  }

  const pending = payment.status === "created" || payment.status === "redirected" || payment.status === "processing";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <FlaskConical size={12} />
          {t("simulated.badge")}
        </div>
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
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void decide(true)}
                disabled={busy !== null}
                className="flex-1 gap-2"
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
                variant="outline"
                onClick={() => void decide(false)}
                disabled={busy !== null}
                className="flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
