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
import type { TrainerSummary } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { HeroBanner } from "./hero-banner";
import { QuickActionsGrid, type QuickAction } from "./quick-actions-grid";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { RecommendedTrainers } from "./recommended-trainers";

const USER_NAME = "Jeriel";

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

export function HomeView({ trainers }: { trainers: TrainerSummary[] }) {
  const { t, i18n } = useTranslation(["home", "trainer"]);
  const locale = i18n.language.startsWith("zh") ? "zh" : "en";
  const weekdays = t("trainer:weekdaysShort", {
    returnObjects: true,
  }) as string[];

  // Render the date only after mount so SSR (build time) and client agree.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(formatHeaderDate(new Date(), locale, weekdays));
  }, [locale, weekdays]);

  const primaryActions: QuickAction[] = [
    { icon: Users, label: t("actions.find"), tint: "bg-blue-500/10 text-blue-500" },
    { icon: LineChart, label: t("actions.log"), tint: "bg-indigo-500/10 text-indigo-500" },
    { icon: Sparkles, label: t("actions.aiPlan"), tint: "bg-violet-500/10 text-violet-500" },
    { icon: Ticket, label: t("actions.hours"), tint: "bg-emerald-500/10 text-emerald-500" },
  ];

  const quickActions: QuickAction[] = [
    { icon: ClipboardCheck, label: t("quick.record"), tint: "bg-blue-500/10 text-blue-500" },
    { icon: HeartPulse, label: t("quick.body"), tint: "bg-sky-500/10 text-sky-500" },
    { icon: Wand2, label: t("quick.aiPhoto"), tint: "bg-fuchsia-500/10 text-fuchsia-500" },
    { icon: Utensils, label: t("quick.diet"), tint: "bg-emerald-500/10 text-emerald-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{today || " "}</p>
          <h1 className="mt-0.5 text-2xl font-bold">
            {t("greeting", { name: USER_NAME })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("prompt")}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-full">
          <Zap size={14} />
          {t("switchTrainer")}
        </Button>
      </div>

      <HeroBanner
        kicker={t("hero.kicker")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />

      <Card className="p-4">
        <QuickActionsGrid items={primaryActions} />
      </Card>

      <WeeklyProgressCard
        title={t("weeklyProgress")}
        subtitleEn={t("weeklyProgressEn")}
        percent={0}
        countLabel={t("weeklyCount", { done: 0, total: 5 })}
      />

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold">{t("quickActions")}</h2>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("quickActionsEn")}
          </p>
        </div>
        <QuickActionsGrid items={quickActions} />
      </div>

      <RecommendedTrainers trainers={trainers} />
    </div>
  );
}
