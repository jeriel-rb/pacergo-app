import { TIER_LABELS, TIER_INTENT, type Tier } from "@pacergo/shared";
import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

const INTENT_STYLE: Record<
  "primary" | "dark" | "soft",
  { background: string; color: string }
> = {
  primary: { background: "var(--tier-primary-bg)", color: "var(--tier-primary-fg)" },
  dark: { background: "var(--tier-dark-bg)", color: "var(--tier-dark-fg)" },
  soft: { background: "var(--tier-soft-bg)", color: "var(--tier-soft-fg)" },
};

/**
 * Tier badge. `tier` drives both label (TIER_LABELS) and color (TIER_INTENT)
 * from the shared package; `showGrade` prepends the grade letter (e.g. "C 陽光搭子").
 */
export function TierBadge({
  tier,
  locale = "zh",
  showGrade = false,
  className,
}: {
  tier: Tier;
  locale?: Locale;
  showGrade?: boolean;
  className?: string;
}) {
  const style = INTENT_STYLE[TIER_INTENT[tier]];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        className,
      )}
      style={style}
    >
      {showGrade && <span className="opacity-90">{tier}</span>}
      {TIER_LABELS[tier][locale]}
    </span>
  );
}
