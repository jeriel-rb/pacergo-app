"use client";

import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  FileText,
  Hash,
  History,
  Landmark,
  MapPin,
  User,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { PayoutDetail, PayoutListRow } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Accordion, type AccordionItem } from "@/shared/components/atoms/accordion";
import { useLocale } from "@/shared/hooks/use-locale";
import { PayoutStatusBadge } from "./admin-payouts-view";
import { ntd } from "./dashboard/dashboard-parts";
import { BankAccountRow, EmptyRow, InfoRow } from "./dashboard/user-sheet";

/** Read-only side sheet about one payout, styled like the user sheet: detail rows
 *  grouped into accordion sections (all open at first). The bank account number
 *  stays masked until an admin taps "Show" (decrypted on the server, trainer-bound).
 *  Status changes live in the payouts table's "⋯" menu. */
export function PayoutSheet({
  open,
  onOpenChange,
  row,
  detail,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The list row — gives the masked account number without another request. */
  row: PayoutListRow | null;
  detail: PayoutDetail | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();

  const dateTime = (iso: string | null | undefined) =>
    iso
      ? formatInAppTimeZone(iso, locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
  const text = (v: string | null | undefined) => (v ? v : "—");
  const f = (key: string) => t(`payouts.sheet.fields.${key}`);

  function sections(d: PayoutDetail): AccordionItem[] {
    return [
      {
        id: "payout",
        title: t("payouts.sheet.sections.payout"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={Wallet} label={t("payouts.amount")}>{ntd(d.amount)}</InfoRow>
            <InfoRow icon={Banknote} label={f("status")}>
              <PayoutStatusBadge status={d.status} />
            </InfoRow>
            <InfoRow icon={CalendarClock} label={f("requested")}>{dateTime(d.requested_at)}</InfoRow>
            <InfoRow icon={CalendarClock} label={f("updated")}>{dateTime(d.updated_at)}</InfoRow>
            <InfoRow icon={CalendarCheck} label={f("settled")}>{dateTime(d.settled_at)}</InfoRow>
            {d.reason_note && (
              <InfoRow icon={FileText} label={f("note")}>{d.reason_note}</InfoRow>
            )}
          </div>
        ),
      },
      {
        id: "bank",
        title: t("payouts.sheet.sections.bank"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={Hash} label={t("payouts.bankCode")}>{text(d.bank_code)}</InfoRow>
            <InfoRow icon={Landmark} label={t("payouts.bankName")}>{text(d.bank_name)}</InfoRow>
            <InfoRow icon={MapPin} label={t("payouts.branchName")}>{text(d.branch_name)}</InfoRow>
            <InfoRow icon={User} label={t("payouts.accountHolder")}>
              {text(d.bank_account_holder)}
            </InfoRow>
            <BankAccountRow
              userId={d.trainer_id}
              mask={row?.bank_account_mask ?? null}
              hasAccount={Boolean(row?.bank_account_mask)}
              label={t("payouts.accountNumber")}
            />
          </div>
        ),
      },
      {
        id: "history",
        title: t("payouts.history"),
        hint: d.history.length,
        children: (
          <div className="space-y-2">
            {d.history.length === 0 ? (
              <EmptyRow>{t("payouts.noHistory")}</EmptyRow>
            ) : (
              d.history.map((e, i) => (
                <InfoRow
                  key={i}
                  icon={History}
                  label={
                    e.from_status
                      ? `${t(`payouts.status.${e.from_status}`, { defaultValue: e.from_status })} → ${t(`payouts.status.${e.to_status}`, { defaultValue: e.to_status })}`
                      : t(`payouts.status.${e.to_status}`, { defaultValue: e.to_status })
                  }
                >
                  {[e.actor_name ?? t("payouts.systemActor"), dateTime(e.created_at), e.reason_note]
                    .filter(Boolean)
                    .join(" · ")}
                </InfoRow>
              ))
            )}
          </div>
        ),
      },
    ];
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The X is centred on the two-line header (24px padding + 48px of text). */}
      <SheetContent side="right" className="w-full sm:max-w-xl" closeClassName="right-6 top-[35px]">
        <SheetHeader className="gap-0 px-6 pb-2 pr-16 pt-6">
          <SheetTitle className="truncate leading-7">
            {detail ? detail.trainer_name : (row?.trainer_name ?? t("payouts.sheet.title"))}
          </SheetTitle>
          <SheetDescription className="truncate leading-5">
            {detail ? ntd(detail.amount) : "\u00a0"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && !detail ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error && !detail ? (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">{t("payouts.sheet.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {t("payouts.sheet.retry")}
              </Button>
            </div>
          ) : detail ? (
            // Keyed by payout so a different one starts with every section open
            // and the account number masked again.
            <Accordion key={detail.id} items={sections(detail)} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
