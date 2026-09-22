"use client";

import { cn } from "@/lib/utils";

/** Rounded toggle chip used by search/filter rows (gym-type presets, equipment
 *  and muscle filters). Never shrinks or wraps its label, so a row of them
 *  scrolls horizontally instead of squashing. */
export function FilterPill({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
