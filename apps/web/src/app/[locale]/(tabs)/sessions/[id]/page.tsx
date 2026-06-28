import { notFound } from "next/navigation";
import { getBookingDetail } from "@/lib/bookings";
import { getMyReviewForBooking } from "@/lib/reviews";
import { getSessionUser } from "@/lib/auth";
import { BookingDetailView } from "@/features/booking/booking-detail-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;
  const [booking, user, myReview] = await Promise.all([
    getBookingDetail(id),
    getSessionUser(),
    getMyReviewForBooking(id),
  ]);
  if (!booking) notFound();
  return (
    <BookingDetailView
      booking={booking}
      currentUserId={user?.id ?? null}
      myReview={myReview}
    />
  );
}
