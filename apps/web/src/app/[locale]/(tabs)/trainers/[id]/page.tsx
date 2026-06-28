import { notFound } from "next/navigation";
import { getTrainerById } from "@pacergo/api";
import { TrainerDetailView } from "@/features/trainer/trainer-detail-view";
import { getCompanionOfferings } from "@/lib/bookings";
import { hasBookingWith } from "@/lib/chat";
import { getSessionUser } from "@/lib/auth";

// Per-request so a freshly created booking / updated listing reflects.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; locale: string }> };

export default async function TrainerDetailPage({ params }: Params) {
  const { id } = await params;
  const [trainer, offerings, user, canMessage] = await Promise.all([
    getTrainerById(id),
    getCompanionOfferings(id),
    getSessionUser(),
    hasBookingWith(id),
  ]);
  if (!trainer) notFound();
  return (
    <TrainerDetailView
      trainer={trainer}
      offerings={offerings}
      currentUserId={user?.id ?? null}
      canMessage={canMessage}
    />
  );
}
