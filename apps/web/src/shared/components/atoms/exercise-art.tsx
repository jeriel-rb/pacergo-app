"use client";

import { cn } from "@/lib/utils";
import { exerciseArtFrame } from "@/shared/assets/exercise-art";

/** One exercise's static line-art illustration, recolored via a CSS mask: the
 *  SVGs are plain white strokes on transparent, so the mask lets us paint them
 *  in the brand primary in light mode and keep them white in dark mode.
 *  `label` is the accessible name; without it the art is decorative and hidden
 *  from assistive tech. */
export function ExerciseArt({
  slug,
  label,
  className,
}: {
  /** Art slug — the folder under `public/exercise-art/`. */
  slug: string;
  label?: string;
  className?: string;
}) {
  const src = exerciseArtFrame(slug);
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block", className)}
    >
      <span
        aria-hidden
        className="block h-full w-full bg-primary dark:bg-white"
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
    </span>
  );
}
