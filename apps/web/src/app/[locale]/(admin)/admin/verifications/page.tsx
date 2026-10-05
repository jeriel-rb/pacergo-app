import { getVerificationQueue } from "@/lib/admin";
import { AdminVerificationsView } from "@/features/admin/admin-verifications-view";

// Per-request so the queue reflects decisions immediately after router.refresh().
export const dynamic = "force-dynamic";

/** Trainer requests: the full certification / competition-proof review queue.
 *  Admin gate lives in the (admin) layout. */
export default async function AdminVerificationsPage() {
  const queue = await getVerificationQueue();
  return <AdminVerificationsView queue={queue} />;
}
