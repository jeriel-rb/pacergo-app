"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getWebAppSignUpUrl } from "@/lib/web-app-links";
import { Reveal } from "./reveal";

/** Small "Taichung First-Round Validation / Join for Free" call to action.
 *  Links straight to the Web App's registration page; there's no separate
 *  landing page. */
export function Validation() {
  const { t } = useTranslation("home");
  const join = getWebAppSignUpUrl("taichung_validation");

  return (
    <section id="taichung" className="scroll-mt-24 border-y border-ink/10 bg-paper">
      <Reveal className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 py-14 sm:flex-row sm:items-center sm:justify-between sm:gap-10 lg:py-16">
        <div className="max-w-xl">
          <MapPin className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
          <h2 className="mt-3 text-[clamp(1.6rem,3.4vw,2.25rem)] font-semibold leading-[1.1]">
            {t("validation.title_1")}
            <span className="text-brand">{t("validation.title_highlight")}</span>
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/60">{t("validation.body")}</p>
        </div>

        <a
          href={join}
          className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-(--radius) bg-brand px-7 text-sm font-semibold text-paper transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4"
        >
          {t("validation.cta")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </Reveal>
    </section>
  );
}
