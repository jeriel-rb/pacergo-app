"use client";

import { AboutYouShell } from "@/features/ai-plan/onboarding/about-you-shell";

export default function AboutYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AboutYouShell>{children}</AboutYouShell>;
}
