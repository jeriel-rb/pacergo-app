"use client";

import { useTranslation } from "react-i18next";

export function Marquee() {
  const { t } = useTranslation("home");
  const activities = t("activities", { returnObjects: true }) as string[];

  // Render the list twice so the -50% translate loops seamlessly.
  const track = [...activities, ...activities];

  return (
    <section
      aria-label={t("activities_label")}
      className="border-y border-ink/10 bg-ink py-5 text-paper"
    >
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {track.map((activity, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className="font-display text-xl font-medium tracking-tight text-paper/85">
                {activity}
              </span>
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
