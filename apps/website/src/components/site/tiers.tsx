"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

type Tier = {
  code: string;
  name: string;
  blurb: string;
  features: string[];
};

export function Tiers() {
  const { t } = useTranslation("home");
  const locale = getCurrentLocale(usePathname());
  const items = t("tiers.items", { returnObjects: true }) as Tier[];
  const findHref = getLocalizedPath("/find", locale);

  return (
    <section id="workout-partner" className="scroll-mt-24 border-y border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <SectionLabel>{t("tiers.eyebrow")}</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              {t("tiers.title_1")}
              <span className="text-brand">{t("tiers.title_highlight")}</span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-[0.95rem] leading-relaxed text-ink/60">{t("tiers.intro")}</p>
            <Link
              href={findHref}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-(--radius) border border-ink/15 px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("tiers.cta")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {items.map((tier, i) => {
            const featured = i === 0;
            return (
              <Reveal
                key={tier.code}
                delay={i * 100}
                className={cn(
                  "group relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
                  featured
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/12 bg-paper hover:border-ink/30",
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "font-display text-6xl font-bold leading-none",
                      featured ? "text-brand" : "text-ink",
                    )}
                  >
                    {tier.code}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs uppercase tracking-[0.18em]",
                      featured ? "text-paper/55" : "text-ink/45",
                    )}
                  >
                    {tier.name}
                  </span>
                </div>

                <p
                  className={cn(
                    "mt-6 text-[0.95rem] leading-relaxed",
                    featured ? "text-paper/70" : "text-ink/65",
                  )}
                >
                  {tier.blurb}
                </p>

                <ul
                  className={cn(
                    "mt-7 space-y-3 border-t pt-7 text-sm",
                    featured ? "border-paper/15" : "border-ink/10",
                  )}
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="size-4 shrink-0 text-brand" strokeWidth={2.5} />
                      <span className={featured ? "text-paper/85" : "text-ink/75"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <p
                  className={cn(
                    "mt-7 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.14em]",
                    featured ? "text-paper/45" : "text-ink/45",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-brand" />
                  {t("tiers.rate_note")}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
