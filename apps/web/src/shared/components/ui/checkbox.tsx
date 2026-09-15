"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal controlled checkbox, styled to match Switch/Input. A native
 *  `<input type="checkbox">` under the hood — no Radix primitive needed for
 *  something this simple (same call the codebase already made for Switch). */
export function Checkbox({
  checked,
  onChange,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-md border border-border bg-card transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Check
        size={14}
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto text-primary-foreground opacity-0 peer-checked:opacity-100"
      />
    </span>
  );
}
