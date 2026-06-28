import type { BookingRecord, CompanionOffering } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

/** Bookings the signed-in user is part of (seeker or companion), newest first. */
export async function getMyBookings(): Promise<BookingRecord[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_bookings");
  return (data ?? []) as BookingRecord[];
}

/** A single booking the signed-in user is part of, or null. */
export async function getBookingDetail(id: string): Promise<BookingRecord | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("booking_detail", { p_id: id });
  return (data ?? null) as BookingRecord | null;
}

/** Bookable offerings (with ids) for a companion's active listing. */
export async function getCompanionOfferings(
  companionId: string,
): Promise<CompanionOffering[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("companion_offerings", {
    p_companion_id: companionId,
  });
  return (data ?? []) as CompanionOffering[];
}
