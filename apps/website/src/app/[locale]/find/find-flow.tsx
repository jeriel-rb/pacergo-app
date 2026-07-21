"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Dumbbell, Sparkles, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { SectionLabel } from "@/components/site/section-label";
import { Reveal } from "@/components/site/reveal";

const ICONS = [Sparkles, UserSearch, Dumbbell, ClipboardCheck];

type FlowItem = {
  no: string;
  title: string;
  body: string;
};

export function FindFlow() {
  const { t } = useTranslation("find");
  const locale = getCurrentLocale(usePathname());
  const items = t("fit.items", { returnObjects: true }) as FlowItem[];
  const aiPlanningHref = `${getLocalizedPath("/", locale)}#ai-coach`;

  return (
    <section id="partner-flow" className="bg-paper px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div className="max-w-2xl">
            <SectionLabel>{t("fit.eyebrow")}</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              {t("fit.title_1")}
              <span className="text-brand">{t("fit.title_highlight")}</span>
            </h2>
          </div>
          <div className="max-w-md lg:justify-self-end">
            <p className="text-[0.95rem] leading-relaxed text-ink/60">{t("fit.intro")}</p>
            <Link
              href={aiPlanningHref}
              className="mt-5 inline-flex items-center rounded-(--radius) text-sm font-semibold text-brand transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("fit.ai_link")}
            </Link>
          </div>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-(--radius) border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? Sparkles;
            return (
              <Reveal key={item.no} as="li" delay={index * 80} className="bg-white p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium tracking-widest text-ink/40">
                    {item.no}
                  </span>
                  <Icon className="size-5 text-brand" strokeWidth={1.75} />
                </div>
                <h3 className="mt-10 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink/60">{item.body}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
