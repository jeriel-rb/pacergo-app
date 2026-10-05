"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Red text, for destructive actions. */
  destructive?: boolean;
  disabled?: boolean;
}

/** A "⋯" button that opens a small menu of row actions (a dropdown). Built on the
 *  popover so it stacks correctly inside sheets and dialogs. Clicks on it never
 *  reach the table row behind it. */
export function ActionMenu({
  label,
  items,
  onOpenChange,
  className,
}: {
  /** Accessible name of the "⋯" button. */
  label: string;
  items: ActionMenuItem[];
  /** Fires when the menu opens or closes (e.g. to load data for the items). */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  function change(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <MoreHorizontal size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        role="menu"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="w-60 p-1"
      >
        {items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">—</p>
        ) : (
          items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                change(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
                item.destructive && "text-destructive hover:bg-destructive/10",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
