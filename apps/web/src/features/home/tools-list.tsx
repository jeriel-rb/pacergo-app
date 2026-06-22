import type { LucideIcon } from "lucide-react";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import { cn } from "@/lib/utils";

export interface ToolItem {
  icon: LucideIcon;
  label: string;
  /** Soft icon-tile classes (background + icon color). */
  tint: string;
}

/** Vertical list of personal tools for the dashboard rail. All unbuilt → disabled. */
export function ToolsList({ items }: { items: ToolItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-50",
                  item.tint,
                )}
              >
                <Icon size={18} />
              </span>
              <span className="flex-1 truncate text-sm font-medium text-foreground/55">
                {item.label}
              </span>
              <SoonBadge />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
