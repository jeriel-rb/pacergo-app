"use client";

import type { ActivitySlug, Tier } from "@pacergo/shared";
import type { ListingStatus } from "@/lib/studio";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function upsertMyListing(input: {
  headline: string | null;
  bioLong: string | null;
  servedArea: string | null;
  status: ListingStatus;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("upsert_my_listing", {
    p_headline: input.headline,
    p_bio_long: input.bioLong,
    p_served_area: input.servedArea,
    p_status: input.status,
  });
  if (error) throw new Error(error.message);
}

export async function addOffering(input: {
  activity: ActivitySlug;
  tier: Tier;
  priceNtd: number;
  isFree: boolean;
  sessionMinutes: number;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("add_offering", {
    p_activity_slug: input.activity,
    p_tier: input.tier,
    p_price_ntd: input.priceNtd,
    p_is_free: input.isFree,
    p_session_minutes: input.sessionMinutes,
  });
  if (error) throw new Error(error.message);
}

export async function removeOffering(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("remove_offering", { p_offering_id: id });
  if (error) throw new Error(error.message);
}

export async function addAvailability(input: {
  weekday: number;
  startMinute: number;
  endMinute: number;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("add_availability", {
    p_weekday: input.weekday,
    p_start_minute: input.startMinute,
    p_end_minute: input.endMinute,
  });
  if (error) throw new Error(error.message);
}

export async function removeAvailability(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("remove_availability", { p_id: id });
  if (error) throw new Error(error.message);
}
