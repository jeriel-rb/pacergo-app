"use client";

import { ShieldCheck, UserX, Share2, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const ICONS = [ShieldCheck, UserX, Share2, MapPinned];

type SafetyItem = { title: string; body: string };

export function Safety() {
  const { t } = useTranslation("home");
  const items = t("safety.items", { returnObjects: true }) as SafetyItem[];

  return (
    <section id="safety" className="scroll-mt-24 bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionLabel tone="paper">{t("safety.eyebrow")}</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              {t("safety.title_1")}
              <br />
              {t("safety.title_2")}
              <span className="text-brand">{t("safety.title_highlight")}</span>
            </h2>
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-paper/60">
              {t("safety.intro")}
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 sm:grid-cols-2">
            {items.map((item, i) => {
              const Icon = ICONS[i] ?? ShieldCheck;
              return (
                <Reveal key={item.title} delay={i * 80} className="bg-ink p-8">
                  <Icon className="size-6 text-brand" strokeWidth={1.75} />
                  <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/55">{item.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
