import type { Tier } from '../enums/tier';

/**
 * Display labels per tier. The DB enum stays `A | B | C`; these Chinese/English
 * labels are presentation-only (see the trainer cards and detail header).
 */
export const TIER_LABELS: Record<Tier, { zh: string; en: string }> = {
  A: { zh: '社群頂流', en: 'Top Tier' },
  B: { zh: '資深專業', en: 'Senior Pro' },
  C: { zh: '陽光搭子', en: 'Buddy' },
};

/** Badge color intent per tier, mapped to theme tokens by the web/native UI. */
export const TIER_INTENT: Record<Tier, 'primary' | 'dark' | 'soft'> = {
  A: 'primary',
  B: 'dark',
  C: 'soft',
};
