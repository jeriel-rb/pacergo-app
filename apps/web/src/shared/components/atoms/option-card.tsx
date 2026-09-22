"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** One selectable row used by onboarding-style question screens (goal,
 *  obstacle, use-case, gender). `multi` only changes the a11y role/visual
 *  indicator (checkbox vs radio) — selection state is always controlled by
 *  the caller via `selected`/`onSelect`. */
export function OptionCard({
  icon: Icon,
  badge,
  title,
  description,
  selected,
  multi = false,
  onSelect,
  className,
}: {
  icon?: LucideIcon;
  /** Small pill shown above the title (e.g. "Recommended", "AI Recommended"). */
  badge?: string;
  title: string;
  description?: string;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
  className?: string;
}) {
  // Two-line cards (with a description) align icon/indicator to the title's
  // line, top-down; single-line cards (obstacle/use-case) center everything
  // on the row so the icon, label and indicator sit on one visual line.
  const align = description ? "items-start" : "items-center";
  const edgeOffset = description ? "mt-0.5" : "";

  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        `flex w-full ${align} gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors`,
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-accent",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            edgeOffset,
            selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        {badge && (
          <span className="mb-1 inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
            {badge}
          </span>
        )}
        <span className="block text-sm font-semibold">{title}</span>
        {description && (
          <span className="mt-1 block text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2",
          edgeOffset,
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
