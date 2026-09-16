import { getPayoutList, type PayoutStatus } from "@/lib/admin";
import { AdminPayoutsView } from "@/features/admin/admin-payouts-view";

export const dynamic = "force-dynamic";

const VALID_STATUSES: PayoutStatus[] = [
  "requested",
  "processing",
  "paid",
  "rejected",
  "cancelled",
];

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter =
    status && VALID_STATUSES.includes(status as PayoutStatus)
      ? (status as PayoutStatus)
      : "all";
  const list = await getPayoutList(filter === "all" ? undefined : filter);
  return <AdminPayoutsView initial={list} initialFilter={filter} />;
}
