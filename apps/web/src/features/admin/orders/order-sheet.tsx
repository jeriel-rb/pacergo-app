"use client";

import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminOrderDetail } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { StatusBadge } from "@/shared/components/atoms/status-badge";
import { useLocale } from "@/shared/hooks/use-locale";
import { MessageRow, TableFrame, ntd } from "../dashboard/dashboard-parts";
import { orderBadge } from "./order-actions";

/** Read-only side sheet with everything about one order: amounts and fees,
 *  settlement, hold and service state, and the ledger history as a table.
 *  (Ledger actions live in the orders table's "⋯" menu.) */
export function OrderSheet({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AdminOrderDetail | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const fields: [string, React.ReactNode][] = detail
    ? [
        [t("orders.fields.provider"), t(`orders.provider.${detail.provider}`, { defaultValue: detail.provider })],
        [t("orders.fields.fee"), ntd(detail.platform_fee_amount)],
        [t("orders.fields.processing"), detail.processing_fee_amount == null ? "—" : ntd(detail.processing_fee_amount)],
        [t("orders.fields.payable"), detail.trainer_payable == null ? "—" : ntd(detail.trainer_payable)],
        [
          t("orders.fields.settlement"),
          `${t(`orders.settlement.${detail.settlement_eligibility_status}`, {
            defaultValue: detail.settlement_eligibility_status,
          })} · ${t(`orders.settlementState.${detail.settlement_status}`)}`,
        ],
        [
          t("orders.fields.service"),
          detail.service_completed_at ? stamp(detail.service_completed_at) : t("orders.serviceOpen"),
        ],
        [t("orders.fields.hold"), detail.admin_hold ? t("orders.holdOn") : t("orders.holdOff")],
        [t("orders.fields.created"), stamp(detail.created_at)],
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The X is centred on the two-line header (24px padding + 48px of text). */}
      <SheetContent side="right" className="w-full sm:max-w-2xl" closeClassName="right-6 top-[35px]">
        <SheetHeader className="gap-0 px-6 pb-2 pr-16 pt-6">
          <SheetTitle className="truncate leading-7">
            {detail
              ? `${detail.seeker_name ?? t("orders.unknown")} → ${detail.companion_name ?? t("orders.unknown")}`
              : t("orders.sheet.title")}
          </SheetTitle>
          <SheetDescription className="truncate leading-5">
            {detail ? detail.merchant_order_no : "\u00a0"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {loading && !detail ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error && !detail ? (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">{t("orders.sheet.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {t("orders.sheet.retry")}
              </Button>
            </div>
          ) : detail ? (
            <>
              <section className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{t("orders.amount")}</p>
                <p className="text-3xl font-bold tracking-tight">{ntd(detail.amount)}</p>
                <div>
                  <StatusBadge tone={orderBadge(detail).tone}>
                    {t(orderBadge(detail).labelKey, { defaultValue: detail.status })}
                  </StatusBadge>
                </div>
              </section>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {detail.admin_hold_reason && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {detail.admin_hold_reason}
                </p>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("orders.history")}</h3>
                <TableFrame>
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t("orders.historyColumns.event")}</TableHead>
                        <TableHead>{t("orders.historyColumns.by")}</TableHead>
                        <TableHead>{t("orders.historyColumns.when")}</TableHead>
                        <TableHead>{t("orders.historyColumns.note")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.history.length === 0 ? (
                        <MessageRow colSpan={4}>{t("orders.noHistory")}</MessageRow>
                      ) : (
                        detail.history.map((event, i) => (
                          <TableRow key={i}>
                            <TableCell className="min-w-[200px] font-medium">
                              {t(`orders.events.${event.event_type}`, { defaultValue: event.event_type })}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {event.actor_name ?? t("orders.systemActor")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {stamp(event.created_at)}
                            </TableCell>
                            <TableCell className="min-w-[160px] text-muted-foreground">
                              {event.reason_note ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableFrame>
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
