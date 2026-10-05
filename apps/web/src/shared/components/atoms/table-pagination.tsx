"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const PAGE_SIZES = [10, 20, 30, 50];

/** Footer under a data table: total count, rows-per-page (optional), page x of y,
 *  and first / previous / next / last buttons. `page` is 0-based. */
export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Omit when the server fixes the page size. */
  onPageSizeChange?: (size: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const last = Math.max(pageCount, 1) - 1;
  const canPrev = page > 0 && !disabled;
  const canNext = page < last && !disabled;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-1", className)}>
      <p className="text-sm text-muted-foreground">{t("pagination.total", { count: total })}</p>
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="hidden text-sm font-medium md:block">{t("pagination.rowsPerPage")}</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(v) => onPageSizeChange(Number(v))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[72px]" aria-label={t("pagination.rowsPerPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={`${s}`}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="whitespace-nowrap text-sm font-medium">
          {t("pageOf", { page: page + 1, total: Math.max(pageCount, 1) })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 sm:inline-flex"
            onClick={() => onPageChange(0)}
            disabled={!canPrev}
            aria-label={t("pagination.first")}
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label={t("prevPage")}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label={t("nextPage")}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 sm:inline-flex"
            onClick={() => onPageChange(last)}
            disabled={!canNext}
            aria-label={t("pagination.last")}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
