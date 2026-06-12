import type { Tier } from '@/features/discovery/types';

export type OfferingInput = { tier: Tier; priceNtd: number; isFree: boolean };
export type OfferingValidation = { ok: boolean; error?: string };

export function validateOffering(input: OfferingInput): OfferingValidation {
  if (input.isFree) {
    if (input.tier !== 'C') return { ok: false, error: 'only_tier_c_free' };
    return { ok: true };
  }
  if (input.priceNtd <= 0) return { ok: false, error: 'price_required' };
  return { ok: true };
}
