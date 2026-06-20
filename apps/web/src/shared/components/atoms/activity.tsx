import { ACTIVITY_META, type ActivitySlug } from "@pacergo/shared";
import { ACTIVITY_ICONS } from "./icon-map";
import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

export function ActivityIcon({
  slug,
  size = 18,
  className,
}: {
  slug: ActivitySlug;
  size?: number;
  className?: string;
}) {
  const Icon = ACTIVITY_ICONS[ACTIVITY_META[slug].icon] ?? ACTIVITY_ICONS.circle;
  return <Icon width={size} height={size} className={className} />;
}

/** Small icon-in-circle used on trainer cards to hint offered activities. */
export function ActivityIconCircle({
  slug,
  className,
}: {
  slug: ActivitySlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground/70",
        className,
      )}
    >
      <ActivityIcon slug={slug} size={16} />
    </span>
  );
}

/** Labeled activity chip (service tags + category filters). */
export function ActivityChip({
  slug,
  locale = "zh",
  label,
  active = false,
  onClick,
  className,
}: {
  slug: ActivitySlug;
  locale?: Locale;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const text = label ?? ACTIVITY_META[slug][locale];
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-card text-foreground hover:bg-accent",
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        <ActivityIcon slug={slug} size={16} />
        {text}
      </button>
    );
  }
  return (
    <span className={classes}>
      <ActivityIcon slug={slug} size={16} />
      {text}
    </span>
  );
}
