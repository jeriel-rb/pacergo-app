import { cn } from "@/lib/utils";

/**
 * PacerGo wordmark. The mark is a minimal "pace node" — a route dot with a
 * forward tick — rendered in the brand blue. Inherits text color otherwise.
 */
export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn("size-[1.05em] text-brand", markClassName)}
      >
        <path d="M3 12h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-semibold tracking-[-0.03em]">PacerGo</span>
    </span>
  );
}
