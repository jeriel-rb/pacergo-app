"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  CalendarX2,
  Check,
  Clock3,
  Copy,
  Handshake,
  KeyRound,
  Mail,
  MessageCircleQuestion,
  Medal,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL, supportMailto } from "@pacergo/shared";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SectionLabel } from "@/components/site/section-label";
import { Reveal } from "@/components/site/reveal";

const TOPICS = [
  { key: "booking", Icon: CalendarX2 },
  { key: "account", Icon: KeyRound },
  { key: "companion", Icon: Medal },
  { key: "safety", Icon: ShieldAlert },
  { key: "partner", Icon: Handshake },
  { key: "other", Icon: MessageCircleQuestion },
] as const;

export function ContactContent() {
  const { t } = useTranslation("contact");
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — the address stays selectable.
    }
  };

  return (
    <>
      <SiteNav />
      <main>
        {/* Hero — the support address itself is the headline act. */}
        <section className="relative overflow-hidden">
          <div className="grid-texture absolute inset-0 -z-10" />
          <div className="absolute -top-32 left-[-8%] -z-10 size-[460px] rounded-full bg-brand/10 blur-[120px]" />

          <div className="mx-auto max-w-6xl px-6 pb-16 pt-24 lg:pb-20 lg:pt-28">
            <div className="animate-rise" style={{ animationDelay: "40ms" }}>
              <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
            </div>

            <h1
              className="animate-rise mt-6 max-w-2xl font-display text-[clamp(2.6rem,6.5vw,4.5rem)] font-semibold leading-[0.98]"
              style={{ animationDelay: "120ms" }}
            >
              {t("hero.title_1")}
              <br />
              <span className="text-brand">{t("hero.title_highlight")}</span>
            </h1>

            <p
              className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-ink/65"
              style={{ animationDelay: "220ms" }}
            >
              {t("hero.sub")}
            </p>

            {/* The inbox card: one address, writ large. */}
            <div
              className="animate-rise mt-10 max-w-3xl rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(10,10,10,0.35)] sm:p-8"
              style={{ animationDelay: "320ms" }}
            >
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/45">
                {t("hero.email_label")}
              </p>
              <a
                href={supportMailto()}
                className="mt-3 block break-all font-display text-[clamp(1.35rem,3.6vw,2.4rem)] font-semibold leading-tight text-ink underline decoration-brand/30 decoration-2 underline-offset-8 transition-colors hover:text-brand hover:decoration-brand"
              >
                {SUPPORT_EMAIL}
              </a>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={supportMailto()}
                  className="group inline-flex h-11 items-center gap-2 rounded-(--radius) bg-brand px-5 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
                >
                  <Mail className="size-4" />
                  {t("hero.write_cta")}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex h-11 items-center gap-2 rounded-(--radius) border border-ink/15 px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
                  {copied ? t("hero.copied") : t("hero.copy")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Topic router — each card mails us with the right subject line. */}
        <section className="border-t border-ink/8 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <Reveal>
              <SectionLabel>{t("topics.eyebrow")}</SectionLabel>
              <h2 className="mt-5 max-w-xl text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-tight">
                {t("topics.title")}
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-ink/60">{t("topics.sub")}</p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICS.map(({ key, Icon }, i) => (
                <Reveal key={key} delay={i * 60}>
                  <a
                    href={supportMailto(t(`topics.items.${key}.subject`))}
                    className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-paper p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_20px_40px_-28px_rgba(21,101,255,0.45)]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="mt-5 block text-base font-semibold text-ink">
                      {t(`topics.items.${key}.label`)}
                    </span>
                    <span className="mt-2 block flex-1 text-sm leading-relaxed text-ink/55">
                      {t(`topics.items.${key}.desc`)}
                    </span>
                    <span className="mt-5 inline-flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink/45 transition-colors group-hover:text-brand">
                      {t("topics.action")}
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Expectations — when we reply, and what to do in a real emergency. */}
        <section className="border-t border-ink/8">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:py-20">
            <Reveal>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-ink/10 bg-white p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Clock3 className="size-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{t("notes.reply_title")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{t("notes.reply_body")}</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-ink/10 bg-white p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Siren className="size-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{t("notes.safety_title")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{t("notes.safety_body")}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
