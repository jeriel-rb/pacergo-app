import { MapPin, CalendarCheck, Dumbbell } from "lucide-react";
import { SectionLabel } from "./section-label";
import { Reveal } from "./reveal";

const STEPS = [
  {
    no: "01",
    icon: MapPin,
    title: "Discover",
    body: "Browse companions near you, filtered by activity, tier, and price. Every profile shows distance, rating, and what they actually do.",
  },
  {
    no: "02",
    icon: CalendarCheck,
    title: "Book",
    body: "Request a session — pick the offering, time, and place. They accept, you meet. Reschedule or cancel anytime, no awkwardness.",
  },
  {
    no: "03",
    icon: Dumbbell,
    title: "Train",
    body: "Show up and train together in person. Rate each other afterwards so the community stays strong and accountable.",
  },
];

export function Steps() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <div className="max-w-2xl">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02]">
          Three steps from solo to{" "}
          <span className="text-brand">side by side.</span>
        </h2>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-[var(--radius)] border border-ink/10 bg-ink/10 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.no} delay={i * 90} className="group bg-paper p-8 lg:p-10">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium tracking-widest text-ink/40">
                {step.no}
              </span>
              <step.icon className="size-5 text-brand" strokeWidth={1.75} />
            </div>
            <h3 className="mt-12 text-2xl font-semibold">{step.title}</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/60">{step.body}</p>
            <div className="mt-8 h-px w-full bg-ink/10">
              <div className="h-px w-0 bg-brand transition-all duration-500 ease-out group-hover:w-full" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
