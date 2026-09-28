import { getAllUsers, getVerificationQueue } from "@/lib/admin";
import { AdminView } from "@/features/admin/admin-view";

// Per-request so the queue/members reflect changes immediately after router.refresh().
export const dynamic = "force-dynamic";

/** Default admin landing — trainer verification queue. Admin gate lives in the (admin) layout. */
export default async function AdminPage() {
  const [queue, usersPage] = await Promise.all([
    getVerificationQueue(),
    getAllUsers(0),
  ]);
  return <AdminView queue={queue} usersPage={usersPage} />;
}
