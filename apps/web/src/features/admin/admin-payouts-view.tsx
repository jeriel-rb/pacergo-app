"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Ban, CircleCheck, Clock, FileText, ListFilter, Undo2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { PayoutDetail, PayoutList, PayoutListRow, PayoutStatus } from "@/lib/admin";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/atoms/action-menu";
import { StatusBadge, type StatusTone } from "@/shared/components/atoms/status-badge";
import { TablePagination } from "@/shared/components/atoms/table-pagination";
import { FilterSelect, TableSearch, TableToolbar } from "@/shared/components/atoms/table-toolbar";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { MessageRow, TableFrame, ntd } from "./dashboard/dashboard-parts";
import { fetchPayoutDetail } from "./admin-actions";
import { PayoutActionDialog, type PendingPayoutAction } from "./payout-action-dialog";
import { PayoutSheet } from "./payout-sheet";
import { PAYOUT_TRANSITIONS } from "./payout-actions";

const FILTERS: (PayoutStatus | "all")[] = [
  "all",
  "requested",
  "processing",
  "paid",
  "rejected",
  "cancelled",
];

const STATUS_TONE: Record<PayoutStatus, StatusTone> = {
  requested: "warning",
  processing: "warning",
  paid: "success",
  rejected: "danger",
  cancelled: "danger",
};

const ACTION_ICON: Record<PayoutStatus, React.ReactNode> = {
  processing: <Clock />,
  paid: <CircleCheck />,
  rejected: <X />,
  cancelled: <Ban />,
  requested: <Undo2 />,
};

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

/** B-7: admin payout list as a table (same toolbar, table and pagination as the
 *  other admin lists), with the requested / processing totals above it. The
 *  status filter is server-side (`?status=`); search and paging are client-side.
 *  Bank account is masked here — full details only render in the B-8 detail view. */
export function AdminPayoutsView({
  initial,
  initialFilter,
}: {
  initial: PayoutList;
  initialFilter: PayoutStatus | "all";
}) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const routeLocale = getCurrentLocale(usePathname());
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pending, setPending] = useState<PendingPayoutAction | null>(null);

  // Payout details are fetched when a row is opened and kept, so reopening is
  // instant; a status change reloads the one that is open.
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PayoutDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  const loadDetail = useCallback(
    async (id: string, force = false) => {
      if (inFlight.current.has(id)) return;
      if (!force && details[id]) return;
      inFlight.current.add(id);
      setLoadingId(id);
      setFailedId(null);
      try {
        const detail = await fetchPayoutDetail(id);
        setDetails((prev) => ({ ...prev, [id]: detail }));
      } catch {
        setFailedId(id);
      } finally {
        inFlight.current.delete(id);
        setLoadingId((cur) => (cur === id ? null : cur));
      }
    },
    [details],
  );

  function openSheet(id: string) {
    setOpenId(id);
    void loadDetail(id);
  }

  const { totals } = initial;

  const matching = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initial.rows;
    return initial.rows.filter((r) => r.trainer_name.toLowerCase().includes(q));
  }, [initial.rows, search]);

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = matching.slice(current * pageSize, (current + 1) * pageSize);

  /** The "⋯" menu for one payout: every status change valid from its current
   *  status (forward steps first, then corrections). A paid transfer is finished,
   *  so its menu only opens the detail sheet. */
  function menuItems(r: PayoutListRow): ActionMenuItem[] {
    if (r.status === "paid") {
      return [
        {
          key: "detail",
          label: t("payouts.seeDetails"),
          icon: <FileText />,
          onSelect: () => openSheet(r.id),
        },
      ];
    }
    const { forward, corrections } = PAYOUT_TRANSITIONS[r.status];
    const summary = `${r.trainer_name} · ${ntd(r.amount)}`;
    return [...forward, ...corrections].map((to) => ({
      key: to,
      label: t(`payouts.action.${to}`),
      icon: ACTION_ICON[to],
      destructive: to === "rejected" || to === "cancelled",
      onSelect: () => setPending({ id: r.id, from: r.status, to, summary }),
    }));
  }

  function changeFilter(next: PayoutStatus | "all") {
    router.push(
      getLocalizedPath(next === "all" ? "/admin/payouts" : `/admin/payouts?status=${next}`, routeLocale),
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("payouts.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("payouts.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalCard
          label={t("payouts.totals.requested")}
          count={`${totals.requested_count} ${t("payouts.count")}`}
          sum={totals.requested_sum}
        />
        <TotalCard
          label={t("payouts.totals.processing")}
          count={`${totals.processing_count} ${t("payouts.count")}`}
          sum={totals.processing_sum}
        />
        {totals.paid_sum !== undefined && (
          <TotalCard
            label={t("payouts.totals.paid")}
            count={`${totals.paid_count ?? 0} ${t("payouts.count")}`}
            sum={totals.paid_sum}
          />
        )}
      </div>

      <TableToolbar>
        <TableSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t("payouts.searchPlaceholder")}
          clearLabel={t("clearSearch")}
        />
        <FilterSelect
          value={initialFilter}
          onValueChange={(v) => changeFilter(v as PayoutStatus | "all")}
          options={FILTERS.map((f) => ({ value: f, label: t(`payouts.filter.${f}`) }))}
          label={t("payouts.statusFilter")}
          icon={ListFilter}
        />
      </TableToolbar>

      <TableFrame className="bg-card">
        <Table className="min-w-[760px] whitespace-nowrap">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("payouts.columns.trainer")}</TableHead>
              <TableHead>{t("payouts.columns.amount")}</TableHead>
              <TableHead>{t("payouts.columns.bank")}</TableHead>
              <TableHead>{t("payouts.columns.status")}</TableHead>
              <TableHead>{t("payouts.columns.requested")}</TableHead>
              <TableHead>{t("payouts.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <MessageRow colSpan={6}>
                {search.trim() ? t("payouts.noMatches") : t("payouts.empty")}
              </MessageRow>
            ) : (
              visible.map((r) => (
                <TableRow
                  key={r.id}
                  tabIndex={0}
                  onClick={() => openSheet(r.id)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      openSheet(r.id);
                    }
                  }}
                  className="cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none"
                >
                  <TableCell className="max-w-[220px] truncate font-medium">
                    {r.trainer_name}
                  </TableCell>
                  <TableCell className="font-semibold">{ntd(r.amount)}</TableCell>
                  <TableCell>
                    {/* Same look as the account number in the sheet: monospace, so the
                        server's asterisk mask lines up evenly. */}
                    <span className="font-mono tracking-wide">{r.bank_account_mask ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <PayoutStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatStamp(r.requested_at, locale)}
                  </TableCell>
                  <TableCell>
                    <ActionMenu label={t("payouts.menu")} items={menuItems(r)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableFrame>

      <TablePagination
        page={current}
        pageCount={pageCount}
        total={matching.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(0);
        }}
      />

      <PayoutSheet
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        row={initial.rows.find((r) => r.id === openId) ?? null}
        detail={openId ? (details[openId] ?? null) : null}
        loading={loadingId === openId}
        error={failedId === openId}
        onRetry={() => openId && void loadDetail(openId, true)}
      />

      <PayoutActionDialog
        state={pending}
        onClose={() => setPending(null)}
        onDone={(id) => {
          if (details[id] || openId === id) void loadDetail(id, true);
        }}
      />
    </div>
  );
}

/** One of the two header totals (white card like the table, larger type). */
function TotalCard({ label, count, sum }: { label: string; count: string; sum: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{ntd(sum)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{count}</p>
    </Card>
  );
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const { t } = useTranslation("admin");
  return <StatusBadge tone={STATUS_TONE[status]}>{t(`payouts.status.${status}`)}</StatusBadge>;
}
