import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const TIERS = [
  {
    code: "A",
    name: "Certified Pros",
    price: "NT$800–1,500",
    unit: "/ session",
    blurb: "Licensed, verified trainers for structured, goal-driven coaching.",
    features: ["Document-verified credentials", "Structured programming", "Built for specific goals"],
    featured: true,
  },
  {
    code: "B",
    name: "Experienced Peers",
    price: "NT$300–700",
    unit: "/ session",
    blurb: "Seasoned athletes who train alongside you and share what works.",
    features: ["Real training experience", "Hands-on, not hands-off", "Push past your plateau"],
    featured: false,
  },
  {
    code: "C",
    name: "Training Buddies",
    price: "Free–NT$200",
    unit: "/ session",
    blurb: "Someone to show up with. Low-stakes accountability to build the habit.",
    features: ["Accountability partner", "Casual & flexible", "Free to get started"],
    featured: false,
  },
];

export function Tiers() {
  return (
    <section id="tiers" className="border-y border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <SectionLabel>The tiers</SectionLabel>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
              Three tiers. <span className="text-brand">One community.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-ink/60">
            Whether you need a coach, a sparring partner, or just someone to keep
            you honest — there&apos;s a tier and a price that fits.
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal
              key={tier.code}
              delay={i * 100}
              className={cn(
                "group relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
                tier.featured
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/12 bg-paper hover:border-ink/30",
              )}
            >
              {tier.featured && (
                <span className="absolute right-6 top-8 rounded-full bg-brand px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-paper">
                  Most trusted
                </span>
              )}

              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    "font-display text-6xl font-bold leading-none",
                    tier.featured ? "text-brand" : "text-ink",
                  )}
                >
                  {tier.code}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs uppercase tracking-[0.18em]",
                    tier.featured ? "text-paper/55" : "text-ink/45",
                  )}
                >
                  Tier
                </span>
              </div>

              <h3 className="mt-6 text-xl font-semibold">{tier.name}</h3>
              <p
                className={cn(
                  "mt-2 text-[0.9rem] leading-relaxed",
                  tier.featured ? "text-paper/65" : "text-ink/60",
                )}
              >
                {tier.blurb}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-semibold">{tier.price}</span>
                <span className={cn("text-xs", tier.featured ? "text-paper/50" : "text-ink/45")}>
                  {tier.unit}
                </span>
              </div>

              <ul
                className={cn(
                  "mt-7 space-y-3 border-t pt-7 text-sm",
                  tier.featured ? "border-paper/15" : "border-ink/10",
                )}
              >
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check
                      className={cn("size-4 shrink-0", tier.featured ? "text-brand" : "text-brand")}
                      strokeWidth={2.5}
                    />
                    <span className={tier.featured ? "text-paper/85" : "text-ink/75"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
