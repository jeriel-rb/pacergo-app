export type WebAppSignInMedium =
  | "header"
  | "hero"
  | "final_cta"
  | "find_page"
  | "earn_page";

export type WebAppSignUpMedium = "taichung_validation";

function webAppUrl(path: "/sign-in" | "/sign-up", utmMedium: string) {
  const url = new URL(`https://app.pacergo.app${path}`);
  url.searchParams.set("utm_source", "website");
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", "mvp_launch");
  return url.toString();
}

export function getWebAppSignInUrl(utmMedium: WebAppSignInMedium) {
  return webAppUrl("/sign-in", utmMedium);
}

/** Straight to registration — for "Join for Free" calls to action, so a new
 *  visitor doesn't land on a login form first. */
export function getWebAppSignUpUrl(utmMedium: WebAppSignUpMedium) {
  return webAppUrl("/sign-up", utmMedium);
}
