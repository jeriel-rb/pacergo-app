import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label rendered above the input, with a consistent gap. */
  label?: React.ReactNode;
  /** Muted helper text below the input. */
  hint?: React.ReactNode;
  /** Error message below the input (overrides hint styling). */
  error?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      hint,
      error,
      id,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId();
    const inputId = id ?? (label ? reactId : undefined);
    const helpId = inputId && (error || hint) ? `${inputId}-help` : undefined;
    const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ");

    const input = (
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : ariaInvalid}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-card px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
    );

    if (!label && !hint && !error) return input;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        )}
        {input}
        {error ? (
          <p id={helpId} className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={helpId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
