"use client";

import Link from "next/link";
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
} from "lucide-react";
import type {
  BookingRecord,
  ProfileSetupState,
  TrainerSummary,
  UserProfile,
} from "@pacergo/shared";
import type { WeeklyProgress } from "@/lib/goals";
import { Card } from "@/shared/components/ui/card";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import { HeroBanner } from "./hero-banner";
import { QuickActionsGrid, type QuickAction } from "./quick-actions-grid";
import { ToolsList, type ToolItem } from "./tools-list";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { ProfileSetupDialog } from "./profile-setup-dialog";
import { RecommendedTrainers } from "./recommended-trainers";
import { RecentBookings } from "./recent-bookings";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { PAGE_GAP } from "@/shared/components/shell/app-shell";
import { useLocale } from "@/shared/hooks/use-locale";

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
  recentBookings = [],
}: {
  trainers: TrainerSummary[];
  user: UserProfile | null;
  savedIds?: string[];
  /** The signed-in user's latest bookings (either side), newest first. */
  recentBookings?: BookingRecord[];
  weeklyProgress: WeeklyProgress;
  /** First-run Profile Setup state; the dialog shows only when never answered. */
  profileSetup?: ProfileSetupState | null;
  /** Signed-in user already has an AI training plan. */
  hasActivePlan?: boolean;
}) {
  const { t } = useTranslation(["home", "common"]);
  const locale = useLocale();

  const name = user?.display_name?.split(" ")[0] || t("guest");
  const trainersHref = getLocalizedPath("/trainers", locale);

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
    <div className={cn("flex flex-col", PAGE_GAP)}>
      {/* Only while something is still unknown: anything the fitness profile or
          the account already holds is never asked again. */}
      {user &&
        profileSetup &&
        profileSetup.status === null &&
        !(profileSetup.primaryActivity && profileSetup.experience && profileSetup.city) && (
          <ProfileSetupDialog initial={profileSetup} />
        )}

      {/* Greeting */}
      <header className="min-w-0">
        <h1 className="text-2xl font-bold lg:text-3xl">
          {t("greeting", { name })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("prompt")}</p>
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
      <div className={cn("grid grid-cols-1 lg:grid-cols-3", PAGE_GAP)}>
        <div className={cn("flex flex-col lg:col-span-2 lg:col-start-1 lg:row-start-1", PAGE_GAP)}>
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

          {user && (
            <RecentBookings bookings={recentBookings} currentUserId={user.id} />
          )}
        </div>

        {/* Sticks at the page's top padding (lg:pt-10), so it lines up with the gutters. */}
        <aside
          className={cn(
            "flex flex-col lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-10",
            PAGE_GAP,
          )}
        >
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
