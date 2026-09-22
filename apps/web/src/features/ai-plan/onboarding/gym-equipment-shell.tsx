"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgressBar } from "@/shared/components/atoms/progress-bar";
import { useGymEquipmentNav } from "./gym-equipment-steps";

/** Shared chrome for the 4 "Gym & Equipment" sub-screens — same pattern as
 *  AboutYouShell/TrainingPreferencesShell: phone-only back chevron + step
 *  title, step-N-of-4 progress bar; tablet up uses StepScreen's pill Back
 *  button instead. */
export function GymEquipmentShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("onboarding");
  const { index, total, goBack } = useGymEquipmentNav();
  const progress = ((index + 1) / total) * 100;

  // See AboutYouShell for why: cancels AppShell's asymmetric main padding
  // so this centers against the true remaining viewport height.
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 md:-mt-4 md:-mb-28 md:min-h-[calc(100dvh-3.5rem)] md:justify-center lg:-mt-10 lg:-mb-16">
      <div className="space-y-3">
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={goBack}
            aria-label={t("back")}
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold">
            {t("hub.steps.gymEquipment.title")}
          </h1>
          <span className="w-9" aria-hidden />
        </div>
        <h1 className="hidden text-lg font-semibold md:block">
          {t("hub.steps.gymEquipment.title")}
        </h1>
        <ProgressBar value={progress} />
      </div>
      {children}
    </div>
  );
}
