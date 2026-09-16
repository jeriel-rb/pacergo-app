import { notFound } from "next/navigation";
import { getPayoutDetail } from "@/lib/admin";
import { AdminPayoutDetailView } from "@/features/admin/admin-payout-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPayoutDetail(id);
  if (!detail) notFound();
  return <AdminPayoutDetailView detail={detail} />;
}
