"use client";

import { ArrowRight, Camera, CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { getWebAppSignInUrl } from "@/lib/web-app-links";
import { SectionLabel } from "./section-label";

type HeroVisualStep = {
  label: string;
  caption: string;
};

export function Hero() {
  const { t } = useTranslation("home");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const startFree = getWebAppSignInUrl("hero");
  const howItWorks = `${getLocalizedPath("/", locale)}#how-it-works`;
  const visualSteps = t("hero.visual_steps", { returnObjects: true }) as HeroVisualStep[];

  return (
    <section id="top" className="relative overflow-hidden bg-paper">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-40 right-[-10%] -z-10 size-[520px] rounded-full bg-brand/8 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 sm:pt-18 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-24">
        <div>
          <div className="animate-rise" style={{ animationDelay: "40ms" }}>
            <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
          </div>

          <h1
            className="animate-rise mt-6 max-w-3xl font-display text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[0.95] text-ink"
            style={{ animationDelay: "120ms" }}
          >
            {t("hero.headline")}
          </h1>

          <p
            className="animate-rise mt-6 max-w-xl text-base leading-relaxed text-ink/68 sm:text-lg"
            style={{ animationDelay: "220ms" }}
          >
            {t("hero.sub")}
          </p>

          <div
            className="animate-rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <a
              href={startFree}
              className="group inline-flex h-12 items-center gap-2 rounded-(--radius) bg-brand px-6 text-sm font-semibold text-paper transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("hero.cta_primary")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={howItWorks}
              className="inline-flex h-12 items-center rounded-(--radius) border border-ink/15 px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("hero.cta_secondary")}
            </a>
          </div>

          <p className="animate-rise mt-5 max-w-xl text-sm leading-relaxed text-ink/50" style={{ animationDelay: "380ms" }}>
            {t("hero.trust")}
          </p>
        </div>

        <figure
          className="animate-rise relative mx-auto w-full max-w-[540px] lg:justify-self-end"
          style={{ animationDelay: "260ms" }}
          aria-label={t("hero.visual_label")}
        >
          <div className="rounded-[2rem] border border-ink/10 bg-white p-4 shadow-[0_38px_90px_-48px_rgba(10,10,10,0.45)] sm:p-5">
            <div className="flex items-center justify-between border-b border-ink/8 pb-4">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink/45">
                  {t("hero.visual_label")}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{t("hero.visual_sequence")}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Camera className="size-5" strokeWidth={1.8} />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {visualSteps.map((step, index) => (
                <div
                  key={step.label}
                  className="min-h-[150px] rounded-2xl border border-dashed border-ink/18 bg-paper p-4 sm:min-h-[260px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.64rem] font-medium tracking-[0.14em] text-ink/45">
                      0{index + 1}
                    </span>
                    <CheckCircle2 className="size-4 text-brand" strokeWidth={1.8} />
                  </div>
                  <div className="flex h-[92px] items-center justify-center sm:h-[172px]">
                    <span className="flex size-12 items-center justify-center rounded-full bg-white text-brand shadow-[0_16px_36px_-24px_rgba(10,10,10,0.35)]">
                      <Camera className="size-5" strokeWidth={1.8} />
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/55">{step.caption}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink/45">{t("hero.visual_note")}</p>
          </div>
        </figure>
      </div>
    </section>
  );
}
