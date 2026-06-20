import { cn } from "@/lib/utils";

type Locale = "zh" | "en";

const FREE: Record<Locale, string> = { zh: "免費", en: "Free" };
const PER_HOUR: Record<Locale, string> = { zh: "/小時", en: "/hr" };

/** Price in NT$, or a localized "Free" label. `perHour` appends a muted unit. */
export function PriceTag({
  amount,
  isFree = false,
  perHour = false,
  locale = "zh",
  tone = "default",
  className,
}: {
  amount: number;
  isFree?: boolean;
  perHour?: boolean;
  locale?: Locale;
  /** "onDark" renders white text for use on the gradient header. */
  tone?: "default" | "onDark";
  className?: string;
}) {
  const valueColor = tone === "onDark" ? "text-white" : "text-primary";
  const unitColor = tone === "onDark" ? "text-white/75" : "text-muted-foreground";

  if (isFree) {
    return (
      <span className={cn("font-semibold", valueColor, className)}>
        {FREE[locale]}
      </span>
    );
  }
  return (
    <span className={cn("font-semibold", valueColor, className)}>
      {`NT$${amount.toLocaleString()}`}
      {perHour && (
        <span className={cn("ml-0.5 text-xs font-normal", unitColor)}>
          {PER_HOUR[locale]}
        </span>
      )}
    </span>
  );
}
