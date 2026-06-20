import { cn } from "@/lib/utils";

/** Blue brand gradient surface (hero banner, trainer detail header). */
export function GradientHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden text-white", className)}
      style={{
        backgroundImage: "linear-gradient(135deg, var(--hero-from), var(--hero-to))",
      }}
    >
      {children}
    </div>
  );
}
