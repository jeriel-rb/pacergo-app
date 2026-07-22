"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: React.ReactNode;
  error?: React.ReactNode;
  toggleLabel: string;
  showLabel: string;
  hideLabel: string;
};

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(
  (
    {
      id,
      label,
      error,
      className,
      toggleLabel,
      showLabel,
      hideLabel,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const errorId = error ? `${inputId}-error` : undefined;
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={errorId}
            className={cn(
              "flex h-11 w-full rounded-md border border-border bg-card px-3.5 pr-11 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            title={toggleLabel}
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
PasswordField.displayName = "PasswordField";
