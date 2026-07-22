export type WebAppSignInMedium =
  | "header"
  | "hero"
  | "final_cta"
  | "find_page"
  | "earn_page";

export function getWebAppSignInUrl(utmMedium: WebAppSignInMedium) {
  const url = new URL("https://app.pacergo.app/sign-in");
  url.searchParams.set("utm_source", "website");
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", "mvp_launch");
  return url.toString();
}
