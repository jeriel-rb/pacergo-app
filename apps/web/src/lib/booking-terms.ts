import type { BookingRole } from "@pacergo/shared";

/**
 * Booking safety terms: what a trainer agrees to before accepting a booking and
 * what a member agrees to before paying for one. Per booking, unlike the
 * account-level consents in `consent.ts`.
 *
 * The text is i18n copy (locales/{zh,en}/legal.json → `bookingTerms`): the
 * role's general terms plus one short section for the booking's activity.
 * Bump BOOKING_TERMS_VERSION (a date) whenever any of that wording changes. It
 * is written to `booking_terms_acceptances.terms_version` with each agreement,
 * so a record says exactly which text the person saw.
 */
export const BOOKING_TERMS_VERSION = "2026-11-08";

/** Activities with their own safety section. Others show the general terms only. */
export const BOOKING_TERMS_ACTIVITIES = ["gym", "walking", "running", "hiking", "hyrox"] as const;

export type BookingTermsActivity = (typeof BOOKING_TERMS_ACTIVITIES)[number];

export function bookingTermsActivity(slug: string | null | undefined): BookingTermsActivity | null {
  return (BOOKING_TERMS_ACTIVITIES as readonly string[]).includes(slug ?? "")
    ? (slug as BookingTermsActivity)
    : null;
}

/** The i18n keys (legal namespace) that make up one person's terms. */
export function bookingTermsKeys(role: BookingRole, activitySlug: string | null | undefined) {
  const activity = bookingTermsActivity(activitySlug);
  return {
    title: `bookingTerms.${role}.title`,
    body: `bookingTerms.${role}.body`,
    activityTitle: activity ? `bookingTerms.activities.${activity}.title` : null,
    activityBody: activity ? `bookingTerms.activities.${activity}.body` : null,
  };
}
