import { Card } from "@/shared/components/ui/card";
import { ProgressBar } from "@/shared/components/atoms/progress-bar";

/** Weekly training-progress summary card. */
export function WeeklyProgressCard({
  title,
  subtitleEn,
  percent,
  countLabel,
}: {
  title: string;
  subtitleEn: string;
  percent: number;
  countLabel: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {subtitleEn}
          </p>
        </div>
        <span className="text-2xl font-bold text-primary">{percent}%</span>
      </div>
      <ProgressBar value={percent} className="mt-3" />
      <p className="mt-2 text-right text-xs text-muted-foreground">
        {countLabel}
      </p>
    </Card>
  );
}
