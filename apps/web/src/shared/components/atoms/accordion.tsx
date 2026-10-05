"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: string;
  /** Small text next to the title (e.g. a count). */
  hint?: React.ReactNode;
  children: React.ReactNode;
}

/** Stack of collapsible sections, separated by thin dividers (no card around
 *  them). Several can be open at once, and **all start open** unless
 *  `defaultOpen` lists specific ones. Each header is a real button
 *  (`aria-expanded` / `aria-controls`), so it works with the keyboard and screen
 *  readers. */
export function Accordion({
  items,
  defaultOpen,
  className,
}: {
  items: AccordionItem[];
  /** Ids open at first. Omit to open every section. */
  defaultOpen?: string[];
  className?: string;
}) {
  const baseId = React.useId();
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(defaultOpen ?? items.map((i) => i.id)),
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <section key={item.id} className="py-4 first:pt-0 last:pb-0">
            <h3>
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-3 rounded-md text-left text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{item.title}</span>
                  {item.hint && (
                    <span className="text-xs font-normal text-muted-foreground">{item.hint}</span>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="pt-3"
            >
              {item.children}
            </div>
          </section>
        );
      })}
    </div>
  );
}
