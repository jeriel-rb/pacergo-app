import type { Tier } from '../enums/tier';
import type { ActivitySlug } from '../enums/activity';

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

/**
 * What kind of document unlocks the certified tiers (B/A) for an activity.
 *   'coach-cert'  — a recognized coaching licence (any Taiwan-recognized
 *                   certification qualifies, e.g. NASM-CPT, ACE, …).
 *   'experience'  — accompaniment-style activities where demanding a coaching
 *                   licence would filter out the experienced athletes who are
 *                   the actual supply. Accepts athletic proof (varsity records,
 *                   race finishes such as ITRA scores or 百岳 summits) or
 *                   leadership experience (club leading, Pacergo reviews).
 * Tier A always additionally requires competition-award proof, regardless of
 * kind. Review stays manual (admin queue); this only drives the requested
 * document type and the copy shown to trainers.
 */
export type QualificationKind = 'coach-cert' | 'experience';

export const ACTIVITY_QUALIFICATION: Record<ActivitySlug, QualificationKind> = {
  gym: 'coach-cert',
  running: 'experience',
  hiking: 'experience',
  hyrox: 'experience',
  cycling: 'experience',
  yoga: 'coach-cert',
  swimming: 'coach-cert',
  boxing: 'coach-cert',
  basketball: 'experience',
};

/**
 * True when Tier B/A for `slug` accepts experience proof instead of a coaching
 * licence. Accepts any string (activity slugs reach the apps from the DB, not
 * just the enum); unknown slugs fall back to the stricter coach-cert copy.
 */
export function isExperienceQualified(slug: string): boolean {
  return ACTIVITY_QUALIFICATION[slug as ActivitySlug] === 'experience';
}
