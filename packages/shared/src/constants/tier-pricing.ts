import type { Tier } from '../enums/tier';

/**
 * Platform-wide price floor (NT$ per session). No offering may be listed below
 * this — it guarantees trainers a livable rate and signals "this platform
 * starts at NT$600" to seekers.
 */
export const PLATFORM_MIN_PRICE_NTD = 600;

/**
 * Enforced price band per tier (NT$ per session), both bounds inclusive.
 * Ranges are intentionally narrow so trainers within a tier don't undercut each
 * other into a race to the bottom. Kept in sync with the `add_offering` RPC.
 */
export const TIER_PRICE_BANDS: Record<Tier, { min: number; max: number }> = {
  C: { min: 600, max: 800 },
  B: { min: 800, max: 1200 },
  A: { min: 1200, max: 1500 },
};

/** True when `price` sits within the (inclusive) band for `tier`. */
export function isPriceInTierBand(tier: Tier, price: number): boolean {
  const band = TIER_PRICE_BANDS[tier];
  return Number.isFinite(price) && price >= band.min && price <= band.max;
}

/**
 * Which tiers require an approved coaching certification (per activity) before
 * a trainer may list at them. Tier C is open; B and A are certified tiers.
 */
export const TIER_REQUIRES_CERT: Record<Tier, boolean> = {
  A: true,
  B: true,
  C: false,
};

/**
 * Which tiers additionally require approved competition experience (per
 * activity). Only Tier A — the "社群頂流" top tier.
 */
export const TIER_REQUIRES_COMPETITION: Record<Tier, boolean> = {
  A: true,
  B: false,
  C: false,
};
