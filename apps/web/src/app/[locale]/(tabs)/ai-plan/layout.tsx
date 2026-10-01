import { getCurrentProfile } from "@/lib/profile";
import { getSavedFitnessProfileServer } from "@/lib/fitness-profile.server";
import { OnboardingProvider } from "@/features/ai-plan/onboarding-store";

// Per-request so the wizard starts from the latest saved fitness profile.
export const dynamic = "force-dynamic";

export default async function AiPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, savedProfile] = await Promise.all([
    getCurrentProfile(),
    getSavedFitnessProfileServer().catch(() => null),
  ]);
  return (
    <OnboardingProvider
      userId={profile?.id ?? null}
      savedProfile={savedProfile}
    >
      {children}
    </OnboardingProvider>
  );
}
