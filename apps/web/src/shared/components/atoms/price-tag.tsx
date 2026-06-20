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
  className,
}: {
  amount: number;
  isFree?: boolean;
  perHour?: boolean;
  locale?: Locale;
  className?: string;
}) {
  if (isFree) {
    return (
      <span className={cn("font-semibold text-primary", className)}>
        {FREE[locale]}
      </span>
    );
  }
  return (
    <span className={cn("font-semibold text-primary", className)}>
      {`NT$${amount.toLocaleString()}`}
      {perHour && (
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
          {PER_HOUR[locale]}
        </span>
      )}
    </span>
  );
}
