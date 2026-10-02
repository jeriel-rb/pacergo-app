"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "next/navigation";
import {
  ONBOARDING_STEPS,
  isPlanGender,
  trainingDaysComplete,
  type OnboardingAnswers,
  type OnboardingStepId,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { ABOUT_YOU_STEPS, type AboutYouStep } from "./about-you-steps";
import { GYM_EQUIPMENT_STEPS } from "./gym-equipment-steps";
import {
  TRAINING_PREFERENCES_STEPS,
  type TrainingPreferencesStep,
} from "./training-preferences-steps";

/** First question in a section the saved profile doesn't answer yet — e.g. a
 *  user from before the gender or weekday steps lands straight on that one
 *  instead of re-answering everything. */
function firstUnansweredAboutYouStep(answers: OnboardingAnswers): AboutYouStep {
  if (!answers.goal) return "goal";
  if (!answers.obstacle) return "obstacle";
  if (!isPlanGender(answers.gender)) return "gender";
  if (!answers.age) return "age";
  if (!answers.heightCm || !answers.weightKg) return "height-weight";
  if (!answers.activityLevel) return "activity-level";
  return ABOUT_YOU_STEPS[0];
}

function firstUnansweredTrainingStep(tp: TrainingPreferencesAnswers): TrainingPreferencesStep {
  if (!tp.experience) return "experience";
  if (!trainingDaysComplete(tp.daysPerWeek, tp.trainingDays)) return "days-per-week";
  return TRAINING_PREFERENCES_STEPS[0];
}

/** "Let's Get Started" (`/ai-plan/setup`). Onboarding not done → the next
 *  section. Done → never a dead end: open the active plan, or (plan missing)
 *  build one straight from the saved answers. Finished sections can be
 *  reopened to adjust any answer. */
export function HubView({ activePlanId }: { activePlanId: string | null }) {
  const { t } = useTranslation("onboarding");
  const { answers, trainingPreferences, completedSteps, generatedPlan, hasSavedProfile, resetForUpdate } =
    useOnboarding();
  const pathname = usePathname();
  const router = useRouter();
  const root = pathname.replace(/\/setup\/?$/, ""); // ".../ai-plan"

  // -1 once every step is complete — no step is "active" then.
  const activeIndex = !completedSteps.aboutYou
    ? 0
    : !completedSteps.trainingPreferences
      ? 1
      : !completedSteps.gymEquipment
        ? 2
        : -1;
  const nextStep = activeIndex >= 0 ? ONBOARDING_STEPS[activeIndex] : null;
  const allDone = activeIndex < 0;

  function sectionPath(step: OnboardingStepId): string {
    return step === "aboutYou"
      ? `about-you/${firstUnansweredAboutYouStep(answers)}`
      : step === "trainingPreferences"
        ? `training-preferences/${firstUnansweredTrainingStep(trainingPreferences)}`
        : `gym-equipment/${GYM_EQUIPMENT_STEPS[0]}`;
  }

  function onCta() {
    if (nextStep) router.push(`${root}/${sectionPath(nextStep)}`);
  }

  /** A finished section, reopened from its first question to adjust it. */
  function editSection(step: OnboardingStepId) {
    const first =
      step === "aboutYou"
        ? `about-you/${ABOUT_YOU_STEPS[0]}`
        : step === "trainingPreferences"
          ? `training-preferences/${TRAINING_PREFERENCES_STEPS[0]}`
          : `gym-equipment/${GYM_EQUIPMENT_STEPS[0]}`;
    router.push(`${root}/${first}`);
  }

  // Every plan build goes through the one AI-recommended split first.
  const buildPlan = () => router.push(`${root}/recommended-split`);

  // Negative margins cancel AppShell's own asymmetric main padding
  // (pt-4/pb-28 below lg, pt-10/pb-16 at lg+) so this centers vertically
  // against the true available height on every breakpoint — full-height on
  // phone (AppHeader is hidden here, see AppHeader's onAiPlanFlow check),
  // minus the 3.5rem sticky header once it reappears at md+.
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 -mt-4 -mb-28 min-h-dvh justify-center md:min-h-[calc(100dvh-3.5rem)] lg:-mt-10 lg:-mb-16">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight">
            {t("hub.title")}
          </h1>
          <BetaBadge />
        </div>
        <p className="text-muted-foreground">{t("hub.subtitle")}</p>
        {!allDone && <p className="text-sm text-muted-foreground">{t("hub.why")}</p>}
        {hasSavedProfile && !generatedPlan && (
          <p className="text-sm text-muted-foreground">{t("hub.prefilled")}</p>
        )}
      </div>

      <ol className="space-y-0">
        {ONBOARDING_STEPS.map((step, i) => (
          <StepRow
            key={step}
            step={step}
            index={i}
            state={
              completedSteps[step]
                ? "done"
                : i === activeIndex
                  ? "active"
                  : "locked"
            }
            isLast={i === ONBOARDING_STEPS.length - 1}
            onEdit={completedSteps[step] ? () => editSection(step) : undefined}
          />
        ))}
      </ol>

      {allDone ? (
        <div className="space-y-3">
          {activePlanId ? (
            <>
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("hub.allDone")}
              </p>
              <Button size="lg" className="w-full" onClick={() => router.push(`${root}/plan/${activePlanId}`)}>
                {t("hub.cta.viewPlan")}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={buildPlan}>
                {t("hub.cta.newPlan")}
              </Button>
            </>
          ) : (
            <>
              {/* Recovery: setup is done but no plan exists (never saved,
                  or deleted) — rebuild it from the saved answers. */}
              <p className="text-center text-sm text-muted-foreground">{t("hub.missingPlan")}</p>
              <Button size="lg" className="w-full" onClick={buildPlan}>
                {t("hub.cta.createFromProfile")}
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => {
              resetForUpdate();
              router.push(`${root}/about-you/${ABOUT_YOU_STEPS[0]}`);
            }}
          >
            {t("hub.cta.review")}
          </Button>
        </div>
      ) : (
        <Button size="lg" className="w-full" onClick={onCta}>
          {nextStep === "aboutYou"
            ? t("hub.cta.start")
            : t("hub.cta.goTo", { step: t(`hub.steps.${nextStep}.title`) })}
        </Button>
      )}
    </div>
  );
}

function StepRow({
  step,
  index,
  state,
  isLast,
  onEdit,
}: {
  step: OnboardingStepId;
  index: number;
  state: "done" | "active" | "locked";
  isLast: boolean;
  /** Finished sections can be reopened to adjust their answers. */
  onEdit?: () => void;
}) {
  const { t } = useTranslation("onboarding");
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-5 top-10 bottom-0 w-0.5 -translate-x-1/2 bg-border"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          state === "done" && "bg-primary text-primary-foreground",
          state === "active" && "bg-primary text-primary-foreground",
          state === "locked" && "bg-muted text-muted-foreground",
        )}
      >
        {state === "done" ? <Check size={18} /> : index + 1}
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <p
          className={cn(
            "text-base font-semibold",
            state === "locked" && "text-muted-foreground",
          )}
        >
          {t(`hub.steps.${step}.title`)}
        </p>
        {state === "active" && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`hub.steps.${step}.description`)}
          </p>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1 h-8 shrink-0 rounded-full px-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          {t("hub.edit")}
        </button>
      )}
    </li>
  );
}
