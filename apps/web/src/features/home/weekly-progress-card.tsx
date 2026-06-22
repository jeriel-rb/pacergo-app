import { Card } from "@/shared/components/ui/card";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";

/** Weekly training-progress summary with a circular progress ring. */
export function WeeklyProgressCard({
  title,
  subtitleEn,
  percent,
  countLabel,
  soon = false,
}: {
  title: string;
  subtitleEn: string;
  percent: number;
  countLabel: string;
  /** Underlying logging isn't built yet → flag the card with a "Soon" badge. */
  soon?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="relative p-5">
      {soon && <SoonBadge className="absolute right-4 top-4" />}
      <div className="flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
            {pct}%
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {subtitleEn}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{countLabel}</p>
        </div>
      </div>
    </Card>
  );
}
