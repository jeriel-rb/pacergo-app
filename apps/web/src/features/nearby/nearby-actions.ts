"use client";

import type { NearbyCompanion } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

/** Trainers within `radiusM` of (lat,lng), nearest first (via RPC). */
export async function getNearbyCompanions(
  lat: number,
  lng: number,
  radiusM = 20000,
): Promise<NearbyCompanion[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("nearby_companions", {
    center_lat: lat,
    center_lng: lng,
    radius_m: radiusM,
    filter_activity: null,
    filter_tier: null,
    max_price: null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as NearbyCompanion[];
}
