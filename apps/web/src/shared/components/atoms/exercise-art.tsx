"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { exerciseArtFrame, exerciseArtFrameCount } from "@/shared/assets/exercise-art";

const FRAME_MS = 280;

/** One exercise's line-art illustration, recolored via a CSS mask: the SVGs
 *  are plain white strokes on transparent, so the mask paints them in the
 *  brand primary (light) or white (dark). Pass `animate` to cycle every SVG
 *  frame when the slug has more than one. `label` is the accessible name;
 *  without it the art is decorative and hidden from assistive tech. */
export function ExerciseArt({
  slug,
  label,
  className,
  animate = false,
}: {
  /** Art slug — the folder under `public/exercise-art/`. */
  slug: string;
  label?: string;
  className?: string;
  /** Cycle all synced frames. Thumbnails leave this off. */
  animate?: boolean;
}) {
  const frameCount = exerciseArtFrameCount(slug);
  const [frame, setFrame] = React.useState(1);

  React.useEffect(() => {
    setFrame(1);
  }, [slug]);

  React.useEffect(() => {
    if (!animate || frameCount <= 1) return;
    const id = window.setInterval(() => {
      setFrame((n) => (n >= frameCount ? 1 : n + 1));
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [animate, frameCount, slug]);

  const src = exerciseArtFrame(slug, animate ? frame : 1);
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
