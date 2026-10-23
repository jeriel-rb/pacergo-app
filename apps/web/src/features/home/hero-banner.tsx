import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { GradientHeader } from "@/shared/components/atoms/gradient-header";

/**
 * Slim blue gradient strip promoting trainer discovery: one row of icon,
 * title + subtitle and the CTA, so Home's own content starts higher up.
 * Links to the trainers list.
 */
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
      <GradientHeader className="rounded-2xl px-4 py-3.5 shadow-md shadow-primary/15 transition-transform duration-300 group-hover:-translate-y-0.5 lg:px-5 lg:py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl"
        />

        <div className="relative flex items-center gap-3 lg:gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Dumbbell size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold leading-tight lg:text-lg">
              {title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-white/85 lg:text-sm">
              {subtitle}
            </p>
          </div>
          {/* Labelled pill where there's room; arrow only on phones. */}
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-primary transition-colors group-hover:bg-white/90 sm:inline-flex">
            {cta}
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 sm:hidden">
            <ArrowRight size={16} aria-hidden />
            <span className="sr-only">{cta}</span>
          </span>
        </div>
      </GradientHeader>
    </Link>
  );
}
