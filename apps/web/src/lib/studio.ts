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

/** Status of a Tier A certification for one activity. */
export type VerificationStatus = "pending" | "approved" | "rejected";

export interface StudioVerification {
  status: VerificationStatus;
  label: string | null;
}

/** Per-activity certification status, keyed by ActivitySlug (e.g. `gym`). */
export type VerificationMap = Record<string, StudioVerification>;

export interface TrainerEligibility {
  /** ISO date, or null when we don't know it yet. */
  birthdate: string | null;
  attested: boolean;
  /** 18+ and attested. */
  eligible: boolean;
}

export interface MyListing {
  is_companion: boolean;
  /** Per-activity certification status (unlocks Tiers B & A). */
  verifications: VerificationMap;
  /** Per-activity competition-experience status (additionally unlocks Tier A). */
  competitions: VerificationMap;
  /** Per-activity sports-background proof status (qualifies Tier C). */
  backgrounds: VerificationMap;
  /** 18+ and the truthfulness confirmation, required before any proof upload. */
  eligibility: TrainerEligibility;
  /** First-time Tier C trainer request. Null until they submit. */
  application: { status: VerificationStatus; notes: string | null } | null;
  listing: StudioListing | null;
  offerings: StudioOffering[];
  availability: StudioAvailability[];
}

const EMPTY: MyListing = {
  is_companion: false,
  verifications: {},
  competitions: {},
  backgrounds: {},
  eligibility: { birthdate: null, attested: false, eligible: false },
  application: null,
  listing: null,
  offerings: [],
  availability: [],
};

/** The signed-in user's listing bundle (for 陪練後台). */
export async function getMyListing(): Promise<MyListing> {
  if (!SUPABASE_CONFIGURED) return EMPTY;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_listing");
  const r = (data ?? {}) as Partial<MyListing>;
  return {
    is_companion: r.is_companion ?? false,
    verifications: r.verifications ?? {},
    competitions: r.competitions ?? {},
    backgrounds: r.backgrounds ?? {},
    eligibility: r.eligibility ?? EMPTY.eligibility,
    application: r.application ?? null,
    listing: r.listing ?? null,
    offerings: r.offerings ?? [],
    availability: r.availability ?? [],
  };
}
