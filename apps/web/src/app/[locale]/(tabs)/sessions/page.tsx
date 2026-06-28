import { getMyBookings } from "@/lib/bookings";
import { getSessionUser } from "@/lib/auth";
import { SessionsView } from "@/features/booking/sessions-view";

// Per-request so new/updated bookings reflect immediately.
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const [bookings, user] = await Promise.all([getMyBookings(), getSessionUser()]);
  return <SessionsView bookings={bookings} currentUserId={user?.id ?? null} />;
}
