import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/admin";
import { AdminOrderDetailView } from "@/features/admin/admin-order-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminOrder(id);
  if (!detail) notFound();
  return <AdminOrderDetailView detail={detail} />;
}
