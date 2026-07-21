"use client";

import { CheckCircle2, ClipboardList, Dumbbell, LineChart, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const ICONS = [ClipboardList, Dumbbell, CheckCircle2, LineChart];

type ProgressItem = {
  title: string;
  body: string;
};

export function TrainingProgress() {
  const { t } = useTranslation("home");
  const items = t("progress.items", { returnObjects: true }) as ProgressItem[];

  return (
    <section id="progress" className="scroll-mt-24 bg-paper px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div className="max-w-2xl">
            <SectionLabel>{t("progress.eyebrow")}</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              {t("progress.title_1")}
              <span className="text-brand">{t("progress.title_highlight")}</span>
            </h2>
          </div>
          <p className="max-w-md text-[0.95rem] leading-relaxed text-ink/60 lg:justify-self-end">
            {t("progress.intro")}
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-px overflow-hidden rounded-(--radius) border border-ink/10 bg-ink/10 sm:grid-cols-2">
            {items.map((item, index) => {
              const Icon = ICONS[index] ?? ClipboardList;
              return (
                <Reveal key={item.title} delay={index * 80} className="bg-white p-8">
                  <Icon className="size-6 text-brand" strokeWidth={1.75} />
                  <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/58">{item.body}</p>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120} className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-ink/45">
                  {t("progress.visual_label")}
                </p>
                <p className="mt-2 text-xl font-semibold">{t("progress.visual_title")}</p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <RotateCcw className="size-5" strokeWidth={1.8} />
              </span>
            </div>

            <div className="mt-8 space-y-4">
              <div className="h-3 rounded-full border border-dashed border-ink/18 bg-paper" />
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-20 rounded-xl border border-dashed border-ink/18 bg-paper" />
                ))}
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-ink/45">{t("progress.visual_note")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
