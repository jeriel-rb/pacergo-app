import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A restrained device mockup of the Pacergo app: a minimal map with a
 * self-drawing brand "route" and a companion booking card. Pure markup —
 * only the three brand colors (and their opacities) appear here.
 */
export function PhoneMock({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-[280px] sm:w-[320px]", className)}>
      {/* Soft brand halo for depth — brand color at a whisper. */}
      <div className="absolute -inset-12 -z-10 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.4rem] border-[6px] border-ink bg-white shadow-[0_40px_80px_-32px_rgba(10,10,10,0.45)]">
        {/* notch */}
        <div className="absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

        {/* status row */}
        <div className="flex items-center justify-between px-6 pt-9 pb-3 font-mono text-[0.6rem] tracking-widest text-ink/50">
          <span>9:41</span>
          <span>探索 · DISCOVER</span>
        </div>

        {/* filter chips */}
        <div className="flex gap-1.5 px-4 pb-3">
          <span className="rounded-full bg-brand px-2.5 py-1 text-[0.6rem] font-semibold text-paper">
            Gym
          </span>
          <span className="rounded-full border border-ink/12 px-2.5 py-1 text-[0.6rem] font-medium text-ink/55">
            Tier A
          </span>
          <span className="rounded-full border border-ink/12 px-2.5 py-1 text-[0.6rem] font-medium text-ink/55">
            ≤ 2km
          </span>
        </div>

        {/* map */}
        <div className="relative mx-3 h-[200px] overflow-hidden rounded-2xl border border-ink/8 bg-paper">
          <div className="grid-texture absolute inset-0 opacity-70" />
          <svg viewBox="0 0 240 200" className="absolute inset-0 h-full w-full" fill="none">
            {/* route */}
            <path
              d="M40 160 C 80 150, 80 90, 120 88 S 180 60, 196 44"
              stroke="var(--color-brand)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="6 10"
              pathLength={1}
              style={{
                strokeDasharray: 320,
                strokeDashoffset: 320,
                animation: "draw 2.2s var(--ease-out-expo) 0.4s forwards",
              }}
            />
            {/* start node */}
            <circle cx="40" cy="160" r="6" fill="var(--color-brand)" />
            <circle cx="40" cy="160" r="11" fill="var(--color-brand)" opacity="0.18" />
            {/* destination pin */}
            <circle cx="196" cy="44" r="5" fill="var(--color-ink)" />
            <circle cx="196" cy="44" r="10" stroke="var(--color-ink)" strokeOpacity="0.18" />
          </svg>

          {/* floating companion pins */}
          <div className="absolute left-[44%] top-[38%] flex size-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[0.55rem] font-bold text-paper shadow-md">
            A
          </div>
          <div className="absolute left-[68%] top-[60%] flex size-6 items-center justify-center rounded-full border-2 border-white bg-brand text-[0.5rem] font-bold text-paper shadow-md">
            B
          </div>
        </div>

        {/* companion card */}
        <div className="mx-3 mt-3 rounded-2xl border border-ink/8 bg-white p-3.5 shadow-[0_18px_40px_-28px_rgba(10,10,10,0.5)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-ink font-display text-base font-semibold text-paper">
              M
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink">Mei L.</p>
                <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-brand">
                  Tier A
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-ink/55">
                <Star className="size-3 fill-brand text-brand" />
                <span className="font-medium text-ink/75">4.9</span>
                <span>· Strength · 1.2km</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[0.6rem] text-ink/45">NT$</p>
              <p className="font-display text-base font-semibold text-ink">900</p>
            </div>
          </div>
          <button className="mt-3 h-9 w-full rounded-[var(--radius)] bg-brand text-xs font-semibold text-paper">
            Book session
          </button>
        </div>
      </div>
    </div>
  );
}
