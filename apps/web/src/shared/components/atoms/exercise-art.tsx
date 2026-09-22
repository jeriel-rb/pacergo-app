"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { exerciseArtFrame } from "@/shared/assets/exercise-art";

/** One line-art frame, recolored via a CSS mask: the SVGs are plain white
 *  strokes on transparent, so the mask lets us paint them in the brand
 *  primary in light mode and keep them white in dark mode. */
function ArtMask({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block bg-primary dark:bg-white", className)}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

// start → mid → end → mid, so the three frames read as one continuous motion.
const FRAME_ORDER = [0, 1, 2, 1] as const;
const FRAME_MS = 650;

// One shared clock for every animation on screen (a picker can show 30+ at
// once). It only runs while something is subscribed, and never runs at all
// for people who prefer reduced motion — they see the first frame.
let step = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (timer === undefined && !reducedMotion) {
    timer = window.setInterval(() => {
      step = (step + 1) % FRAME_ORDER.length;
      listeners.forEach((l) => l());
    }, FRAME_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

const getFrameIndex = () => FRAME_ORDER[step];
const getServerFrameIndex = () => 0;

/** A catalog exercise's three-frame illustration, looping continuously (the
 *  files stay SVG). All frames stay mounted and only opacity changes, so
 *  there's no flash while the next SVG loads. `label` is the accessible name;
 *  without it the art is decorative and hidden from assistive tech.
 *
 *  `still` shows just the first frame (no loop, no timer, one file loaded) —
 *  used for list thumbnails such as the equipment and cardio pickers. */
export function ExerciseArt({
  slug,
  label,
  className,
  still = false,
}: {
  /** Art slug — the folder under `public/exercise-art/`. */
  slug: string;
  label?: string;
  className?: string;
  still?: boolean;
}) {
  if (still) {
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("block", className)}
      >
        <ArtMask src={exerciseArtFrame(slug, 1)} className="h-full w-full" />
      </span>
    );
  }
  return <AnimatedArt slug={slug} label={label} className={className} />;
}

function AnimatedArt({
  slug,
  label,
  className,
}: {
  slug: string;
  label?: string;
  className?: string;
}) {
  const active = useSyncExternalStore(subscribe, getFrameIndex, getServerFrameIndex);

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative block", className)}
    >
      {([1, 2, 3] as const).map((frame, i) => (
        <ArtMask
          key={frame}
          src={exerciseArtFrame(slug, frame)}
          className={cn("absolute inset-0 h-full w-full", i === active ? "opacity-100" : "opacity-0")}
        />
      ))}
    </span>
  );
}
