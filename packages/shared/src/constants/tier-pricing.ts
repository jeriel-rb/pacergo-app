import type { Tier } from '../enums/tier';

/**
 * Platform-wide price floor (NT$ per session). No offering may be listed below
 * this — it guarantees companions a fair rate and signals "this platform
 * starts at NT$400" to seekers.
 */
export const PLATFORM_MIN_PRICE_NTD = 400;

/**
 * Enforced price floor per tier (NT$ per session, inclusive). There is
 * deliberately **no ceiling**: floors keep tiers from undercutting each other
 * into a race to the bottom, while high-demand companions stay free to price
 * at a premium. Kept in sync with the `add_offering` RPC.
 *   C: 400+   B: 800+   A: 1200+
 */
export const TIER_PRICE_FLOORS: Record<Tier, number> = {
  C: 400,
  B: 800,
  A: 1200,
};

/** True when `price` clears the (inclusive) floor for `tier`. No upper bound. */
export function isPriceInTierBand(tier: Tier, price: number): boolean {
  return Number.isFinite(price) && price >= TIER_PRICE_FLOORS[tier];
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
