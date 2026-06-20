import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five-star rating with optional numeric value and review count. */
export function RatingStars({
  value,
  count,
  size = 14,
  showValue = true,
  tone = "default",
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  /** "onDark" renders white text for use on the gradient header. */
  tone?: "default" | "onDark";
  className?: string;
}) {
  const full = Math.round(value);
  const onDark = tone === "onDark";
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <span className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={
              i < full
                ? "fill-amber-400 text-amber-400"
                : onDark
                  ? "fill-white/25 text-white/25"
                  : "fill-muted text-muted"
            }
          />
        ))}
      </span>
      {showValue && (
        <span
          className={cn(
            "text-sm font-semibold",
            onDark ? "text-white" : "text-foreground",
          )}
        >
          {value.toFixed(1)}
        </span>
      )}
      {count != null && (
        <span
          className={cn(
            "text-xs",
            onDark ? "text-white/75" : "text-muted-foreground",
          )}
        >
          ({count})
        </span>
      )}
    </div>
  );
}
