import initTranslations from "@/app/i18n";
import { getPaymentDetail } from "@/lib/payments";
import { PaymentResultView } from "@/features/payments/payment-result-view";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: "zh" | "en" }>;
  searchParams: Promise<{ payment?: string; error?: string }>;
};

export default async function NewebPayResultPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const { t } = await initTranslations({ locale, namespaces: ["payments"] });
  const payment = query.payment ? await getPaymentDetail(query.payment) : null;
  return <PaymentResultView payment={payment} locale={locale} t={t} />;
}
