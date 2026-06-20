import { cn } from "@/lib/utils";

/**
 * Circular avatar. Falls back to the first character of `name` on a soft blue
 * field when no photo is set — matching the lettered avatars in the designs.
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
  const initial = name.trim().charAt(0) || "?";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
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
