import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_LABELS,
  TIER_INTENT,
  TIER_PRICE_FLOORS,
  PLATFORM_MIN_PRICE_NTD,
  isPriceInTierBand,
  TIER_REQUIRES_CERT,
  TIER_REQUIRES_COMPETITION,
  ACTIVITY_META,
  ACTIVITY_SLUGS,
  SUPPORT_EMAIL,
  supportMailto,
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

  it('has a price floor for every tier, at or above the platform floor', () => {
    for (const t of TIERS) {
      expect(TIER_PRICE_FLOORS[t]).toBeGreaterThanOrEqual(PLATFORM_MIN_PRICE_NTD);
    }
  });

  it('orders tier floors C < B < A, starting at the platform floor', () => {
    expect(TIER_PRICE_FLOORS.C).toBe(PLATFORM_MIN_PRICE_NTD);
    expect(TIER_PRICE_FLOORS.C).toBeLessThan(TIER_PRICE_FLOORS.B);
    expect(TIER_PRICE_FLOORS.B).toBeLessThan(TIER_PRICE_FLOORS.A);
  });

  it('validates prices against the tier floor, with no ceiling', () => {
    expect(isPriceInTierBand('C', 400)).toBe(true);
    expect(isPriceInTierBand('C', 399)).toBe(false);
    expect(isPriceInTierBand('C', 2000)).toBe(true);
    expect(isPriceInTierBand('B', 800)).toBe(true);
    expect(isPriceInTierBand('B', 799)).toBe(false);
    expect(isPriceInTierBand('A', 1200)).toBe(true);
    expect(isPriceInTierBand('A', 1199)).toBe(false);
    expect(isPriceInTierBand('A', 99999)).toBe(true);
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

  it('points the support channel at the real inbox with an encoded mailto', () => {
    expect(SUPPORT_EMAIL).toBe('pacergov1@gmail.com');
    expect(supportMailto('PacerGo 客服')).toBe(
      'mailto:pacergov1@gmail.com?subject=PacerGo%20%E5%AE%A2%E6%9C%8D',
    );
  });
});
