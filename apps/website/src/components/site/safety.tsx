import { ShieldCheck, UserX, Share2, MapPinned } from "lucide-react";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified profiles",
    body: "Tier-A pros submit credentials to a private review before they can list. You always know who you're meeting.",
  },
  {
    icon: UserX,
    title: "Report & block",
    body: "One tap to report or block. Blocks are enforced both ways — blocked users disappear from each other's discovery entirely.",
  },
  {
    icon: Share2,
    title: "Share your session",
    body: "Send session details — who, where, when — to a trusted contact before you head out, straight from the app.",
  },
  {
    icon: MapPinned,
    title: "Meet in public",
    body: "A built-in safety center with first-meet guidance and public-venue suggestions keeps early sessions low-risk.",
  },
];

export function Safety() {
  return (
    <section id="safety" className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionLabel tone="paper">Trust &amp; safety</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              Built to keep
              <br />
              meetups <span className="text-brand">safe.</span>
            </h2>
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-paper/60">
              Meeting strangers to work out should feel safe by default. Safety
              isn&apos;t a setting in Pacergo — it&apos;s wired into every booking.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80} className="bg-ink p-8">
                <feature.icon className="size-6 text-brand" strokeWidth={1.75} />
                <h3 className="mt-6 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/55">{feature.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
