"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminOrderRow, OrderFilter } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const FILTERS: (OrderFilter | "all")[] = [
  "all",
  "paid",
  "pending",
  "refund_requested",
  "on_hold",
  "failed",
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

/** Simulated-ledger orders. Refunds, holds, and service completion live on the detail page. */
export function AdminOrdersView({
  rows,
  filter,
}: {
  rows: AdminOrderRow[];
  filter: OrderFilter | "all";
}) {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const routeLocale = getCurrentLocale(pathname);
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("orders.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("orders.subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = getLocalizedPath(
            f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`,
            routeLocale,
          );
          return (
            <Link
              key={f}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-accent",
              )}
            >
              {t(`orders.filter.${f}`)}
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        {rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("orders.empty")}</Card>
        ) : (
          rows.map((row) => (
            <Link key={row.id} href={getLocalizedPath(`/admin/orders/${row.id}`, routeLocale)}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {row.seeker_name ?? t("orders.unknown")} → {row.companion_name ?? t("orders.unknown")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`orders.provider.${row.provider}`, { defaultValue: row.provider })}
                    {" · "}
                    {formatStamp(row.created_at, locale)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{ntd(row.amount)}</span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {row.refund_status !== "none"
                    ? t(`orders.refund.${row.refund_status}`)
                    : row.admin_hold
                      ? t("orders.filter.on_hold")
                      : t(`orders.status.${row.status}`, { defaultValue: row.status })}
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
