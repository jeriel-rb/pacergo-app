import { notFound } from "next/navigation";
import { getIsAdmin, getVerificationQueue } from "@/lib/admin";
import { AdminView } from "@/features/admin/admin-view";
import { AdminExportsView } from "@/features/admin/admin-exports-view";

// Per-request so the queue reflects approvals immediately after router.refresh().
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) notFound();

  const queue = await getVerificationQueue();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* CSV export tooling (B-9 / A9). Admin-gated at the route too. */}
      <AdminExportsView />
      <AdminView queue={queue} />
    </div>
  );
}
