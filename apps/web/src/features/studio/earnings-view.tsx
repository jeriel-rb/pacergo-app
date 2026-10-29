"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { EarningsData, TrainerOrder, WithdrawalStatus } from "@/lib/earnings";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { useLocale } from "@/shared/hooks/use-locale";
import { useToast } from "@/shared/components/ui/toast";
import { cn } from "@/lib/utils";
import { requestWithdrawal } from "./earnings-actions";
import { BankAccountForm } from "./bank-account-form";

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

const HOLD_MS = 24 * 60 * 60 * 1000;
const HOW_STEPS = ["1", "2", "3", "4"] as const;

/** When this order is, or is expected to be, eligible for payout (B-6): the
 *  recorded end of the 24 h hold, else service completion + 24 h, else the
 *  booked session end + 24 h. Null when the session has no time yet. */
export function expectedEligibleAt(o: TrainerOrder): Date | null {
  if (o.settlement_hold_until) return new Date(o.settlement_hold_until);
  if (o.service_completed_at) {
    return new Date(new Date(o.service_completed_at).getTime() + HOLD_MS);
  }
  if (o.scheduled_start) {
    const end = new Date(o.scheduled_start).getTime() + (o.duration_min ?? 60) * 60_000;
    return new Date(end + HOLD_MS);
  }
  return null;
}

/** Paid, not yet eligible, and nothing blocking it: money still inside the hold. */
function isInHold(o: TrainerOrder): boolean {
  return (
    o.payment_status === "paid" &&
    o.settlement_status === "unsettled" &&
    o.settlement_eligibility_status === "ineligible" &&
    o.refund_status === "none" &&
    !o.admin_hold
  );
}

/** B-4: trainer's own orders, available balance, and withdrawal request flow. */
export function EarningsView({ data }: { data: EarningsData }) {
  const { t } = useTranslation("studio");
  const locale = useLocale();
  const router = useRouter();

  const now = Date.now();
  const inHold = data.orders.filter(isInHold);
  const pendingAmount = inHold.reduce((sum, o) => sum + (o.trainer_payable ?? 0), 0);
  const nextRelease =
    inHold
      .map(expectedEligibleAt)
      .filter((d): d is Date => d !== null && d.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("earnings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("earnings.subtitle")}</p>
      </header>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("earnings.balance")}
          </p>
          <p className="mt-1 text-3xl font-bold text-primary">
            {ntd(data.balance)}
          </p>
          {pendingAmount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("earnings.pending")}: {ntd(pendingAmount)}
              {nextRelease &&
                ` · ${t("earnings.pendingNext", { when: formatStamp(nextRelease.toISOString(), locale) })}`}
            </p>
          )}
        </div>
        <WithdrawDialog
          balance={data.balance}
          hasBank={Boolean(data.bank?.bank_account_mask)}
          onSuccess={() => router.refresh()}
        />
      </Card>

      <BankAccountForm bank={data.bank} />

      <Card className="space-y-2 p-5">
        <p className="text-sm font-semibold">{t("earnings.howTitle")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {HOW_STEPS.map((k) => (
            <li key={k}>{t(`earnings.how.${k}`)}</li>
          ))}
        </ol>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("earnings.ordersTitle")}
        </h2>
        {data.orders.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">
            {t("earnings.ordersEmpty")}
          </Card>
        ) : (
          data.orders.map((o) => (
            <Card key={o.payment_id} className="space-y-1.5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium">
                  {o.seeker_name ?? t("earnings.unknownSeeker")}
                </p>
                <span className="shrink-0 font-semibold">
                  {ntd(o.trainer_payable ?? 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {o.scheduled_start
                  ? formatStamp(o.scheduled_start, locale)
                  : "—"}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <EligibilityBadge
                  eligibility={o.settlement_eligibility_status}
                  settlement={o.settlement_status}
                />
                {o.refund_status !== "none" && (
                  <Tag tone="warn">{t(`earnings.refundStatus.${o.refund_status}`)}</Tag>
                )}
              </div>
              <PayoutTiming order={o} />
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("earnings.withdrawalsTitle")}
        </h2>
        {data.withdrawals.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">
            {t("earnings.withdrawalsEmpty")}
          </Card>
        ) : (
          data.withdrawals.map((w) => (
            <Card key={w.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{ntd(w.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatStamp(w.requested_at, locale)}
                </p>
              </div>
              <WithdrawalStatusBadge status={w.status} />
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function WithdrawDialog({
  balance,
  hasBank,
  onSuccess,
}: {
  balance: number;
  hasBank: boolean;
  onSuccess: () => void;
}) {
  const { t } = useTranslation("studio");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal(amount);
      setOpen(false);
      toast.show(t("toast.withdrawalRequested"), "success");
      onSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message.includes("bank_details_missing")
          ? t("earnings.bank.missing")
          : message.includes("insufficient_balance")
            ? t("earnings.insufficient")
            : t("earnings.error"),
      );
      toast.show(t("toast.withdrawalRequestFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setAmount(balance);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" disabled={balance <= 0 || !hasBank} className="gap-2">
          <Wallet size={16} />
          {t("earnings.requestWithdrawal")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("earnings.requestWithdrawal")}</DialogTitle>
          <DialogDescription>
            {t("earnings.withdrawDesc", { balance: ntd(balance) })}
          </DialogDescription>
        </DialogHeader>

        <input
          type="number"
          min={1}
          max={balance}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={submit}
          disabled={busy || amount <= 0 || amount > balance}
          className="w-full gap-2"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {t("earnings.confirmWithdrawal")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** One line saying when this order's money reaches the balance, and why not yet. */
function PayoutTiming({ order: o }: { order: TrainerOrder }) {
  const { t } = useTranslation("studio");
  const locale = useLocale();
  if (o.settlement_status === "paid" || o.refund_status !== "none") return null;

  let text: string;
  if (o.payment_status !== "paid") {
    text = t("earnings.timing.notPaid");
  } else if (o.admin_hold) {
    text = t("earnings.timing.adminHold");
  } else {
    const at = expectedEligibleAt(o);
    const when = at ? formatStamp(at.toISOString(), locale) : "";
    if (o.settlement_eligibility_status === "eligible") {
      text = t("earnings.timing.eligibleSince", { when });
    } else if (o.service_completed_at) {
      text = t("earnings.timing.holdUntil", { when });
    } else if (o.scheduled_start && at) {
      const end = new Date(
        new Date(o.scheduled_start).getTime() + (o.duration_min ?? 60) * 60_000,
      );
      text = t("earnings.timing.expected", {
        end: formatStamp(end.toISOString(), locale),
        when,
      });
    } else {
      text = t("earnings.timing.noTime");
    }
  }
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function EligibilityBadge({
  eligibility,
  settlement,
}: {
  eligibility: "eligible" | "ineligible";
  settlement: "unsettled" | "paid";
}) {
  const { t } = useTranslation("studio");
  if (settlement === "paid") return <Tag tone="ok">{t("earnings.settled")}</Tag>;
  if (eligibility === "eligible") return <Tag tone="ok">{t("earnings.eligible")}</Tag>;
  return <Tag tone="neutral">{t("earnings.pendingHold")}</Tag>;
}

function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  const { t } = useTranslation("studio");
  const tone =
    status === "paid"
      ? "ok"
      : status === "rejected" || status === "cancelled"
        ? "warn"
        : "neutral";
  return <Tag tone={tone}>{t(`earnings.withdrawalStatus.${status}`)}</Tag>;
}

function Tag({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "neutral";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>
      {children}
    </span>
  );
}
