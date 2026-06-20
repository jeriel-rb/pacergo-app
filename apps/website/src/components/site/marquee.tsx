"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function Marquee() {
  const { t } = useTranslation("home");
  const activities = t("activities", { returnObjects: true }) as string[];

  const items = [
    ...activities.map((label) => ({ label, more: false })),
    { label: t("activities_more"), more: true },
  ];
  // Render twice so the -50% translate loops seamlessly.
  const track = [...items, ...items];

  return (
    <section
      aria-label={t("activities_label")}
      className="border-y border-ink/10 bg-ink py-5 text-paper"
    >
      <div className="relative flex overflow-hidden mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {track.map((item, i) => (
            <span key={i} className="flex items-center gap-10">
              <span
                className={cn(
                  "font-display text-xl font-medium tracking-tight",
                  item.more ? "text-brand" : "text-paper/85",
                )}
              >
                {item.label}
              </span>
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
