import { getMyNotifications } from "@/lib/notifications";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getMyNotifications();
  return <NotificationsView notifications={notifications} />;
}
