"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";

interface GatewayForm {
  action: string;
  fields: Record<string, string>;
}

export function NewebPayButton({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation("payments");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [gatewayForm, setGatewayForm] = useState<GatewayForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gatewayForm) return;
    const timer = window.setTimeout(() => formRef.current?.submit(), 100);
    return () => window.clearTimeout(timer);
  }, [gatewayForm]);

  async function startPayment() {
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
        error?: string;
      };
      if (!response.ok || !payload.form) {
        throw new Error(payload.error ?? "payment_request_failed");
      }
      setGatewayForm(payload.form);
    } catch (err) {
      setBusy(false);
      const code = err instanceof Error ? err.message : "payment_request_failed";
      setError(t(`errors.${code}`, { defaultValue: t("errors.payment_request_failed") }));
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
        disabled={busy}
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
    </div>
  );
}
