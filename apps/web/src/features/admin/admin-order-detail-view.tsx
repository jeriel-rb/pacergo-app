"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminOrderDetail } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import {
  correctServiceCompleted,
  setPaymentHold,
  setPaymentStatus,
} from "./admin-actions";

function ntd(amount: number): string {
  return `NT$${amount.toLocaleString()}`;
}

function formatStamp(iso: string, locale: "zh" | "en"): string {
  return formatInAppTimeZone(iso, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

type Busy =
  | "cancel"
  | "refund_requested"
  | "refunded"
  | "hold"
  | "release"
  | "complete"
  | "revert"
  | null;

/** Records refund, hold, and service-completed on the ledger. No gateway call. */
export function AdminOrderDetailView({ detail }: { detail: AdminOrderDetail }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const settled = detail.settlement_status === "paid";
  const serviceDone = detail.service_completed_at !== null;

  async function run(key: Exclude<Busy, null>, action: () => Promise<void>) {
    if (reason.trim() === "") {
      setError(t("orders.reasonRequired"));
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await action();
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">
          {detail.seeker_name ?? t("orders.unknown")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("orders.withTrainer", {
            name: detail.companion_name ?? t("orders.unknown"),
          })}
        </p>
      </header>

      <Card className="space-y-2 p-5">
        <p className="text-xs font-medium text-muted-foreground">{t("orders.amount")}</p>
        <p className="text-2xl font-bold text-primary">{ntd(detail.amount)}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 text-sm">
          <dt className="text-muted-foreground">{t("orders.fields.status")}</dt>
          <dd>{t(`orders.status.${detail.status}`, { defaultValue: detail.status })}</dd>
          <dt className="text-muted-foreground">{t("orders.fields.refund")}</dt>
          <dd>{t(`orders.refund.${detail.refund_status}`)}</dd>
          <dt className="text-muted-foreground">{t("orders.fields.provider")}</dt>
          <dd>{t(`orders.provider.${detail.provider}`, { defaultValue: detail.provider })}</dd>
          <dt className="text-muted-foreground">{t("orders.fields.fee")}</dt>
          <dd>{ntd(detail.platform_fee_amount)}</dd>
          <dt className="text-muted-foreground">{t("orders.fields.processing")}</dt>
          <dd>
            {detail.processing_fee_amount == null
              ? "—"
              : ntd(detail.processing_fee_amount)}
          </dd>
          <dt className="text-muted-foreground">{t("orders.fields.payable")}</dt>
          <dd>{detail.trainer_payable == null ? "—" : ntd(detail.trainer_payable)}</dd>
          <dt className="text-muted-foreground">{t("orders.fields.settlement")}</dt>
          <dd>
            {t(`orders.settlement.${detail.settlement_eligibility_status}`, {
              defaultValue: detail.settlement_eligibility_status,
            })}
            {" · "}
            {t(`orders.settlementState.${detail.settlement_status}`)}
          </dd>
          <dt className="text-muted-foreground">{t("orders.fields.service")}</dt>
          <dd>
            {serviceDone
              ? formatStamp(detail.service_completed_at!, locale)
              : t("orders.serviceOpen")}
          </dd>
          <dt className="text-muted-foreground">{t("orders.fields.hold")}</dt>
          <dd>{detail.admin_hold ? t("orders.holdOn") : t("orders.holdOff")}</dd>
        </dl>
        {detail.admin_hold_reason && (
          <p className="pt-1 text-sm text-muted-foreground">{detail.admin_hold_reason}</p>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold">{t("orders.actions")}</p>
        <p className="text-sm text-muted-foreground">{t("orders.actionsNotice")}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("orders.reasonPlaceholder")}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {detail.status === "paid" && detail.refund_status === "none" && !settled && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run("refund_requested", () =>
                  setPaymentStatus(detail.id, "refund_requested", reason.trim()),
                )
              }
            >
              {busy === "refund_requested" && <Loader2 className="animate-spin" />}
              {t("orders.action.refund_requested")}
            </Button>
          )}
          {detail.refund_status === "refund_requested" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run("refunded", () =>
                  setPaymentStatus(detail.id, "refunded", reason.trim()),
                )
              }
            >
              {busy === "refunded" && <Loader2 className="animate-spin" />}
              {t("orders.action.refunded")}
            </Button>
          )}
          {detail.status !== "cancelled" && detail.status !== "paid" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run("cancel", () => setPaymentStatus(detail.id, "cancel", reason.trim()))
              }
            >
              {busy === "cancel" && <Loader2 className="animate-spin" />}
              {t("orders.action.cancel")}
            </Button>
          )}
          {!settled && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run(detail.admin_hold ? "release" : "hold", () =>
                  setPaymentHold(detail.id, !detail.admin_hold, reason.trim()),
                )
              }
            >
              {(busy === "hold" || busy === "release") && <Loader2 className="animate-spin" />}
              {detail.admin_hold ? t("orders.action.release") : t("orders.action.hold")}
            </Button>
          )}
          {detail.status === "paid" && !settled && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run(serviceDone ? "revert" : "complete", () =>
                  correctServiceCompleted(detail.id, !serviceDone, reason.trim()),
                )
              }
            >
              {(busy === "complete" || busy === "revert") && <Loader2 className="animate-spin" />}
              {serviceDone ? t("orders.action.revertService") : t("orders.action.completeService")}
            </Button>
          )}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("orders.history")}</h2>
        {detail.history.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("orders.noHistory")}</Card>
        ) : (
          detail.history.map((event, i) => (
            <Card key={i} className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {t(`orders.events.${event.event_type}`, { defaultValue: event.event_type })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatStamp(event.created_at, locale)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {event.actor_name ?? t("orders.systemActor")}
              </p>
              {event.reason_note && <p className="text-sm">{event.reason_note}</p>}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
