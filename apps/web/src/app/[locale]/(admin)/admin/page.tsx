import { getVerificationQueue } from "@/lib/admin";
import { AdminView } from "@/features/admin/admin-view";

// Per-request so the queue reflects approvals immediately after router.refresh().
export const dynamic = "force-dynamic";

/** Default admin landing — trainer verification queue. */
export default async function AdminPage() {
  const queue = await getVerificationQueue();
  return <AdminView queue={queue} />;
}
