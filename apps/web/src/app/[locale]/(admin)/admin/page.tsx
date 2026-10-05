import {
  getAdminDashboardStats,
  getAllUsers,
  getPayoutList,
  getVerificationQueue,
} from "@/lib/admin";
import { AdminDashboardView } from "@/features/admin/dashboard/admin-dashboard-view";

// Per-request so the numbers reflect changes immediately after router.refresh().
export const dynamic = "force-dynamic";

/** Admin console landing — overview of members, trainer requests and payouts.
 *  Admin gate lives in the (admin) layout. */
export default async function AdminPage() {
  const [stats, queue, usersPage, payouts] = await Promise.all([
    getAdminDashboardStats(),
    getVerificationQueue(),
    getAllUsers(0),
    getPayoutList(),
  ]);
  return (
    <AdminDashboardView stats={stats} queue={queue} usersPage={usersPage} payouts={payouts} />
  );
}
