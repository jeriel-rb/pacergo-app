import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

// One light/dark recipe per tone: tinted fill, matching border and text.
const TONE: Record<StatusTone, string> = {
  success:
    "border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning:
    "border-amber-500/40 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200",
  danger:
    "border-red-500/35 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200",
  info: "border-blue-500/35 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200",
  muted: "border-border bg-muted text-muted-foreground",
};

const DOT: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  muted: "bg-muted-foreground",
};

/** Pill with a status dot, used for roles, request and payout states. */
export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} aria-hidden />}
      {children}
    </span>
  );
}
