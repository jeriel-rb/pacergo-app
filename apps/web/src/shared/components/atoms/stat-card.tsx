import type { LucideIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive";

const SUB_TONE: Record<Tone, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-red-600 dark:text-red-400",
};

/** KPI tile for dashboards: small title with an icon on the right, a big
 *  value, and an optional caption underneath. */
export function StatCard({
  title,
  value,
  sub,
  subTone = "default",
  icon: Icon,
  isLoading,
  className,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subTone?: Tone;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4 xl:gap-3 xl:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold leading-none tracking-tight">{value}</div>
            {sub && (
              <p className={cn("text-xs lg:[@media(max-height:800px)]:hidden", SUB_TONE[subTone])}>
                {sub}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
