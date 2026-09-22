"use client";

import { cn } from "@/lib/utils";

const THUMB_PX = 24;

/** Left offset (CSS) of a value's thumb centre. A native range input keeps the
 *  thumb fully inside the track, so its centre travels `thumb/2 … width-thumb/2`
 *  — the fill and labels have to follow the same maths to line up. */
function thumbLeft(pct: number) {
  return `calc(${pct}% + ${(0.5 - pct / 100) * THUMB_PX}px)`;
}

const thumbClasses = cn(
  "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent",
  "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/10 [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-md",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/10",
  "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md",
  "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-ring",
);

/** Two-thumb range slider (min … max). Built from two native range inputs so
 *  it keeps keyboard and screen-reader support; the thumbs can't cross (they
 *  stay at least `minGap` apart). `formatValue` labels each thumb. */
export function RangeSlider({
  min,
  max,
  step = 1,
  minGap,
  value,
  onChange,
  formatValue,
  minAriaLabel,
  maxAriaLabel,
  className,
}: {
  min: number;
  max: number;
  step?: number;
  /** Smallest allowed distance between the thumbs (default: one step). */
  minGap?: number;
  value: readonly [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  minAriaLabel: string;
  maxAriaLabel: string;
  className?: string;
}) {
  const gap = minGap ?? step;
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const loPct = pct(lo);
  const hiPct = pct(hi);
  const fmt = formatValue ?? String;

  return (
    <div className={cn("px-3", className)}>
      {/* Value labels ride above their thumbs. */}
      <div className="relative h-5 text-sm text-muted-foreground">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: thumbLeft(loPct) }}>
          {fmt(lo)}
        </span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: thumbLeft(hiPct) }}>
          {fmt(hi)}
        </span>
      </div>

      <div className="relative mt-1 h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: thumbLeft(loPct), width: `calc(${hiPct - loPct}% + ${((loPct - hiPct) / 100) * THUMB_PX}px)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={minAriaLabel}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - gap), hi])}
          // When both thumbs sit at the top, the lower one must stay grabbable.
          className={cn(thumbClasses, loPct > 90 ? "z-30" : "z-20")}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={maxAriaLabel}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + gap)])}
          className={cn(thumbClasses, "z-20")}
        />
      </div>
    </div>
  );
}
