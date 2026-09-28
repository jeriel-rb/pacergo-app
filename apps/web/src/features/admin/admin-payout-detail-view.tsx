"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { PayoutDetail, PayoutStatus } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { setWithdrawalStatus } from "./admin-actions";
import { StatusBadge } from "./admin-payouts-view";

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

/** Transitions from the current status: [forward steps, correction steps].
 *  Forward steps don't require a reason; corrections do (enforced server-side
 *  too, in admin_set_withdrawal_status). */
const TRANSITIONS: Record<
  PayoutStatus,
  { forward: PayoutStatus[]; corrections: PayoutStatus[] }
> = {
  requested: { forward: ["processing"], corrections: ["rejected", "cancelled"] },
  processing: { forward: ["paid"], corrections: ["rejected", "cancelled", "requested"] },
  paid: { forward: [], corrections: ["processing"] },
  rejected: { forward: [], corrections: ["requested"] },
  cancelled: { forward: [], corrections: ["requested"] },
};

/** B-8: full bank reveal (admin-only), status workflow + corrections, full
 *  history. Full bank details render ONLY here — masked everywhere else. */
export function AdminPayoutDetailView({ detail }: { detail: PayoutDetail }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<PayoutStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { forward, corrections } = TRANSITIONS[detail.status];

  async function transition(to: PayoutStatus, requiresReason: boolean) {
    if (requiresReason && reason.trim() === "") {
      setError(t("payouts.reasonRequired"));
      return;
    }
    setBusy(to);
    setError(null);
    try {
      await setWithdrawalStatus(detail.id, to, reason.trim());
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
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">{detail.trainer_name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatStamp(detail.requested_at, locale)}
          </p>
        </div>
        <StatusBadge status={detail.status} />
      </header>

      <Card className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{t("payouts.amount")}</p>
        <p className="mt-1 text-2xl font-bold text-primary">{ntd(detail.amount)}</p>
      </Card>

      <Card className="space-y-2 p-5">
        <p className="text-sm font-semibold">{t("payouts.bankDetails")}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">{t("payouts.bankName")}</dt>
          <dd>{detail.bank_name ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("payouts.bankCode")}</dt>
          <dd>{detail.bank_code ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("payouts.branchName")}</dt>
          <dd>{detail.branch_name ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("payouts.accountNumber")}</dt>
          <dd className="font-mono">{detail.bank_account_number ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("payouts.accountHolder")}</dt>
          <dd>{detail.bank_account_holder ?? "—"}</dd>
        </dl>
      </Card>

      {(forward.length > 0 || corrections.length > 0) && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">{t("payouts.actions")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("payouts.reasonPlaceholder")}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {forward.map((s) => (
              <Button
                key={s}
                type="button"
                disabled={busy !== null}
                onClick={() => void transition(s, false)}
                className="gap-2"
              >
                {busy === s && <Loader2 size={14} className="animate-spin" />}
                {t(`payouts.action.${s}`)}
              </Button>
            ))}
            {corrections.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void transition(s, true)}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {busy === s && <Loader2 size={14} className="animate-spin" />}
                {t(`payouts.action.${s}`)}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("payouts.history")}
        </h2>
        {detail.history.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("payouts.noHistory")}</Card>
        ) : (
          detail.history.map((e, i) => (
            <Card key={i} className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {e.from_status ? `${e.from_status} → ${e.to_status}` : e.to_status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatStamp(e.created_at, locale)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {e.actor_name ?? t("payouts.systemActor")}
              </p>
              {e.reason_note && <p className="text-sm">{e.reason_note}</p>}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
