"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseArt } from "./exercise-art";

/** Bordered container for a group of ListOptionRow items — flat rows
 *  divided by hairlines, no per-row card/tint (unlike OptionCard). Used for
 *  grouped pickers with thumbnails (equipment, cardio type). */
export function ListOptionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** One row inside a ListOptionGroup: optional thumbnail image or icon,
 *  title/description, trailing checkbox/radio indicator. Selecting a row
 *  never changes the row's own background — only the indicator toggles. */
export function ListOptionRow({
  icon: Icon,
  art,
  title,
  description,
  selected,
  multi = false,
  onSelect,
}: {
  icon?: LucideIcon;
  /** Art slug (see `exercise-art.ts`), shown as a still first frame on a muted tile. */
  art?: string;
  title: string;
  description?: string;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent"
    >
      {art ? (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
          <ExerciseArt slug={art} className="h-full w-full" />
        </span>
      ) : (
        Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon size={20} aria-hidden />
          </span>
        )
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {description && (
          <span className="block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-primary bg-primary" : "border-border bg-transparent",
        )}
        aria-hidden
      >
        {selected && <Check size={13} className="text-primary-foreground" strokeWidth={3} />}
      </span>
    </button>
  );
}
