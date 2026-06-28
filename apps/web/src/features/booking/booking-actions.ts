"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CreateBookingInput {
  companionId: string;
  offeringId: string;
  /** ISO string, or null for "flexible / to be agreed". */
  scheduledStart: string | null;
  durationMin: number | null;
  locationName: string | null;
  seekerNote: string | null;
}

/** Create a booking request as the signed-in seeker. Returns the booking id. */
export async function createBooking(input: CreateBookingInput): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_companion_id: input.companionId,
    p_offering_id: input.offeringId,
    p_scheduled_start: input.scheduledStart,
    p_duration_min: input.durationMin,
    p_location_name: input.locationName,
    p_seeker_note: input.seekerNote,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

async function transition(fn: string, id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc(fn, { p_id: id });
  if (error) throw new Error(error.message);
}

/** Booking FSM transitions (existing SECURITY DEFINER RPCs from migration 0004). */
export const acceptBooking = (id: string) => transition("accept_booking", id);
export const declineBooking = (id: string) => transition("decline_booking", id);
export const cancelBooking = (id: string) => transition("cancel_booking", id);
export const completeBooking = (id: string) => transition("complete_booking", id);
