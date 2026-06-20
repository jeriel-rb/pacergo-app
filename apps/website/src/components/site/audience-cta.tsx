"use client";

import { useTranslation } from "react-i18next";
import { SectionLabel } from "./section-label";
import { WaitlistForm } from "./waitlist-form";

/** Dark waitlist CTA for an audience page. Reads `${ns}.cta`; reuses WaitlistForm. */
export function AudienceCta({ ns }: { ns: string }) {
  const { t } = useTranslation(ns);

  return (
    <section id="join" className="relative overflow-hidden bg-ink text-paper">
      <div className="absolute left-1/2 top-0 -z-0 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[140px]" />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <div className="flex justify-center">
          <SectionLabel tone="paper">{t("cta.eyebrow")}</SectionLabel>
        </div>
        <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.0]">
          {t("cta.title_1")}
          <span className="text-brand">{t("cta.title_highlight")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-relaxed text-paper/60">
          {t("cta.sub")}
        </p>

        <div className="mx-auto mt-9 max-w-lg">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
