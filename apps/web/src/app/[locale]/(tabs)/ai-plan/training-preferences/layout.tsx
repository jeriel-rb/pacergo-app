"use client";

import { TrainingPreferencesShell } from "@/features/ai-plan/onboarding/training-preferences-shell";

export default function TrainingPreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TrainingPreferencesShell>{children}</TrainingPreferencesShell>;
}
