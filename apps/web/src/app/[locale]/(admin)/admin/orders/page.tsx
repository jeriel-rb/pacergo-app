import { getAdminOrders, type OrderFilter } from "@/lib/admin";
import { AdminOrdersView } from "@/features/admin/orders/admin-orders-view";

export const dynamic = "force-dynamic";

const VALID: OrderFilter[] = [
  "paid",
  "pending",
  "failed",
  "cancelled",
  "refund_requested",
  "on_hold",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && VALID.includes(status as OrderFilter) ? (status as OrderFilter) : "all";
  const rows = await getAdminOrders(filter === "all" ? undefined : filter);
  return <AdminOrdersView rows={rows} filter={filter} />;
}
