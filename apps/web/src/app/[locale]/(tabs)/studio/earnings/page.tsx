import { getMyEarnings } from "@/lib/earnings";
import { EarningsView } from "@/features/studio/earnings-view";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const data = await getMyEarnings();
  return <EarningsView data={data} />;
}
