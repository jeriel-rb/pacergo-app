"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  LineChart,
  Sparkles,
  Ticket,
  ClipboardCheck,
  HeartPulse,
  Wand2,
  Utensils,
  Zap,
} from "lucide-react";
import type { TrainerSummary, UserProfile } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import { HeroBanner } from "./hero-banner";
import { QuickActionsGrid, type QuickAction } from "./quick-actions-grid";
import { ToolsList, type ToolItem } from "./tools-list";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { RecommendedTrainers } from "./recommended-trainers";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";

function formatHeaderDate(
  date: Date,
  locale: "zh" | "en",
  weekdays: string[],
): string {
  if (locale === "zh") {
    return `${date.getMonth() + 1}月${date.getDate()}日${weekdays[date.getDay()] ?? ""}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Section heading with a small uppercase English sublabel. */
function SectionLabel({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

export function HomeView({
  trainers,
  user,
}: {
  trainers: TrainerSummary[];
  user: UserProfile | null;
}) {
  const { t } = useTranslation(["home", "trainer", "common"]);
  const locale = useLocale();
  const weekdays = t("trainer:weekdaysShort", {
    returnObjects: true,
  }) as string[];

  const name = user?.display_name?.split(" ")[0] || t("guest");
  const trainersHref = getLocalizedPath("/trainers", locale);

  // Render the date only after mount so SSR (build time) and client agree.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(formatHeaderDate(new Date(), locale, weekdays));
  }, [locale, weekdays]);

  // Only "Find" is live today; the rest are flagged until their features land.
  const primaryActions: QuickAction[] = [
    {
      icon: Users,
      label: t("actions.find"),
      tint: "bg-gradient-to-br from-primary/20 to-indigo-500/10 text-primary",
      href: trainersHref,
    },
    { icon: LineChart, label: t("actions.log"), tint: "bg-blue-500/10 text-blue-500", soon: true },
    { icon: Sparkles, label: t("actions.aiPlan"), tint: "bg-violet-500/10 text-violet-500", soon: true },
    { icon: Ticket, label: t("actions.hours"), tint: "bg-emerald-500/10 text-emerald-500", soon: true },
  ];

  const tools: ToolItem[] = [
    { icon: ClipboardCheck, label: t("quick.record"), tint: "bg-blue-500/10 text-blue-500" },
    { icon: HeartPulse, label: t("quick.body"), tint: "bg-sky-500/10 text-sky-500" },
    { icon: Wand2, label: t("quick.aiPhoto"), tint: "bg-fuchsia-500/10 text-fuchsia-500" },
    { icon: Utensils, label: t("quick.diet"), tint: "bg-emerald-500/10 text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {today || " "}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold lg:text-3xl">
            {t("greeting", { name })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("prompt")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="relative shrink-0 gap-1.5 rounded-full"
        >
          <Zap size={14} />
          {t("switchTrainer")}
          <SoonBadge className="absolute -right-2 -top-2" />
        </Button>
      </header>

      {/* Dashboard. Desktop: hero + actions (left), sticky personal rail (right),
          recommended trainers below-left. Mobile: a single stacked column in
          DOM order — hero, actions, rail, recommended. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <HeroBanner
            href={trainersHref}
            kicker={t("hero.kicker")}
            title={t("hero.title")}
            subtitle={t("hero.subtitle")}
            cta={t("hero.cta")}
          />

          <Card className="p-4 sm:p-5">
            <SectionLabel title={t("quickActions")} sub={t("quickActionsEn")} />
            <QuickActionsGrid items={primaryActions} className="mt-4" />
          </Card>
        </div>

        <aside className="space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-8">
          <WeeklyProgressCard
            title={t("weeklyProgress")}
            subtitleEn={t("weeklyProgressEn")}
            percent={0}
            countLabel={t("weeklyCount", { done: 0, total: 5 })}
            soon
          />

          <Card className="p-4 sm:p-5">
            <SectionLabel title={t("tools")} sub={t("toolsEn")} />
            <ToolsList items={tools} />
          </Card>

          <Card className="relative p-5">
            <SoonBadge className="absolute right-4 top-4" />
            <p className="font-semibold">{t("myTrainer")}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("myTrainerHint")}
            </p>
          </Card>
        </aside>

        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <RecommendedTrainers trainers={trainers} />
        </div>
      </div>
    </div>
  );
}
