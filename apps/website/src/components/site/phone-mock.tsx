"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * A restrained device mockup of the Pacergo app: a minimal map with a
 * self-drawing brand "route" and a companion booking card. A cycling
 * Discover → Book → Train stepper underneath narrates the actual flow.
 * Pure markup — only the three brand colors (and their opacities) appear here.
 */
export function PhoneMock({ className }: { className?: string }) {
  const { t } = useTranslation("home");
  const flow = t("mockup.flow", { returnObjects: true }) as string[];

  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % flow.length), 1900);
    return () => clearInterval(id);
  }, [flow.length]);

  return (
    <div className={cn("relative mx-auto w-[280px] sm:w-[320px]", className)}>
      <div className="absolute -inset-12 -z-10 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.4rem] border-[6px] border-ink bg-white shadow-[0_40px_80px_-32px_rgba(10,10,10,0.45)]">
        <div className="absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

        <div className="flex items-center justify-between px-6 pt-9 pb-3 font-mono text-[0.6rem] tracking-widest text-ink/50">
          <span>9:41</span>
          <span>{t("mockup.discover")}</span>
        </div>

        <div className="flex gap-1.5 px-4 pb-3">
          <span className="rounded-full bg-brand px-2.5 py-1 text-[0.6rem] font-semibold text-paper">
            {t("activities.0")}
          </span>
          <span className="rounded-full border border-ink/12 px-2.5 py-1 text-[0.6rem] font-medium text-ink/55">
            {t("mockup.tier_a")}
          </span>
          <span className="rounded-full border border-ink/12 px-2.5 py-1 text-[0.6rem] font-medium text-ink/55">
            ≤ 2km
          </span>
        </div>

        <div className="relative mx-3 h-[200px] overflow-hidden rounded-2xl border border-ink/8 bg-paper">
          <div className="grid-texture absolute inset-0 opacity-70" />
          <svg viewBox="0 0 240 200" className="absolute inset-0 h-full w-full" fill="none">
            <path
              d="M40 160 C 80 150, 80 90, 120 88 S 180 60, 196 44"
              stroke="var(--color-brand)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                strokeDasharray: 320,
                strokeDashoffset: 320,
                animation: "draw 2.2s var(--ease-out-expo) 0.4s forwards",
              }}
            />
            <circle cx="40" cy="160" r="6" fill="var(--color-brand)" />
            <circle cx="196" cy="44" r="5" fill="var(--color-ink)" />
            <circle cx="196" cy="44" r="10" stroke="var(--color-ink)" strokeOpacity="0.18" />
          </svg>

          {/* pulsing "you are here" node */}
          <span className="absolute left-[14%] top-[76%] flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand/40" />
            <span className="relative inline-flex size-3 rounded-full bg-brand" />
          </span>

          <div className="absolute left-[44%] top-[38%] flex size-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[0.55rem] font-bold text-paper shadow-md">
            A
          </div>
          <div className="absolute left-[68%] top-[60%] flex size-6 items-center justify-center rounded-full border-2 border-white bg-brand text-[0.5rem] font-bold text-paper shadow-md">
            B
          </div>
        </div>

        <div className="mx-3 mt-3 rounded-2xl border border-ink/8 bg-white p-3.5 shadow-[0_18px_40px_-28px_rgba(10,10,10,0.5)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-ink font-display text-base font-semibold text-paper">
              M
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink">Mei L.</p>
                <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-brand">
                  {t("mockup.tier_a")}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-ink/55">
                <Star className="size-3 fill-brand text-brand" />
                <span className="font-medium text-ink/75">4.9</span>
                <span>· {t("mockup.meta")}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[0.58rem] font-semibold text-brand">
              <span className="size-1.5 rounded-full bg-brand" />
              {t("mockup.available")}
            </span>
          </div>
          <button className="mt-3 h-9 w-full rounded-(--radius) bg-brand text-xs font-semibold text-paper">
            {t("mockup.book")}
          </button>
        </div>
      </div>

      {/* flow narration */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {flow.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-colors duration-300",
                i === step ? "bg-ink text-paper" : "text-ink/45",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-300",
                  i === step ? "bg-brand" : "bg-ink/25",
                )}
              />
              {label}
            </span>
            {i < flow.length - 1 && <span className="h-px w-3 bg-ink/15" />}
          </div>
        ))}
      </div>
    </div>
  );
}
