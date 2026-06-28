import { getMyListing } from "@/lib/studio";
import { StudioView } from "@/features/studio/studio-view";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const data = await getMyListing();
  return <StudioView data={data} />;
}
