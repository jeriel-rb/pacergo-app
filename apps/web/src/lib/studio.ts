import type { ActivitySlug, Tier } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export type ListingStatus = "draft" | "active" | "paused";

export interface StudioListing {
  id: string;
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: ListingStatus;
  rating_avg: number;
  rating_count: number;
}

export interface StudioOffering {
  id: string;
  activity: ActivitySlug;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
}

export interface StudioAvailability {
  id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
}

export interface MyListing {
  is_companion: boolean;
  listing: StudioListing | null;
  offerings: StudioOffering[];
  availability: StudioAvailability[];
}

const EMPTY: MyListing = {
  is_companion: false,
  listing: null,
  offerings: [],
  availability: [],
};

/** The signed-in user's listing bundle (for 陪練師後台). */
export async function getMyListing(): Promise<MyListing> {
  if (!SUPABASE_CONFIGURED) return EMPTY;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_listing");
  const r = (data ?? {}) as Partial<MyListing>;
  return {
    is_companion: r.is_companion ?? false,
    listing: r.listing ?? null,
    offerings: r.offerings ?? [],
    availability: r.availability ?? [],
  };
}
