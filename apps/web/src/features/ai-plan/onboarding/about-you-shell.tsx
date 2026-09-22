"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgressBar } from "@/shared/components/atoms/progress-bar";
import { useAboutYouNav } from "./about-you-steps";

/** Shared chrome for all 6 "About You" sub-screens: step title and
 *  step-N-of-6 progress bar. Renders inside the normal tabs <main> column —
 *  the app's sidebar/bottom-nav stay visible around it, this only owns the
 *  content area. The header row's chevron is the phone-only way back
 *  (matches the app's mobile top bar being hidden on this route, see
 *  AppHeader); from tablet up, StepScreen's own pill Back button next to
 *  Continue replaces it. */
export function AboutYouShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("onboarding");
  const { index, total, goBack } = useAboutYouNav();
  const progress = ((index + 1) / total) * 100;

  // md:/lg: negative margins cancel out AppShell's own asymmetric
  // pt-4/pb-28 (md) and pt-10/pb-16 (lg) main padding, so this block can be
  // sized against the true remaining viewport height (100dvh minus the
  // 3.5rem sticky AppHeader) and centered evenly, not lopsided toward the
  // bottom by inherited padding meant for other tab pages.
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
            {t("aboutYou.title")}
          </h1>
          <span className="w-9" aria-hidden />
        </div>
        <h1 className="hidden text-lg font-semibold md:block">
          {t("aboutYou.title")}
        </h1>
        <ProgressBar value={progress} />
      </div>
      {children}
    </div>
  );
}
