"use client";

import { useTranslation } from "react-i18next";
import { ageFromBirthdate } from "@pacergo/shared";
import {
  BirthdateWheel,
  defaultBirthdate,
} from "@/shared/components/atoms/birthdate-wheel";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const MIN_AGE = 13;
const MAX_AGE = 100;
const DEFAULT_AGE = 21;

/** Asks for a birthdate; age for the plan and nutrition is derived from it. */
export function AgeView() {
  const { t } = useTranslation("onboarding");
  const { answers, setBirthdate } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  const birthdate = answers.birthdate ?? defaultBirthdate(DEFAULT_AGE);
  const age = ageFromBirthdate(birthdate);

  return (
    <StepScreen
      title={t("age.title")}
      continueLabel={t("continue")}
      continueDisabled={age === null || age < MIN_AGE || age > MAX_AGE}
      onContinue={() => {
        if (answers.birthdate === null) setBirthdate(birthdate);
        goNext();
      }}
      onBack={goBack}
    >
      <div className="rounded-2xl bg-muted p-4">
        <p className="text-sm text-muted-foreground">{t("age.hint")}</p>
      </div>

      <BirthdateWheel
        value={answers.birthdate}
        onChange={setBirthdate}
        minAge={MIN_AGE}
        maxAge={MAX_AGE}
        defaultAge={DEFAULT_AGE}
        ariaLabel={t("age.title")}
      />

      {age !== null && (
        <p className="text-center text-sm text-muted-foreground">
          {age} {t("age.suffix")}
        </p>
      )}
    </StepScreen>
  );
}
