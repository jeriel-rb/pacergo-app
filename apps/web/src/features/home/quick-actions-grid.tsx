import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  /** Tailwind classes for the tile (background + icon color), theme-aware via /10 opacity. */
  tint: string;
}

/** Four-up grid of tappable icon tiles (used for both home action rows). */
export function QuickActionsGrid({
  items,
  className,
}: {
  items: QuickAction[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={i}
            type="button"
            className="flex flex-col items-center gap-2"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl",
                item.tint,
              )}
            >
              <Icon size={22} />
            </span>
            <span className="text-center text-xs font-medium leading-tight text-foreground/80">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
