"use client";

import { ClipboardCheck, Dumbbell, Sparkles, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const ICONS = [Sparkles, UserSearch, Dumbbell, ClipboardCheck];

type Step = { no: string; title: string; body: string };

export function Steps() {
  const { t } = useTranslation("home");
  const items = t("steps.items", { returnObjects: true }) as Step[];

  return (
    <section id="how-it-works" className="scroll-mt-24 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <SectionLabel>{t("steps.eyebrow")}</SectionLabel>
          <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
            {t("steps.title_1")}
            <span className="text-brand">{t("steps.title_highlight")}</span>
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-ink/60">{t("steps.intro")}</p>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-(--radius) border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
          {items.map((step, i) => {
            const Icon = ICONS[i] ?? Sparkles;
            return (
              <Reveal key={step.no} delay={i * 90} as="li" className="group bg-paper p-8 lg:p-9">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium tracking-widest text-ink/40">
                    {step.no}
                  </span>
                  <Icon className="size-5 text-brand" strokeWidth={1.75} />
                </div>
                <h3 className="mt-12 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/60">{step.body}</p>
                <div className="mt-8 h-px w-full bg-ink/10">
                  <div className="h-px w-0 bg-brand transition-all duration-500 ease-out group-hover:w-full" />
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
