import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { GradientHeader } from "@/shared/components/atoms/gradient-header";

/** Blue gradient hero promoting trainer discovery. Links to the trainers list. */
export function HeroBanner({
  href,
  title,
  subtitle,
  cta,
}: {
  href: string;
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <Link href={href} className="group block">
      <GradientHeader className="rounded-[24px] p-6 shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:-translate-y-0.5 lg:p-8">
        {/* Atmospheric depth: soft glows + an oversized watermark icon. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/10 blur-2xl"
        />
        <Dumbbell
          aria-hidden
          className="pointer-events-none absolute -bottom-3 right-2 h-28 w-28 rotate-12 text-white/10 lg:h-40 lg:w-40"
        />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight lg:text-[32px]">
              {title}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-white/85 lg:text-base">
              {subtitle}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              {cta}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-white/30 sm:flex">
            <ArrowRight size={22} />
          </span>
        </div>
      </GradientHeader>
    </Link>
  );
}
