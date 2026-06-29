import { notFound } from "next/navigation";
import { getIsAdmin, getVerificationQueue } from "@/lib/admin";
import { AdminView } from "@/features/admin/admin-view";

// Per-request so the queue reflects approvals immediately after router.refresh().
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) notFound();

  const queue = await getVerificationQueue();
  return <AdminView queue={queue} />;
}
