import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { APP_URL } from "./supabase/env";
import i18nConfig from "@/i18nConfig";
import { getLocalizedPath, pathWithoutLeadingLocale } from "./locale-path";

export type VerificationErrorCode =
  | "verification_missing_parameters"
  | "verification_invalid"
  | "verification_expired"
  | "verification_already_used"
  | "verification_exchange_failed"
  | "verification_unknown";

const SUPPORTED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "email_change",
  "recovery",
]);

function isSupportedLocale(locale: string): locale is "zh" | "en" {
  return i18nConfig.locales.includes(locale);
}

export function normalizeLocale(locale: string | null | undefined): "zh" | "en" {
  return locale && isSupportedLocale(locale) ? (locale as "zh" | "en") : "zh";
}

export function isSupportedOtpType(type: string | null): type is EmailOtpType {
  return Boolean(type && SUPPORTED_OTP_TYPES.has(type as EmailOtpType));
}

export function isRecoveryAuthRequest(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("type") === "recovery" ||
    searchParams.get("flow") === "recovery"
  );
}

export function safeHomePath(locale: string): string {
  return getLocalizedPath("/", normalizeLocale(locale));
}

export function getTrustedAppOrigin(fallbackOrigin?: string): string | null {
  const configuredOrigin = normalizeAppOrigin(APP_URL);
  if (configuredOrigin && !isSupabaseProjectOrigin(configuredOrigin)) {
    return configuredOrigin;
  }
  return normalizeAppOrigin(fallbackOrigin);
}

export function normalizeAppOrigin(
  value: string | null | undefined,
): string | null {
  const candidate = value?.trim() ?? "";
  if (!candidate) return null;

  const candidateWithProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(candidate)
    ? candidate
    : `http://${candidate}`;

  try {
    const url = new URL(candidateWithProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isSupabaseProjectOrigin(origin: string): boolean {
  try {
    return new URL(origin).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function buildAuthCallbackUrl({
  origin,
  locale,
  next,
}: {
  origin: string;
  locale: string;
  next?: string;
}): string {
  const url = new URL(getLocalizedPath("/auth/callback", normalizeLocale(locale)), origin);
  const safeNext = sanitizeInternalRedirect(next, locale);
  url.searchParams.set("next", safeNext);
  return url.toString();
}

export function sanitizeInternalRedirect(
  value: string | null | undefined,
  locale: string,
): string {
  const fallback = safeHomePath(locale);
  if (!value) return fallback;
  if (value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (/^\/(?:javascript|data):/i.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, "https://pacergo.local");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://pacergo.local") return fallback;

  const pathname = parsed.pathname || "/";
  const stripped = pathWithoutLeadingLocale(pathname);
  if (stripped === "/auth/callback" || stripped.startsWith("/auth/callback/")) {
    return fallback;
  }
  if (stripped === "/verify" || stripped.startsWith("/verify/")) {
    return fallback;
  }
  if (stripped === "/auth/recovery" || stripped.startsWith("/auth/recovery/")) {
    return fallback;
  }
  if (stripped === "/new-password" || stripped.startsWith("/new-password/")) {
    return fallback;
  }

  const pathLocale = pathname.match(/^\/([a-z]{2})(?=\/|$)/)?.[1];
  if (pathLocale && isSupportedLocale(pathLocale)) {
    const duplicated = stripped.match(/^\/([a-z]{2})(?=\/|$)/)?.[1];
    if (duplicated && duplicated === pathLocale) return fallback;
  }

  return `${pathname}${parsed.search}${parsed.hash}`;
}

export function mapAuthCallbackError(error: AuthError | null): VerificationErrorCode {
  if (!error) return "verification_unknown";

  const code = (error as AuthError & { code?: string }).code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();
  const status = (error as AuthError & { status?: number }).status;

  if (
    code.includes("expired") ||
    code === "otp_expired" ||
    message.includes("expired")
  ) {
    return "verification_expired";
  }

  if (
    code.includes("already") ||
    message.includes("already") ||
    message.includes("confirmed") ||
    message.includes("used")
  ) {
    return "verification_already_used";
  }

  if (
    code.includes("invalid") ||
    status === 400 ||
    status === 403 ||
    message.includes("invalid")
  ) {
    return "verification_invalid";
  }

  return "verification_exchange_failed";
}

export function callbackFailureLogPayload(
  reason: VerificationErrorCode,
  error?: AuthError | null,
) {
  const providerErrorCode =
    (error as (AuthError & { code?: string }) | null | undefined)?.code ?? null;
  const providerStatus =
    (error as (AuthError & { status?: number }) | null | undefined)?.status ?? null;

  return {
    event: "auth_verification_failed",
    reason,
    provider_error_code: providerErrorCode,
    provider_status: providerStatus,
    environment: process.env.NODE_ENV,
  };
}
