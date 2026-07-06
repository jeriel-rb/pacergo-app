import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Optional label rendered above the select, with a consistent gap. */
  label?: React.ReactNode;
  /** Muted helper text below the select. */
  hint?: React.ReactNode;
  /** Error message below the select (overrides hint styling). */
  error?: React.ReactNode;
}

/** Native select styled to match `Input` (label/hint/error included). */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, ...props }, ref) => {
    const reactId = React.useId();
    const selectId = id ?? (label ? reactId : undefined);

    const select = (
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-border bg-card px-3.5 pr-9 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    );

    if (!label && !hint && !error) return select;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium">
            {label}
          </label>
        )}
        {select}
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";
