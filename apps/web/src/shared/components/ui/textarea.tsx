import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Optional label rendered above the textarea, with a consistent gap. */
  label?: React.ReactNode;
  /** Muted helper text below the textarea. */
  hint?: React.ReactNode;
  /** Error message below the textarea (overrides hint styling). */
  error?: React.ReactNode;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const reactId = React.useId();
    const textareaId = id ?? (label ? reactId : undefined);

    const textarea = (
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "flex min-h-[88px] w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );

    if (!label && !hint && !error) return textarea;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium">
            {label}
          </label>
        )}
        {textarea}
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
