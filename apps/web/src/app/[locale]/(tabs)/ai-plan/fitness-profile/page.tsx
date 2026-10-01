import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { getSavedFitnessProfileServer } from "@/lib/fitness-profile.server";
import { FitnessProfileView } from "@/features/ai-plan/fitness-profile/fitness-profile-view";

export const dynamic = "force-dynamic";

/** The Shared Fitness Profile — the one place to edit the data AI Training
 *  and AI Nutrition both read. */
export default async function FitnessProfilePage() {
  const [profile, saved] = await Promise.all([getCurrentProfile(), getSavedFitnessProfileServer()]);
  if (!profile || !saved) notFound();

  return <FitnessProfileView userId={profile.id} saved={saved} answers={saved.answers} />;
}
