import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import { cn } from "@/lib/utils";

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  /** Soft tile classes (background + icon color), theme-aware via /10 opacity. */
  tint: string;
  /** Destination when the feature is live. Omitted (or `soon`) → disabled tile. */
  href?: string;
  /** Not built yet → rendered disabled with a "Soon" badge. */
  soon?: boolean;
}

/** Four-up grid of action tiles. Live actions link out; unbuilt ones are disabled. */
export function QuickActionsGrid({
  items,
  className,
}: {
  items: QuickAction[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:gap-3", className)}>
      {items.map((item) => (
        <QuickActionTile key={item.label} item={item} />
      ))}
    </div>
  );
}

function QuickActionTile({ item }: { item: QuickAction }) {
  const Icon = item.icon;
  const disabled = item.soon || !item.href;

  const tile = (
    <span
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl transition-transform",
        item.tint,
        disabled
          ? "opacity-50"
          : "group-hover:scale-105 group-hover:shadow-md group-active:scale-95",
      )}
    >
      <Icon size={22} />
    </span>
  );

  const label = (
    <span
      className={cn(
        "text-center text-xs font-medium leading-tight",
        disabled ? "text-foreground/45" : "text-foreground/80",
      )}
    >
      {item.label}
    </span>
  );

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="group relative flex flex-col items-center gap-2"
      >
        {tile}
        {label}
        {item.soon && <SoonBadge className="absolute -top-1.5 right-0" />}
      </button>
    );
  }

  return (
    <Link
      href={item.href!}
      className="group relative flex flex-col items-center gap-2"
    >
      {tile}
      {label}
    </Link>
  );
}
