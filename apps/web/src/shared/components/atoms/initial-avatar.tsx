"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Circular avatar. Falls back to the first character of `name` on a soft blue
 * field when no photo is set, or when a set photo URL fails to actually load
 * (deleted/missing storage object) — matching the lettered avatars in the
 * designs either way.
 */
export function InitialAvatar({
  name,
  src,
  size = 56,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0) || "?";
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-accent font-semibold text-primary",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </span>
  );
}
