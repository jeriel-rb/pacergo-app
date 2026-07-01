import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_LABELS,
  TIER_INTENT,
  TIER_PRICE_BANDS,
  PLATFORM_MIN_PRICE_NTD,
  isPriceInTierBand,
  TIER_REQUIRES_CERT,
  TIER_REQUIRES_COMPETITION,
  ACTIVITY_META,
  ACTIVITY_SLUGS,
} from '../index';

describe('shared domain constants', () => {
  it('has a label for every tier in zh and en', () => {
    for (const t of TIERS) {
      expect(TIER_LABELS[t].zh.length).toBeGreaterThan(0);
      expect(TIER_LABELS[t].en.length).toBeGreaterThan(0);
    }
  });

  it('maps every tier to a badge intent', () => {
    for (const t of TIERS) {
      expect(['primary', 'dark', 'soft']).toContain(TIER_INTENT[t]);
    }
  });

  it('has a valid price band for every tier, at or above the platform floor', () => {
    for (const t of TIERS) {
      const band = TIER_PRICE_BANDS[t];
      expect(band.min).toBeGreaterThanOrEqual(PLATFORM_MIN_PRICE_NTD);
      expect(band.max).toBeGreaterThanOrEqual(band.min);
    }
  });

  it('orders tier bands C < B < A without gaps that undercut the floor', () => {
    expect(TIER_PRICE_BANDS.C.min).toBe(PLATFORM_MIN_PRICE_NTD);
    expect(TIER_PRICE_BANDS.C.max).toBe(TIER_PRICE_BANDS.B.min);
    expect(TIER_PRICE_BANDS.B.max).toBe(TIER_PRICE_BANDS.A.min);
  });

  it('validates prices against the inclusive tier band', () => {
    expect(isPriceInTierBand('C', 600)).toBe(true);
    expect(isPriceInTierBand('C', 800)).toBe(true);
    expect(isPriceInTierBand('C', 599)).toBe(false);
    expect(isPriceInTierBand('C', 801)).toBe(false);
    expect(isPriceInTierBand('A', 1500)).toBe(true);
    expect(isPriceInTierBand('A', 1501)).toBe(false);
    expect(isPriceInTierBand('B', Number.NaN)).toBe(false);
  });

  it('gates B and A behind certification, and A alone behind competition', () => {
    expect(TIER_REQUIRES_CERT.C).toBe(false);
    expect(TIER_REQUIRES_CERT.B).toBe(true);
    expect(TIER_REQUIRES_CERT.A).toBe(true);
    expect(TIER_REQUIRES_COMPETITION.A).toBe(true);
    expect(TIER_REQUIRES_COMPETITION.B).toBe(false);
    expect(TIER_REQUIRES_COMPETITION.C).toBe(false);
  });

  it('has meta for every activity slug', () => {
    for (const s of ACTIVITY_SLUGS) {
      expect(ACTIVITY_META[s].icon.length).toBeGreaterThan(0);
      expect(ACTIVITY_META[s].zh.length).toBeGreaterThan(0);
      expect(ACTIVITY_META[s].en.length).toBeGreaterThan(0);
    }
  });
});
