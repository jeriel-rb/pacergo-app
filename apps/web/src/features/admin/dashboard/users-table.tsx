"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminUser, AdminUserDetail, AdminUserRole, AdminUsersPage } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import { FilterSelect, TableSearch, TableToolbar } from "@/shared/components/atoms/table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { StatusBadge } from "@/shared/components/atoms/status-badge";
import { TablePagination } from "@/shared/components/atoms/table-pagination";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import { MEMBERS_PAGE_SIZE, fetchUserDetail, fetchUsersPage, setUserAdmin } from "../admin-actions";
import { MessageRow, SkeletonRows, TableFrame } from "./dashboard-parts";
import { UserSheet } from "./user-sheet";

/** Every body row has the same height, so the table is the same size on every
 *  page — a short last page is padded with empty rows rather than shrinking. */
const ROW_HEIGHT = 61;
const ROW = "h-[61px]";
/** Height of the header row, and the fewest / most rows a page may hold. */
const HEAD_HEIGHT = 41;
const MIN_ROWS = 3;
const MAX_ROWS = 30;
/** From this width the dashboard fills the screen, so the page size follows the
 *  space the card has; below it (phones, portrait tablets) the page just scrolls. */
const FIT_QUERY = "(min-width: 1024px)";

type RoleFilter = AdminUserRole | "all";
const ROLE_FILTERS: RoleFilter[] = ["all", "member", "trainer", "admin"];

/** Everyone on the platform: server-side search + role filter + paging, with a
 *  make / revoke admin action per row. */
export function UsersTable({ initial }: { initial: AdminUsersPage }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(MEMBERS_PAGE_SIZE);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  // A user's full details are fetched when their row is opened, and kept.
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminUserDetail>>({});
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
        const detail = await fetchUserDetail(id);
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

  function openUser(id: string) {
    setOpenId(id);
    void loadDetail(id);
  }

  const pageCount = Math.max(1, Math.ceil(data.total / pageSize));

  async function load(
    nextPage: number,
    nextSearch: string,
    nextRole: RoleFilter,
    size = pageSize,
  ) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsersPage(
        nextPage,
        nextSearch,
        nextRole === "all" ? undefined : nextRole,
        size,
      );
      if (id !== requestId.current) return; // a newer request already landed
      setData(result);
      setPage(nextPage);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  // The latest values, for the resize handler below (it outlives a render).
  const latest = useRef({ page, pageSize, search, role, load });
  latest.current = { page, pageSize, search, role, load };

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  // On screens where the dashboard fills the viewport, show exactly as many rows
  // as fit in the card — so the table reaches the card's bottom edge and the page
  // never needs to scroll. Everywhere else it's the default page size.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia(FIT_QUERY);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fit = () => {
      const rows = mq.matches
        ? Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor((el.clientHeight - HEAD_HEIGHT) / ROW_HEIGHT)))
        : MEMBERS_PAGE_SIZE;
      const cur = latest.current;
      if (rows === cur.pageSize) return;
      // Keep the first user on screen when the page size changes.
      const firstIndex = cur.page * cur.pageSize;
      setPageSize(rows);
      void cur.load(Math.floor(firstIndex / rows), cur.search, cur.role, rows);
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fit, 150);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    mq.addEventListener("change", schedule);
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
      mq.removeEventListener("change", schedule);
    };
  }, []);

  function onSearch(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(0, value, role), 300);
  }

  function onRole(value: RoleFilter) {
    setRole(value);
    load(0, search, value);
  }

  async function toggleAdmin(user: AdminUser) {
    setBusyId(user.id);
    try {
      const next = !user.is_admin;
      await setUserAdmin(user.id, next);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === user.id ? { ...u, is_admin: next } : u)),
      }));
      setDetails((prev) =>
        prev[user.id] ? { ...prev, [user.id]: { ...prev[user.id]!, is_admin: next } } : prev,
      );
      toast.show(
        t(next ? "toast.madeAdmin" : "toast.revokedAdmin", { name: user.display_name }),
        "success",
      );
    } catch {
      toast.show(t("toast.roleUpdateFailed"), "destructive");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TableToolbar>
        <TableSearch
          value={search}
          onChange={onSearch}
          placeholder={t("searchMembers")}
          clearLabel={t("clearSearch")}
        />
        <FilterSelect
          value={role}
          onValueChange={(v) => onRole(v as RoleFilter)}
          options={ROLE_FILTERS.map((r) => ({ value: r, label: t(`dashboard.users.role.${r}`) }))}
          label={t("dashboard.users.roleFilter")}
          icon={Users}
        />
      </TableToolbar>

      {/* On lg+ this area is as tall as the card has room for (the table inside is
          positioned over it, so the rows never decide the height). */}
      <div ref={areaRef} className="relative lg:min-h-[225px] lg:flex-1">
       <div className="lg:absolute lg:inset-0">
        <TableFrame className="lg:flex lg:h-full lg:flex-col">
        <Table
          containerClassName="lg:flex-1"
          className="min-w-[560px] whitespace-nowrap lg:h-full"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("dashboard.users.columns.user")}</TableHead>
              <TableHead>{t("dashboard.users.columns.role")}</TableHead>
              <TableHead>{t("dashboard.users.columns.joined")}</TableHead>
              <TableHead>{t("dashboard.users.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(loading && "opacity-60")}>
            {loading && data.users.length === 0 ? (
              <SkeletonRows columns={4} rows={pageSize} rowClassName={ROW} />
            ) : error ? (
              <MessageRow colSpan={4}>{error}</MessageRow>
            ) : data.users.length === 0 ? (
              <MessageRow colSpan={4}>
                {search || role !== "all" ? t("noSearchResults") : t("noMembers")}
              </MessageRow>
            ) : (
              data.users.map((u) => (
                <TableRow
                  key={u.id}
                  tabIndex={0}
                  onClick={() => openUser(u.id)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      openUser(u.id);
                    }
                  }}
                  className={cn(ROW, "cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none")}
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <InitialAvatar name={u.display_name} src={u.photo_url} size={32} />
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate font-medium sm:max-w-[240px]">
                          {u.display_name}
                        </p>
                        <p className="max-w-[180px] truncate text-xs text-muted-foreground sm:max-w-[240px]">
                          {u.email ?? "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadges user={u} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatInAppTimeZone(u.created_at, locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // the row opens the user sheet; this just toggles admin
                          void toggleAdmin(u);
                        }}
                        disabled={busyId === u.id}
                        aria-label={u.is_admin ? t("revokeAdmin") : t("makeAdmin")}
                        title={u.is_admin ? t("revokeAdmin") : t("makeAdmin")}
                        className={cn(
                          "h-8 gap-1.5 px-2.5",
                          u.is_admin &&
                            "text-destructive hover:bg-destructive/10 hover:text-destructive",
                        )}
                      >
                        {busyId === u.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : u.is_admin ? (
                          <ShieldOff size={15} />
                        ) : (
                          <ShieldCheck size={15} />
                        )}
                        <span>{u.is_admin ? t("revokeAdmin") : t("makeAdmin")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading &&
              !error &&
              data.users.length > 0 &&
              Array.from({ length: Math.max(0, pageSize - data.users.length) }).map(
                (_, i) => (
                  <TableRow key={`filler-${i}`} aria-hidden className={cn(ROW, "hover:bg-transparent")}>
                    <TableCell colSpan={4} />
                  </TableRow>
                ),
              )}
          </TableBody>
        </Table>
        </TableFrame>
       </div>
      </div>

      <TablePagination
        page={page}
        pageCount={pageCount}
        total={data.total}
        pageSize={pageSize}
        disabled={loading}
        onPageChange={(p) => load(p, search, role)}
      />

      <UserSheet
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        detail={openId ? (details[openId] ?? null) : null}
        loading={loadingId === openId}
        error={failedId === openId}
        onRetry={() => openId && void loadDetail(openId, true)}
      />
    </div>
  );
}

/** Admin / Trainer / Member pills for one user. */
function RoleBadges({ user, className }: { user: AdminUser; className?: string }) {
  const { t } = useTranslation("admin");
  return (
    <div className={cn("flex gap-1", className)}>
      {user.is_admin && <StatusBadge tone="info">{t("roleAdmin")}</StatusBadge>}
      {user.is_companion && <StatusBadge tone="success">{t("roleTrainer")}</StatusBadge>}
      {!user.is_admin && !user.is_companion && (
        <StatusBadge tone="muted" dot={false}>
          {t("roleMember")}
        </StatusBadge>
      )}
    </div>
  );
}
