"use client";

import { useTranslation } from "react-i18next";
import {
  ageFromBirthdate,
  earliestBirthdateForAge,
  latestBirthdateForAge,
} from "@pacergo/shared";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const MIN_AGE = 13;
const MAX_AGE = 100;

function parseIso(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Asks for a birthdate; age for the plan and nutrition is derived from it. */
export function AgeView() {
  const { t } = useTranslation("onboarding");
  const { answers, setBirthdate } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  const age = answers.birthdate ? ageFromBirthdate(answers.birthdate) : answers.age;
  const minDate = parseIso(earliestBirthdateForAge(MAX_AGE));
  const maxDate = parseIso(latestBirthdateForAge(MIN_AGE));

  return (
    <StepScreen
      title={t("age.title")}
      continueLabel={t("continue")}
      continueDisabled={age === null || age < MIN_AGE || age > MAX_AGE}
      onContinue={goNext}
      onBack={goBack}
    >
      <div className="rounded-2xl bg-muted p-4">
        <p className="text-sm text-muted-foreground">{t("age.hint")}</p>
      </div>

      <DatePicker
        date={parseIso(answers.birthdate)}
        onChange={(d) => setBirthdate(d ? toIso(d) : null)}
        minDate={minDate}
        maxDate={maxDate}
        placeholder={t("age.placeholder")}
        aria-label={t("age.title")}
      />

      {age !== null && (
        <p className="text-center text-sm text-muted-foreground">
          {age} {t("age.suffix")}
        </p>
      )}
    </StepScreen>
  );
}
