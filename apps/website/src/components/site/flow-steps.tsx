"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

type Step = { no: string; title: string; body: string };

/** Numbered "how it works" steps for an audience page. Reads `${ns}.how`. */
export function FlowSteps({
  ns,
  icons,
  surface = "paper",
  id = "how",
}: {
  ns: string;
  icons: LucideIcon[];
  surface?: "paper" | "white";
  id?: string;
}) {
  const { t } = useTranslation(ns);
  const items = t("how.items", { returnObjects: true }) as Step[];

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24",
        surface === "white" ? "border-y border-ink/10 bg-white" : "bg-paper",
      )}
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="max-w-2xl">
          <SectionLabel>{t("how.eyebrow")}</SectionLabel>
          <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
            {t("how.title_1")}
            <span className="text-brand">{t("how.title_highlight")}</span>
          </h2>
        </div>

        <div
          className={cn(
            "mt-16 grid gap-px overflow-hidden rounded-(--radius) border border-ink/10 bg-ink/10 md:grid-cols-2",
            items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {items.map((step, i) => {
            const Icon = icons[i] ?? icons[0];
            return (
              <Reveal key={step.no} delay={i * 90} className="group bg-paper p-8 lg:p-10">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium tracking-widest text-ink/40">
                    {step.no}
                  </span>
                  {Icon && <Icon className="size-5 text-brand" strokeWidth={1.75} />}
                </div>
                <h3 className="mt-12 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/60">{step.body}</p>
                <div className="mt-8 h-px w-full bg-ink/10">
                  <div className="h-px w-0 bg-brand transition-all duration-500 ease-out group-hover:w-full" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
