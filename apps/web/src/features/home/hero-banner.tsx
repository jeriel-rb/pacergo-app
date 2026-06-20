import { ArrowRight } from "lucide-react";
import { GradientHeader } from "@/shared/components/atoms/gradient-header";

/** Blue gradient hero promoting trainer discovery. */
export function HeroBanner({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <GradientHeader className="rounded-[20px] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            {kicker}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-snug">{title}</h2>
          <p className="mt-1 text-sm text-white/85">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <ArrowRight size={20} />
        </span>
      </div>
    </GradientHeader>
  );
}
