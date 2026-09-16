import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { ACTIVITY_META, formatInAppTimeZone } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { buttonVariants } from "@/shared/components/ui/button";
import { getLocalizedPath } from "@/lib/locale-path";
import type { PaymentDetail } from "@/lib/payments";
import { cn } from "@/lib/utils";

export function PaymentResultView({
  payment,
  locale,
  t,
}: {
  payment: PaymentDetail | null;
  locale: "zh" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const state = payment ? normalizeStatus(payment.status) : "unknown";
  const Icon =
    state === "paid"
      ? CheckCircle2
      : ["failed", "cancelled", "expired", "unknown"].includes(state)
        ? AlertTriangle
        : Clock3;
  const activity =
    payment?.booking.activity_slug && ACTIVITY_META[payment.booking.activity_slug]
      ? ACTIVITY_META[payment.booking.activity_slug][locale]
      : t("unknown");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-md p-2", state === "paid" ? "bg-emerald-500/10 text-emerald-600" : state === "failed" ? "bg-rose-500/10 text-rose-600" : "bg-blue-500/10 text-blue-600")}>
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{t(`result.${state}.title`)}</h1>
            <p className="text-sm text-muted-foreground">{t(`result.${state}.body`)}</p>
          </div>
        </div>

        {payment && (
          <div className="space-y-2.5 border-t border-border pt-4 text-sm">
            <Row label={t("result.booking")} value={activity} />
            <Row
              label={t("result.amount")}
              value={`${payment.currency} ${payment.amount.toLocaleString(locale === "zh" ? "zh-TW" : "en-US")}`}
            />
            <Row label={t("result.reference")} value={payment.merchant_order_no} />
            {payment.provider_trade_no && (
              <Row label={t("result.providerReference")} value={payment.provider_trade_no} />
            )}
            {payment.paid_at && (
              <Row
                label={t("result.paymentDate")}
                value={formatInAppTimeZone(payment.paid_at, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZoneName: "short",
                })}
              />
            )}
            {Object.entries(payment.payment_instructions ?? {}).length > 0 && state !== "paid" && (
              <div className="border-t border-border pt-3">
                <p className="font-semibold">{t("instructions.title")}</p>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(payment.payment_instructions).map(([key, value]) => (
                    <Row key={key} label={t(`instructions.${key}`, { defaultValue: key })} value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href={payment ? getLocalizedPath(`/payments/newebpay/result?payment=${payment.id}`, locale) : getLocalizedPath("/sessions", locale)}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <RefreshCw size={16} />
          {t("refreshStatus")}
        </Link>
        {payment && (
          <Link
            href={getLocalizedPath(`/sessions/${payment.booking_id}`, locale)}
            className={buttonVariants({ variant: "default" })}
          >
            {t("viewBooking")}
          </Link>
        )}
        <Link
          href={getLocalizedPath("/sessions", locale)}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("returnToBookings")}
        </Link>
      </div>
    </div>
  );
}

function normalizeStatus(status: PaymentDetail["status"]) {
  if (status === "paid") return "paid";
  if (status === "failed" || status === "cancelled" || status === "expired") return status;
  if (status === "awaiting_payment") return "pending";
  return "processing";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  );
}
