/**
 * Customer-support inbox, shared by web + native. Surfaced via the 客服 link
 * under the "Me" tab (and the web /support page) as a plain `mailto:` — no
 * transactional-email service involved. A reachable support channel is an App
 * Store review requirement (Aerion: "沒有客服功能會被退件").
 */
export const SUPPORT_EMAIL = 'pacergov1@gmail.com';

/** `mailto:` link with a default subject, for the support CTA. */
export function supportMailto(subject = 'Pacergo 客服'): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
