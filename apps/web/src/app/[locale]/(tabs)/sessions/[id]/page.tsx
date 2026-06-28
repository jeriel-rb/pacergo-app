import { notFound } from "next/navigation";
import { getBookingDetail } from "@/lib/bookings";
import { getSessionUser } from "@/lib/auth";
import { BookingDetailView } from "@/features/booking/booking-detail-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;
  const [booking, user] = await Promise.all([
    getBookingDetail(id),
    getSessionUser(),
  ]);
  if (!booking) notFound();
  return <BookingDetailView booking={booking} currentUserId={user?.id ?? null} />;
}
