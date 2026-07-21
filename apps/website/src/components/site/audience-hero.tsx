"use client";

import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { getWebAppSignInUrl, type WebAppSignInMedium } from "@/lib/web-app-links";
import { SectionLabel } from "./section-label";

/** Type-led hero shared by the audience pages (/find, /earn), with an illustration. */
export function AudienceHero({ ns, illustration }: { ns: string; illustration?: React.ReactNode }) {
  const { t } = useTranslation(ns);
  const locale = getCurrentLocale(usePathname());
  const medium: WebAppSignInMedium = ns === "earn" ? "earn_page" : "find_page";
  const startFree = getWebAppSignInUrl(medium);
  const secondaryHref = ns === "find" ? `${getLocalizedPath("/", locale)}#how-it-works` : "#partner-process";

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-32 left-[-8%] -z-10 size-[460px] rounded-full bg-brand/10 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28 lg:pt-28">
        <div>
          <div className="animate-rise" style={{ animationDelay: "40ms" }}>
            <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
          </div>

          <h1
            className="animate-rise mt-6 max-w-2xl font-display text-[clamp(2.6rem,6.5vw,4.5rem)] font-semibold leading-[0.98]"
            style={{ animationDelay: "120ms" }}
          >
            {t("hero.title_1")}
            <br />
            {t("hero.title_2")}
            <span className="text-brand">{t("hero.title_highlight")}</span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-ink/65"
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
              href={secondaryHref}
              className="inline-flex h-12 items-center rounded-(--radius) border border-ink/15 px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("hero.cta_secondary")}
            </a>
          </div>
        </div>

        {illustration && (
          <div
            className="animate-rise relative flex justify-center lg:justify-self-end"
            style={{ animationDelay: "260ms" }}
          >
            <div className="absolute inset-0 -z-10 m-auto size-[340px] rounded-full bg-brand/10 blur-3xl" />
            {illustration}
          </div>
        )}
      </div>
    </section>
  );
}
