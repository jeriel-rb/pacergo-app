"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Waitlist capture. Front-end only for now — on submit it shows a success
 * state. Wire to a real endpoint (or @pacergo/api) when ready.
 */
export function WaitlistForm() {
  const { t } = useTranslation("home");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-(--radius) border border-paper/15 bg-paper/5 px-6 py-4 text-paper">
        <Check className="size-5 shrink-0 text-brand" strokeWidth={2.5} />
        <p className="text-sm font-medium">{t("cta.success", { email })}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) setDone(true);
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="waitlist-email" className="sr-only">
        {t("cta.email_placeholder")}
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("cta.email_placeholder")}
        className="h-12 flex-1 rounded-(--radius) border border-paper/20 bg-paper/5 px-4 text-sm text-paper placeholder:text-paper/40 focus:border-brand focus-visible:outline-none"
      />
      <button
        type="submit"
        className="group inline-flex h-12 items-center justify-center gap-2 rounded-(--radius) bg-brand px-6 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
      >
        {t("cta.submit")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
