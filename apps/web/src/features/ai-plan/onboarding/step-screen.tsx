"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";

/** Shared layout for one onboarding question screen: title/subtitle, the
 *  question's own content, and a bottom action row. Continue sits inline
 *  (not fixed) so it never overlaps the app's bottom nav on mobile.
 *
 *  The chevron in the shell header is the only way back on phone; from
 *  tablet up that chevron is hidden (see AboutYouShell/TrainingPreferencesShell)
 *  and a Back button — same bordered/bg-card look as the Messages FAB
 *  (`shared/components/atoms/…/messages-fab.tsx`), but sharing Continue's own
 *  radius and taking equal width — appears here instead, before Continue. */
export function StepScreen({
  title,
  subtitle,
  children,
  continueLabel,
  onContinue,
  continueDisabled,
  onBack,
  secondaryAction,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled: boolean;
  onBack: () => void;
  /** A muted text-link action below Continue (e.g. "Not Now"), for screens
   *  with a skip-this-question path distinct from the Back button. */
  secondaryAction?: { label: string; onClick: () => void };
}) {
  const { t } = useTranslation("onboarding");
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">{children}</div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="hidden flex-1 shadow-lg md:inline-flex"
          >
            {t("back")}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={continueDisabled}
            onClick={onContinue}
          >
            {continueLabel}
          </Button>
        </div>
        {secondaryAction && (
          <Button
            type="button"
            variant="ghost"
            onClick={secondaryAction.onClick}
            className="text-muted-foreground"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
