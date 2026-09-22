"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "next/navigation";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { ABOUT_YOU_STEPS } from "./about-you-steps";
import { GYM_EQUIPMENT_STEPS } from "./gym-equipment-steps";
import { TRAINING_PREFERENCES_STEPS } from "./training-preferences-steps";

export function HubView() {
  const { t } = useTranslation("onboarding");
  const { completedSteps } = useOnboarding();
  const pathname = usePathname();
  const router = useRouter();

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

  function onCta() {
    const base = pathname.replace(/\/$/, "");
    const target =
      nextStep === "aboutYou"
        ? `about-you/${ABOUT_YOU_STEPS[0]}`
        : nextStep === "trainingPreferences"
          ? `training-preferences/${TRAINING_PREFERENCES_STEPS[0]}`
          : `gym-equipment/${GYM_EQUIPMENT_STEPS[0]}`;
    router.push(`${base}/${target}`);
  }

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
          />
        ))}
      </ol>

      {allDone ? (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {t("hub.allDone")}
        </p>
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
}: {
  step: OnboardingStepId;
  index: number;
  state: "done" | "active" | "locked";
  isLast: boolean;
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
    </li>
  );
}
