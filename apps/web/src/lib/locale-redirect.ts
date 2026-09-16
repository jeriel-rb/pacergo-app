import { redirect } from "next/navigation";
import { getLocalizedPath } from "./locale-path";

/**
 * Server-side redirect that preserves locale prefix rules (`prefixDefault: false`):
 * default locale (zh) stays unprefixed (`/admin`), others get a prefix (`/en/admin`).
 * Mirrors the marketing site's `getLocalizedPath` usage in `@pacergo/website`.
 */
export function redirectLocalized(pathname: string, locale: string): never {
  redirect(getLocalizedPath(pathname, locale));
}
