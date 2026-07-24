import { notFound } from "next/navigation";
import initTranslations from "@/app/i18n";
import { getPaymentReview, isBookingPayable } from "@/lib/payments";
import { PaymentReviewView } from "@/features/payments/payment-review-view";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: "zh" | "en" }>;
  searchParams: Promise<{ booking?: string }>;
};

export default async function NewebPayReviewPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const { t } = await initTranslations({ locale, namespaces: ["payments"] });
  if (!query.booking) notFound();

  const booking = await getPaymentReview(query.booking);
  if (!booking || !isBookingPayable(booking)) notFound();

  return <PaymentReviewView booking={booking} locale={locale} t={t} />;
}
