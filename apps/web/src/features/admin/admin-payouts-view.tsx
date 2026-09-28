"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { PayoutList, PayoutStatus } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const FILTERS: (PayoutStatus | "all")[] = [
  "all",
  "requested",
  "processing",
  "paid",
  "rejected",
  "cancelled",
];

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

/** B-7: admin payout list, filterable, with header totals. Bank account is
 *  masked here — full details only render in the B-8 detail view. */
export function AdminPayoutsView({
  initial,
  initialFilter,
}: {
  initial: PayoutList;
  initialFilter: PayoutStatus | "all";
}) {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const routeLocale = getCurrentLocale(pathname);
  const locale = useLocale();
  const [filter, setFilter] = useState(initialFilter);

  const { totals } = initial;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("payouts.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("payouts.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("payouts.totals.requested")}</p>
          <p className="mt-1 text-lg font-bold">
            {totals.requested_count} · {ntd(totals.requested_sum)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("payouts.totals.processing")}</p>
          <p className="mt-1 text-lg font-bold">
            {totals.processing_count} · {ntd(totals.processing_sum)}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = getLocalizedPath(
            f === "all" ? "/admin/payouts" : `/admin/payouts?status=${f}`,
            routeLocale,
          );
          return (
            <Link
              key={f}
              href={href}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-accent",
              )}
            >
              {t(`payouts.filter.${f}`)}
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        {initial.rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("payouts.empty")}</Card>
        ) : (
          initial.rows.map((r) => (
            <Link key={r.id} href={getLocalizedPath(`/admin/payouts/${r.id}`, routeLocale)}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.trainer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("payouts.bankMasked")}: {r.bank_account_mask ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatStamp(r.requested_at, locale)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{ntd(r.amount)}</span>
                <StatusBadge status={r.status} />
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

export function StatusBadge({ status }: { status: PayoutStatus }) {
  const { t } = useTranslation("admin");
  const cls =
    status === "paid"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "rejected" || status === "cancelled"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>
      {t(`payouts.status.${status}`)}
    </span>
  );
}
