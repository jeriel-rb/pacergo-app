import { cn } from "@/lib/utils";

/** Monospaced eyebrow label with a leading brand tick. Used above section headings. */
export function SectionLabel({
  children,
  className,
  tone = "ink",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "ink" | "paper";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.22em]",
        tone === "ink" ? "text-ink/55" : "text-paper/55",
        className,
      )}
    >
      <span className="h-px w-6 bg-brand" />
      {children}
    </span>
  );
}
