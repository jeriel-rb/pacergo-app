/** Matches `consent_document_slug` in 0036_consent_pages.sql. Keep in sync —
 *  this is a Postgres enum used only by consent_records, not a content table,
 *  so there's no RPC to derive it from. */
export const CONSENT_SLUGS = [
  "terms_of_service",
  "privacy_policy",
  "risk_disclosure",
  "partner_conduct_rules",
] as const;

export type ConsentSlug = (typeof CONSENT_SLUGS)[number];

export function isConsentSlug(value: string): value is ConsentSlug {
  return (CONSENT_SLUGS as readonly string[]).includes(value);
}

/**
 * Hand-bumped version label per document (a date string). The legal text
 * itself is hardcoded i18n copy (locales/{en,zh}/legal.json) — per the spec,
 * "client supplies all legal wording; dev implements... only," so there's no
 * client-facing editor to version against. Bump the date here whenever the
 * client sends updated wording and you edit the corresponding i18n keys.
 * This is the value written to `consent_records.version_label` when the
 * accept-consent RPC is built.
 */
export const CONSENT_VERSIONS: Record<ConsentSlug, string> = {
  terms_of_service: "2026-09-15",
  privacy_policy: "2026-10-02",
  risk_disclosure: "2026-09-15",
  partner_conduct_rules: "2026-09-15",
};
