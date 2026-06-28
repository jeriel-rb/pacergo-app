import { notFound } from "next/navigation";
import { getTrainerById } from "@pacergo/api";
import { TrainerDetailView } from "@/features/trainer/trainer-detail-view";
import { getCompanionOfferings } from "@/lib/bookings";
import { getSessionUser } from "@/lib/auth";

// Per-request so a freshly created booking / updated listing reflects.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; locale: string }> };

export default async function TrainerDetailPage({ params }: Params) {
  const { id } = await params;
  const [trainer, offerings, user] = await Promise.all([
    getTrainerById(id),
    getCompanionOfferings(id),
    getSessionUser(),
  ]);
  if (!trainer) notFound();
  return (
    <TrainerDetailView
      trainer={trainer}
      offerings={offerings}
      currentUserId={user?.id ?? null}
    />
  );
}
