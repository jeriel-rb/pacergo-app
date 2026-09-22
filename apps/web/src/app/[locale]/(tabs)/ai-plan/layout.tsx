import { getCurrentProfile } from "@/lib/profile";
import { OnboardingProvider } from "@/features/ai-plan/onboarding-store";

// Per-request so the prefilled gender reflects the latest saved profile.
export const dynamic = "force-dynamic";

export default async function AiPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  return (
    <OnboardingProvider
      initialGender={profile?.gender ?? null}
      userId={profile?.id ?? null}
    >
      {children}
    </OnboardingProvider>
  );
}
