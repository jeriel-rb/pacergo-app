"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import {
  ACTIVITY_META,
  formatInAppTimeZone,
  type ActivitySlug,
} from "@pacergo/shared";
import type { AdminVerification } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import { ListFilter } from "lucide-react";
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
import { StatusBadge, type StatusTone } from "@/shared/components/atoms/status-badge";
import { TablePagination } from "@/shared/components/atoms/table-pagination";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCertSignedUrl } from "./admin-actions";
import { MessageRow, TableFrame } from "./dashboard/dashboard-parts";
import { ReviewDialog, type Decision } from "./dashboard/trainer-requests-card";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
const FILTERS: StatusFilter[] = ["pending", "approved", "rejected", "all"];
const STATUS_TONE: Record<AdminVerification["status"], StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

/** Trainer requests: every certification / competition-proof request, filterable
 *  by state and searchable by name. Pending ones are approved or rejected here;
 *  decided ones stay listed so it is clear what was approved and what was rejected. */
export function AdminVerificationsView({ queue }: { queue: AdminVerification[] }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const toast = useToast();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [review, setReview] = useState<{ item: AdminVerification; decision: Decision } | null>(
    null,
  );
  const [docBusy, setDocBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue.filter(
      (v) =>
        (filter === "all" || v.status === filter) &&
        (!q ||
          v.display_name.toLowerCase().includes(q) ||
          (v.label ?? "").toLowerCase().includes(q)),
    );
  }, [queue, filter, search]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * pageSize, (current + 1) * pageSize);

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, { year: "numeric", month: "short", day: "numeric" });

  async function openDoc(v: AdminVerification) {
    setDocBusy(v.id);
    try {
      const url = await getCertSignedUrl(v.document_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.show(t("docError"), "destructive");
    } finally {
      setDocBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("verifications.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("verifications.subtitle")}</p>
      </header>

      <TableToolbar>
        <TableSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t("verifications.searchPlaceholder")}
          clearLabel={t("clearSearch")}
        />
        <FilterSelect
          value={filter}
          onValueChange={(v) => {
            setFilter(v as StatusFilter);
            setPage(0);
          }}
          options={FILTERS.map((f) => ({ value: f, label: t(`verifications.filter.${f}`) }))}
          label={t("verifications.statusFilter")}
          icon={ListFilter}
        />
      </TableToolbar>

      <TableFrame className="bg-card">
        <Table className="min-w-[760px] whitespace-nowrap">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("verifications.columns.trainer")}</TableHead>
              <TableHead>{t("verifications.columns.activity")}</TableHead>
              <TableHead>{t("verifications.columns.type")}</TableHead>
              <TableHead>{t("verifications.columns.status")}</TableHead>
              <TableHead>{t("verifications.columns.submitted")}</TableHead>
              <TableHead>{t("verifications.columns.reviewed")}</TableHead>
              <TableHead>{t("verifications.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <MessageRow colSpan={7}>
                {search
                  ? t("verifications.noMatches")
                  : filter === "pending"
                    ? t("empty")
                    : t("verifications.empty")}
              </MessageRow>
            ) : (
              visible.map((v) => {
                const activity = v.activity
                  ? (ACTIVITY_META[v.activity as ActivitySlug]?.[locale] ?? v.activity)
                  : "—";
                const isPending = v.status === "pending";
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <InitialAvatar name={v.display_name} src={v.photo_url} size={32} />
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-medium">{v.display_name}</p>
                          <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {v.label || t("noLabel")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{activity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(`docType.${v.doc_type}`, { defaultValue: v.doc_type })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[v.status]}>{t(v.status)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {stamp(v.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.reviewed_at ? stamp(v.reviewed_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (docBusy !== v.id) void openDoc(v);
                          }}
                          aria-busy={docBusy === v.id}
                          className="mr-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {t("verifications.viewPdf")}
                          {docBusy === v.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ArrowRight size={14} />
                          )}
                        </a>
                        {isPending && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setReview({ item: v, decision: "approved" })}
                              className="h-8 gap-1.5 px-2.5"
                            >
                              <Check size={15} />
                              {t("approve")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReview({ item: v, decision: "rejected" })}
                              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X size={15} />
                              {t("reject")}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableFrame>

      <TablePagination
        page={current}
        pageCount={pageCount}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(0);
        }}
      />

      <ReviewDialog state={review} onClose={() => setReview(null)} />
    </div>
  );
}
