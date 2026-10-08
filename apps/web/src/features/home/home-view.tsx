"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  ClipboardList,
  Apple,
  UserCog,
  ClipboardCheck,
  HeartPulse,
  Wand2,
  Utensils,
  Zap,
} from "lucide-react";
import type { ProfileSetupState, TrainerSummary, UserProfile } from "@pacergo/shared";
import type { WeeklyProgress } from "@/lib/goals";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import { HeroBanner } from "./hero-banner";
import { QuickActionsGrid, type QuickAction } from "./quick-actions-grid";
import { ToolsList, type ToolItem } from "./tools-list";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { ProfileSetupDialog } from "./profile-setup-dialog";
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

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

export function HomeView({
  trainers,
  user,
  savedIds,
  weeklyProgress,
  profileSetup,
  hasActivePlan = false,
}: {
  trainers: TrainerSummary[];
  user: UserProfile | null;
  savedIds?: string[];
  weeklyProgress: WeeklyProgress;
  /** First-run Profile Setup state; the dialog shows only when never answered. */
  profileSetup?: ProfileSetupState | null;
  /** Signed-in user already has an AI training plan. */
  hasActivePlan?: boolean;
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

  const primaryActions: QuickAction[] = [
    {
      icon: Sparkles,
      label: t("actions.aiPlan"),
      tint: "bg-violet-500/10 text-violet-500",
      // With any saved plan, land on My Plans (pick one, or start a new one
      // there). Without one, /ai-plan resumes an interrupted build or opens setup.
      href: getLocalizedPath(hasActivePlan ? "/ai-plan/my-plans" : "/ai-plan", locale),
    },
    {
      icon: ClipboardList,
      label: t("actions.myPlans"),
      tint: "bg-blue-500/10 text-blue-500",
      href: getLocalizedPath("/ai-plan/my-plans", locale),
    },
    {
      icon: Apple,
      label: t("actions.nutrition"),
      tint: "bg-emerald-500/10 text-emerald-500",
      href: getLocalizedPath("/ai-plan/nutrition", locale),
    },
    {
      icon: UserCog,
      label: t("actions.fitnessProfile"),
      tint: "bg-amber-500/10 text-amber-500",
      href: getLocalizedPath("/ai-plan/fitness-profile", locale),
    },
  ];

  const tools: ToolItem[] = [
    { icon: ClipboardCheck, label: t("quick.record"), tint: "bg-blue-500/10 text-blue-500" },
    { icon: HeartPulse, label: t("quick.body"), tint: "bg-sky-500/10 text-sky-500" },
    { icon: Wand2, label: t("quick.aiPhoto"), tint: "bg-fuchsia-500/10 text-fuchsia-500" },
    { icon: Utensils, label: t("quick.diet"), tint: "bg-emerald-500/10 text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Only while something is still unknown: anything the fitness profile or
          the account already holds is never asked again. */}
      {user &&
        profileSetup &&
        profileSetup.status === null &&
        !(profileSetup.primaryActivity && profileSetup.experience && profileSetup.city) && (
          <ProfileSetupDialog initial={profileSetup} />
        )}

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

      {/* Next step for a signed-in user with no AI plan yet. Setup answers
          from the dialog are already filled in on the way. */}
      {user && !hasActivePlan && (
        <Link
          href={getLocalizedPath("/ai-plan", locale)}
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <Sparkles size={20} className="shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("buildPlan.title")}</p>
            <p className="text-xs text-muted-foreground">{t("buildPlan.body")}</p>
          </div>
        </Link>
      )}

      {/* Dashboard. Desktop: hero + actions (left), sticky personal rail (right),
          recommended trainers below-left. Mobile: a single stacked column in
          DOM order — hero, actions, rail, recommended. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <HeroBanner
            href={trainersHref}
            title={t("hero.title")}
            subtitle={t("hero.subtitle", { count: trainers.length })}
            cta={t("hero.cta")}
          />

          <Card className="p-4 sm:p-5">
            <SectionLabel title={t("quickActions")} />
            <QuickActionsGrid items={primaryActions} className="mt-4" />
          </Card>
        </div>

        <aside className="space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-8">
          <WeeklyProgressCard
            title={t("weeklyProgress")}
            target={weeklyProgress.target}
            done={weeklyProgress.done}
            planHref={
              weeklyProgress.planId
                ? getLocalizedPath(`/ai-plan/plan/${weeklyProgress.planId}`, locale)
                : null
            }
          />

          <Card className="p-4 sm:p-5">
            <SectionLabel title={t("tools")} />
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
          <RecommendedTrainers trainers={trainers} savedIds={savedIds} />
        </div>
      </div>
    </div>
  );
}
