"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionLabel } from "./section-label";

/**
 * Dedicated waitlist signup — name + email. Front-end only for now: on submit it
 * shows a success state. Wire `onSubmit` to a real endpoint (or @pacergo/api) later.
 */
export function WaitlistPanel() {
  const { t } = useTranslation("waitlist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-32 left-1/2 -z-10 size-[460px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]" />

      <div className="mx-auto max-w-xl px-6 py-24 text-center lg:py-32">
        <div className="flex justify-center">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
        </div>
        <h1 className="mx-auto mt-6 font-display text-[clamp(2.4rem,5.5vw,3.75rem)] font-semibold leading-[1.0]">
          {t("title_1")}
          <span className="text-brand">{t("title_highlight")}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[0.97rem] leading-relaxed text-ink/65">
          {t("sub")}
        </p>

        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-[0_24px_60px_-32px_rgba(10,10,10,0.4)] sm:p-8">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Check className="size-6" strokeWidth={2.5} />
              </span>
              <h2 className="text-xl font-semibold">{t("success_title")}</h2>
              <p className="max-w-xs text-sm leading-relaxed text-ink/60">
                {t("success_body", { name, email })}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim() && email.trim()) setDone(true);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wl-name" className="text-sm font-medium text-ink/70">
                  {t("name_label")}
                </label>
                <input
                  id="wl-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("name_placeholder")}
                  className="h-12 rounded-(--radius) border border-ink/15 bg-white px-4 text-sm text-ink placeholder:text-ink/35 focus:border-brand focus-visible:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wl-email" className="text-sm font-medium text-ink/70">
                  {t("email_label")}
                </label>
                <input
                  id="wl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("email_placeholder")}
                  className="h-12 rounded-(--radius) border border-ink/15 bg-white px-4 text-sm text-ink placeholder:text-ink/35 focus:border-brand focus-visible:outline-none"
                />
              </div>
              <button
                type="submit"
                className="group mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-(--radius) bg-brand text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
              >
                {t("submit")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          )}
        </div>

        <p className="mx-auto mt-6 max-w-sm font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink/45">
          {t("fine_print")}
        </p>
      </div>
    </section>
  );
}
