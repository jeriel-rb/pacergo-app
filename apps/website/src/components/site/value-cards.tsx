"use client";

import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

type Card = { title?: string; name?: string; body: string };
/** Any icon that accepts className + strokeWidth — lucide icons and our own glyphs. */
type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * A titled grid of value/feature cards driven by a translation key.
 * Reads `${ns}.${k}` → { eyebrow, title_1, title_highlight, intro?, items[] }.
 * Pass `icons` for a feature grid, or omit for a numbered list.
 */
export function ValueCards({
  ns,
  k,
  icons,
  columns = 3,
  surface = "white",
  id,
}: {
  ns: string;
  k: string;
  icons?: IconType[];
  columns?: 3 | 4;
  surface?: "paper" | "white";
  id?: string;
}) {
  const { t } = useTranslation(ns);
  const items = t(`${k}.items`, { returnObjects: true }) as Card[];
  const intro = t(`${k}.intro`, { defaultValue: "" });

  const sectionBg = surface === "white" ? "border-y border-ink/10 bg-white" : "bg-paper";
  const cardBg = surface === "white" ? "bg-paper" : "bg-white";

  return (
    <section id={id} className={sectionBg}>
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <SectionLabel>{t(`${k}.eyebrow`)}</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              {t(`${k}.title_1`)}
              <span className="text-brand">{t(`${k}.title_highlight`)}</span>
            </h2>
          </div>
          {intro && (
            <p className="max-w-sm text-[0.95rem] leading-relaxed text-ink/60">{intro}</p>
          )}
        </div>

        <div
          className={cn(
            "mt-16 grid gap-5 sm:grid-cols-2",
            columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {items.map((item, i) => {
            const Icon = icons?.[i];
            const heading = item.title ?? item.name;
            return (
              <Reveal
                key={heading}
                delay={i * 80}
                className={cn(
                  "flex flex-col rounded-2xl border border-ink/10 p-7 transition-colors hover:border-ink/25",
                  cardBg,
                )}
              >
                {Icon ? (
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                ) : (
                  <span className="font-mono text-sm font-medium tracking-widest text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <h3 className="mt-5 text-lg font-semibold">{heading}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink/60">{item.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
