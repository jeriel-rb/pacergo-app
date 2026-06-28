import { getSavedCompanionsFeed } from "@/lib/saved";
import { SavedView } from "@/features/saved/saved-view";

// Per-request so newly saved/unsaved trainers reflect immediately.
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const trainers = await getSavedCompanionsFeed();
  return <SavedView trainers={trainers} />;
}
