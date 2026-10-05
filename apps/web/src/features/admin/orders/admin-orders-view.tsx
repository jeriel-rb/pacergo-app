"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Ban,
  CircleCheck,
  CircleDollarSign,
  ListFilter,
  Lock,
  LockOpen,
  Undo2,
  Undo,
} from "lucide-react";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminOrderDetail, AdminOrderRow, OrderFilter } from "@/lib/admin";
import { FilterSelect, TableSearch, TableToolbar } from "@/shared/components/atoms/table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/atoms/action-menu";
import { StatusBadge } from "@/shared/components/atoms/status-badge";
import { TablePagination } from "@/shared/components/atoms/table-pagination";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { fetchOrderDetail } from "../admin-actions";
import { MessageRow, TableFrame, ntd } from "../dashboard/dashboard-parts";
import { OrderActionDialog, type PendingOrderAction } from "./order-action-dialog";
import {
  actionLabelKey,
  availableActions,
  orderBadge,
  type OrderAction,
} from "./order-actions";
import { OrderSheet } from "./order-sheet";

const FILTERS: (OrderFilter | "all")[] = [
  "all",
  "paid",
  "pending",
  "refund_requested",
  "on_hold",
  "failed",
  "cancelled",
];

const ACTION_ICON: Record<OrderAction, React.ReactNode> = {
  refund_requested: <Undo2 />,
  refunded: <CircleDollarSign />,
  hold: <Lock />,
  release: <LockOpen />,
  complete: <CircleCheck />,
  revert: <Undo />,
  cancel: <Ban />,
};

/** Orders as a table. Clicking a row opens its details (with the ledger history)
 *  in a side sheet; the "⋯" menu on each row records refunds, holds and service
 *  completion on the ledger. */
export function AdminOrdersView({
  rows,
  filter,
}: {
  rows: AdminOrderRow[];
  filter: OrderFilter | "all";
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const router = useRouter();
  const routeLocale = getCurrentLocale(usePathname());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingOrderAction | null>(null);

  // Order details (and their history) are fetched on demand and kept, so the
  // sheet and the row menus share them.
  const [details, setDetails] = useState<Record<string, AdminOrderDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  const loadDetail = useCallback(async (id: string, force = false) => {
    if (inFlight.current.has(id)) return;
    if (!force && details[id]) return;
    inFlight.current.add(id);
    setLoadingId(id);
    setFailedId(null);
    try {
      const detail = await fetchOrderDetail(id);
      setDetails((prev) => ({ ...prev, [id]: detail }));
    } catch {
      setFailedId(id);
    } finally {
      inFlight.current.delete(id);
      setLoadingId((cur) => (cur === id ? null : cur));
    }
  }, [details]);

  // A new filter means a new list: start from the first page.
  useEffect(() => setPage(0), [filter]);

  // Search matches either person on the order (member or trainer), ignoring case.
  const matching = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.seeker_name ?? "").toLowerCase().includes(q) ||
        (r.companion_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => matching.slice(current * pageSize, (current + 1) * pageSize),
    [matching, current, pageSize],
  );

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const people = (row: Pick<AdminOrderRow, "seeker_name" | "companion_name">) =>
    `${row.seeker_name ?? t("orders.unknown")} → ${row.companion_name ?? t("orders.unknown")}`;

  /** The "⋯" menu items for one order. */
  function menuItems(row: AdminOrderRow): ActionMenuItem[] {
    const detail = details[row.id];
    return availableActions(row, detail ? detail.service_completed_at !== null : null).map(
      (action) => ({
        key: action,
        label: t(actionLabelKey(action)),
        icon: ACTION_ICON[action],
        destructive: action === "cancel",
        onSelect: () =>
          setPending({ orderId: row.id, action, summary: `${people(row)} · ${ntd(row.amount)}` }),
      }),
    );
  }

  function rowMenu(row: AdminOrderRow) {
    return (
      <ActionMenu
        label={t("orders.menu")}
        items={menuItems(row)}
        onOpenChange={(open) => open && void loadDetail(row.id)}
      />
    );
  }

  function changeFilter(next: OrderFilter | "all") {
    router.push(
      getLocalizedPath(next === "all" ? "/admin/orders" : `/admin/orders?status=${next}`, routeLocale),
    );
  }

  function afterAction(id: string) {
    router.refresh();
    if (details[id] || openId === id) void loadDetail(id, true);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("orders.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("orders.subtitle")}</p>
      </header>

      <TableToolbar>
        <TableSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t("orders.searchPlaceholder")}
          clearLabel={t("clearSearch")}
        />
        <FilterSelect
          value={filter}
          onValueChange={(v) => changeFilter(v as OrderFilter | "all")}
          options={FILTERS.map((f) => ({ value: f, label: t(`orders.filter.${f}`) }))}
          label={t("orders.statusFilter")}
          icon={ListFilter}
        />
      </TableToolbar>

      <TableFrame className="bg-card">
        <Table className="min-w-[820px] whitespace-nowrap">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("orders.columns.order")}</TableHead>
              <TableHead>{t("orders.columns.amount")}</TableHead>
              <TableHead>{t("orders.columns.status")}</TableHead>
              <TableHead>{t("orders.columns.provider")}</TableHead>
              <TableHead>{t("orders.columns.created")}</TableHead>
              <TableHead>{t("orders.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <MessageRow colSpan={6}>
                {search.trim() ? t("orders.noMatches") : t("orders.empty")}
              </MessageRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={0}
                  onClick={() => {
                    setOpenId(row.id);
                    void loadDetail(row.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setOpenId(row.id);
                      void loadDetail(row.id);
                    }
                  }}
                  className="cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none"
                >
                  <TableCell className="font-medium">{people(row)}</TableCell>
                  <TableCell className="font-semibold">{ntd(row.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={orderBadge(row).tone}>
                      {t(orderBadge(row).labelKey, { defaultValue: row.status })}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t(`orders.provider.${row.provider}`, { defaultValue: row.provider })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {stamp(row.created_at)}
                  </TableCell>
                  <TableCell>{rowMenu(row)}</TableCell>
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

      <OrderSheet
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        detail={openId ? (details[openId] ?? null) : null}
        loading={loadingId === openId}
        error={failedId === openId}
        onRetry={() => openId && void loadDetail(openId, true)}
      />

      <OrderActionDialog state={pending} onClose={() => setPending(null)} onDone={afterAction} />
    </div>
  );
}
