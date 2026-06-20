import { SectionLabel } from "./section-label";
import { WaitlistForm } from "./waitlist-form";

export function Cta() {
  return (
    <section id="waitlist" className="relative overflow-hidden bg-ink text-paper">
      <div className="absolute left-1/2 top-0 -z-0 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[140px]" />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <div className="flex justify-center">
          <SectionLabel tone="paper">Early access</SectionLabel>
        </div>
        <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.0]">
          Ready to find your <span className="text-brand">pace?</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-relaxed text-paper/60">
          Join the waitlist and be first to train with a companion when Pacergo
          opens in your city.
        </p>

        <div className="mx-auto mt-9 max-w-lg">
          <WaitlistForm />
        </div>

        <p className="mt-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-paper/40">
          Launching in Taiwan · 繁體中文 &amp; English
        </p>
      </div>
    </section>
  );
}
