import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_LABELS,
  TIER_INTENT,
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

  it('has meta for every activity slug', () => {
    for (const s of ACTIVITY_SLUGS) {
      expect(ACTIVITY_META[s].icon.length).toBeGreaterThan(0);
      expect(ACTIVITY_META[s].zh.length).toBeGreaterThan(0);
      expect(ACTIVITY_META[s].en.length).toBeGreaterThan(0);
    }
  });
});
