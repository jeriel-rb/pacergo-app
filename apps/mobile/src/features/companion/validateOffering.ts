import { isPriceInTierBand, TIER_PRICE_FLOORS, type Tier } from '@pacergo/shared';

export type OfferingInput = { tier: Tier; priceNtd: number; isFree: boolean };
export type OfferingValidation = { ok: boolean; error?: string };

/**
 * Mirrors the platform pricing rules enforced by the `add_offering` RPC:
 * no free offerings, and each tier has an inclusive price floor with no
 * ceiling (C 400+ · B 800+ · A 1200+, see shared TIER_PRICE_FLOORS).
 */
export function validateOffering(input: OfferingInput): OfferingValidation {
  if (input.isFree) return { ok: false, error: 'no_free' };
  if (!isPriceInTierBand(input.tier, input.priceNtd)) {
    return { ok: false, error: 'below_floor' };
  }
  return { ok: true };
}

export { TIER_PRICE_FLOORS };
