"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { SectionLabel } from "./section-label";

/** Dark closing CTA for an audience page. Reads `${ns}.cta`; links to /waitlist. */
export function AudienceCta({ ns }: { ns: string }) {
  const { t } = useTranslation(ns);
  const { t: tn } = useTranslation("nav");
  const waitlist = getLocalizedPath("/waitlist", getCurrentLocale(usePathname()));

  return (
    <section id="join" className="relative overflow-hidden bg-ink text-paper">
      <div className="absolute left-1/2 top-0 z-0 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[140px]" />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <div className="flex justify-center">
          <SectionLabel tone="paper">{t("cta.eyebrow")}</SectionLabel>
        </div>
        <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-none">
          {t("cta.title_1")}
          <span className="text-brand">{t("cta.title_highlight")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-relaxed text-paper/60">
          {t("cta.sub")}
        </p>

        <div className="mt-9 flex justify-center">
          <Link
            href={waitlist}
            className="group inline-flex h-12 items-center gap-2 rounded-(--radius) bg-brand px-7 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
          >
            {tn("waitlist")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
