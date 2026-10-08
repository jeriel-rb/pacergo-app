"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { focusSequence, recommendSplit, resolveTrainingDays } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/shared/hooks/use-locale";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";

/** One AI-recommended weekly structure (the MVP replacement for picking from
 *  three fixed splits). Shown after Gym & Equipment, when every input it
 *  depends on is known: frequency, selected days, experience, goal, session
 *  length and equipment. "Use This Plan" generates; "Adjust Settings" goes
 *  back to setup to change any input. */
export function RecommendedSplitView() {
  const { t } = useTranslation(["onboarding", "plan"]);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { answers, trainingPreferences, gymEquipment, setWorkoutSplit } = useOnboarding();
  const root = pathname.replace(/\/recommended-split$/, "");

  const rec = recommendSplit({ answers, trainingPreferences, gymEquipment });
  const days = new Set(resolveTrainingDays(trainingPreferences.daysPerWeek ?? "3", trainingPreferences.trainingDays));
  const sequence = focusSequence(rec.split, () => rec.split);
  let trainingIndex = 0;
  const week = Array.from({ length: 7 }, (_, d) =>
    days.has(d) ? sequence[trainingIndex++ % sequence.length]! : null,
  );

  // Lower-case the inline labels in English ("advanced training experience").
  const inline = (s: string) => (locale === "en" ? s.toLowerCase() : s);
  const reason = t("split.recommended.reason", {
    days: rec.daysPerWeek,
    experience: inline(t(`trainingPreferences.experience.options.${rec.experience}.title`)),
    goal: inline(rec.goal ? t(`goal.options.${rec.goal}.title`) : t("goal.options.stay_healthy.title")),
  });
  const notes = [
    rec.consecutiveDays && t("split.recommended.consecutive"),
    rec.limitedEquipment && t("split.recommended.limited"),
    rec.shortSessions && t("split.recommended.short"),
  ].filter((n): n is string => Boolean(n));

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-4">
      <h1 className="text-lg font-semibold">{t("split.recommended.title")}</h1>

      <section className="space-y-3 rounded-2xl border-2 border-primary bg-primary/5 p-5">
        <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
          {t("split.recommended.badge")}
        </span>
        <p className="text-2xl font-extrabold">{t(`split.names.${rec.split}`)}</p>
        <p className="text-sm text-muted-foreground">{reason}</p>
        {notes.map((n) => (
          <p key={n} className="text-sm text-muted-foreground">
            {n}
          </p>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("split.recommended.weekPreview")}</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((focus, d) => (
            <div
              key={d}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center",
                focus ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <span className="text-xs font-semibold">{t(`trainingPreferences.trainingDays.days.${d}`)}</span>
              <span className="text-[10px] leading-tight">
                {focus ? t(`overview.focus.${focus}`, { ns: "plan" }) : t("split.recommended.rest")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setWorkoutSplit(rec.split);
            router.push(`${root}/creating-plan`);
          }}
        >
          {t("split.recommended.use")}
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={() => router.push(`${root}/setup`)}>
          {t("split.recommended.adjust")}
        </Button>
      </div>
    </div>
  );
}
