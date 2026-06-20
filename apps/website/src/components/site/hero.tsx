import { ArrowRight } from "lucide-react";
import { SectionLabel } from "./section-label";
import { PhoneMock } from "./phone-mock";

const STATS = [
  { value: "3", label: "companion tiers" },
  { value: "NT$", label: "transparent pricing" },
  { value: "100%", label: "verified profiles" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="grid-texture absolute inset-0 -z-10" />
      <div className="absolute -top-40 right-[-10%] -z-10 size-[520px] rounded-full bg-brand/10 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:pb-28 lg:pt-24">
        {/* left — copy */}
        <div>
          <div className="animate-rise" style={{ animationDelay: "40ms" }}>
            <SectionLabel>In-person fitness · Taiwan</SectionLabel>
          </div>

          <h1
            className="animate-rise mt-6 font-display text-[clamp(2.8rem,7vw,4.75rem)] font-semibold leading-[0.98]"
            style={{ animationDelay: "120ms" }}
          >
            Find your
            <br />
            workout <span className="text-brand">companion.</span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-md text-lg leading-relaxed text-ink/65"
            style={{ animationDelay: "220ms" }}
          >
            From certified trainers to training buddies — meet real people near
            you, match on activity and pace, and train together in person.
          </p>

          <div
            className="animate-rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <a
              href="#waitlist"
              className="group inline-flex h-12 items-center gap-2 rounded-[var(--radius)] bg-brand px-6 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              Join the waitlist
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="inline-flex h-12 items-center rounded-[var(--radius)] border border-ink/15 px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              See how it works
            </a>
          </div>

          <dl
            className="animate-rise mt-12 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-ink/10 bg-ink/10"
            style={{ animationDelay: "420ms" }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-paper px-4 py-4">
                <dt className="font-display text-2xl font-semibold text-ink">{stat.value}</dt>
                <dd className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink/50">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* right — device */}
        <div className="animate-rise lg:justify-self-end" style={{ animationDelay: "260ms" }}>
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}
