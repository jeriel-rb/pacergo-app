"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
  clearLabel: string;
  className?: string;
}

/** Icon + clearable text input for filtering a list, in-page (no navigation). */
export function SearchInput({
  value,
  onChange,
  placeholder,
  clearLabel,
  className,
  ...aria
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={18}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={aria["aria-label"]}
        className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
