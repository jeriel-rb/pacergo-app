import { notFound } from "next/navigation";
import { getPaymentDetail } from "@/lib/payments";
import { SimulatedPaymentView } from "@/features/payments/simulated-payment-view";

export const dynamic = "force-dynamic";

export default async function SimulatedPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentDetail(id);
  if (!payment) notFound();
  return <SimulatedPaymentView payment={payment} />;
}
