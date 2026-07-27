"use client";

import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { getWebAppSignInUrl } from "@/lib/web-app-links";
import { SectionLabel } from "./section-label";

export function Hero() {
  const { t } = useTranslation("home");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const startFree = getWebAppSignInUrl("hero");
  const howItWorks = `${getLocalizedPath("/", locale)}#how-it-works`;

  return (
    <section id="top" className="relative overflow-hidden bg-paper">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-40 right-[-10%] -z-10 size-[520px] rounded-full bg-brand/8 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-18 lg:pb-24 lg:pt-24">
        <div className="max-w-4xl">
          <div className="animate-rise" style={{ animationDelay: "40ms" }}>
            <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
          </div>

          <h1
            className="animate-rise mt-6 max-w-4xl font-display text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[0.95] text-ink"
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
      </div>
    </section>
  );
}
