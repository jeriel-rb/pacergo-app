"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { SectionLabel } from "./section-label";
import { PhoneMock } from "./phone-mock";

export function Hero() {
  const { t } = useTranslation("home");
  const waitlist = getLocalizedPath("/waitlist", getCurrentLocale(usePathname()));

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-40 right-[-10%] -z-10 size-[520px] rounded-full bg-brand/10 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:pb-28 lg:pt-28">
        <div>
          <div className="animate-rise" style={{ animationDelay: "40ms" }}>
            <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
          </div>

          <h1
            className="animate-rise mt-6 font-display text-[clamp(3rem,7.5vw,5rem)] font-semibold leading-[0.96]"
            style={{ animationDelay: "120ms" }}
          >
            {t("hero.title_1")}
            <br />
            {t("hero.title_2")}
            <span className="text-brand">{t("hero.title_highlight")}</span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-md text-lg leading-relaxed text-ink/65"
            style={{ animationDelay: "220ms" }}
          >
            {t("hero.sub")}
          </p>

          <div
            className="animate-rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href={waitlist}
              className="group inline-flex h-12 items-center gap-2 rounded-(--radius) bg-brand px-6 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              {t("hero.cta_primary")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 items-center rounded-(--radius) border border-ink/15 px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              {t("hero.cta_secondary")}
            </a>
          </div>
        </div>

        <div className="animate-rise lg:justify-self-end" style={{ animationDelay: "260ms" }}>
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}
