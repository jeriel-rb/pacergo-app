"use client";

import type { LucideIcon } from "lucide-react";
import { SearchInput } from "@/shared/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";

/** The row above every admin data table: a search box and a filter dropdown,
 *  stacked on phones and side by side from `sm`. Both controls have a fixed,
 *  compact width (they don't stretch to the table), so every table's toolbar
 *  looks the same — change the widths here, once. */
export function TableToolbar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>{children}</div>;
}

/** Search box for a table toolbar. */
export function TableSearch({
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={placeholder}
      clearLabel={clearLabel}
      className="w-full sm:w-80"
    />
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

/** Filter dropdown for a table toolbar: icon and current choice together on the
 *  left, chevron at the far right. */
export function FilterSelect({
  value,
  onValueChange,
  options,
  label,
  icon: Icon,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  /** Accessible name of the dropdown. */
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className="w-full justify-start gap-1.5 px-3 sm:w-48 [&>svg:last-child]:ml-auto"
      >
        <Icon size={15} className="shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
