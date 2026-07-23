import type { AuthError } from "@supabase/supabase-js";
import { getLocalizedPath } from "./locale-path";
import {
  getTrustedAppOrigin,
  normalizeLocale,
  safeHomePath,
  sanitizeInternalRedirect,
} from "./auth-callback";

export const RECOVERY_SESSION_COOKIE = "pacergo_recovery_session";
export const RECOVERY_SESSION_MAX_AGE_SECONDS = 20 * 60;

export type PasswordResetRequestErrorCode =
  | "password_reset_invalid_email"
  | "password_reset_rate_limited"
  | "password_reset_network_error"
  | "password_reset_request_failed"
  | "password_reset_unknown";

export type PasswordUpdateErrorCode =
  | "password_update_session_missing"
  | "password_update_link_expired"
  | "password_update_link_invalid"
  | "password_update_link_used"
  | "password_update_invalid_password"
  | "password_update_same_password"
  | "password_update_rate_limited"
  | "password_update_network_error"
  | "password_update_failed"
  | "password_update_unknown";

type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
};

export function buildPasswordRecoveryCallbackUrl({
  origin,
  locale,
}: {
  origin: string;
  locale: string;
}): string {
  const trustedOrigin = getTrustedAppOrigin(origin);
  const url = new URL(
    getLocalizedPath("/auth/recovery", normalizeLocale(locale)),
    trustedOrigin ?? origin,
  );
  url.searchParams.set("flow", "recovery");
  return url.toString();
}

export function safeSignInPath(locale: string): string {
  return getLocalizedPath("/sign-in", normalizeLocale(locale));
}

export function safeForgotPasswordPath(locale: string): string {
  return getLocalizedPath("/forgot-password", normalizeLocale(locale));
}

export function safeNewPasswordPath(locale: string): string {
  return getLocalizedPath("/new-password", normalizeLocale(locale));
}

export function sanitizePasswordResetRedirect(
  value: string | null | undefined,
  locale: string,
): string {
  const fallback = safeSignInPath(locale);
  const safe = sanitizeInternalRedirect(value, locale);
  if (safe === safeHomePath(locale)) return fallback;

  const pathname = new URL(safe, "https://pacergo.local").pathname;
  return pathname === safeSignInPath(locale) ? safe : fallback;
}

export function mapPasswordResetRequestError(
  error: unknown,
): PasswordResetRequestErrorCode {
  const details = normalizeErrorLike(error);

  if (isNetworkError(details)) return "password_reset_network_error";
  if (isRateLimited(details)) return "password_reset_rate_limited";
  if (
    details.code.includes("email") ||
    details.message.includes("invalid email")
  ) {
    return "password_reset_invalid_email";
  }
  if (
    details.code.includes("not_found") ||
    details.message.includes("not found") ||
    details.message.includes("does not exist") ||
    details.message.includes("not registered")
  ) {
    return "password_reset_request_failed";
  }

  return "password_reset_unknown";
}

export function mapPasswordRecoveryCallbackError(
  error: AuthError | null,
): PasswordUpdateErrorCode {
  if (!error) return "password_update_unknown";

  const details = normalizeErrorLike(error);
  if (isRateLimited(details)) return "password_update_rate_limited";
  if (
    details.code.includes("expired") ||
    details.code === "otp_expired" ||
    details.message.includes("expired")
  ) {
    return "password_update_link_expired";
  }
  if (
    details.code.includes("already") ||
    details.message.includes("already") ||
    details.message.includes("used")
  ) {
    return "password_update_link_used";
  }
  if (
    details.code.includes("invalid") ||
    details.status === 400 ||
    details.status === 403 ||
    details.message.includes("invalid")
  ) {
    return "password_update_link_invalid";
  }

  return "password_update_failed";
}

export function mapPasswordUpdateError(error: unknown): PasswordUpdateErrorCode {
  const details = normalizeErrorLike(error);

  if (isNetworkError(details)) return "password_update_network_error";
  if (isRateLimited(details)) return "password_update_rate_limited";
  if (
    details.code.includes("same") ||
    details.message.includes("same password") ||
    details.message.includes("different from the old password")
  ) {
    return "password_update_same_password";
  }
  if (
    details.code.includes("password") ||
    details.message.includes("password") ||
    details.status === 422
  ) {
    return "password_update_invalid_password";
  }

  return "password_update_failed";
}

export function passwordResetLogPayload(
  event: "auth_password_recovery_failed" | "auth_password_updated",
  reason?: PasswordUpdateErrorCode,
  error?: AuthError | null,
) {
  const providerErrorCode =
    (error as (AuthError & { code?: string }) | null | undefined)?.code ?? null;
  const providerStatus =
    (error as (AuthError & { status?: number }) | null | undefined)?.status ??
    null;

  return {
    event,
    reason,
    provider_error_code: providerErrorCode,
    provider_status: providerStatus,
    environment: process.env.NODE_ENV,
  };
}

function normalizeErrorLike(error: unknown): Required<ErrorLike> {
  if (!error || typeof error !== "object") {
    return { code: "", message: "", status: 0, name: "" };
  }

  const value = error as ErrorLike;
  return {
    code: String(value.code ?? "").toLowerCase(),
    message: String(value.message ?? "").toLowerCase(),
    status: Number(value.status ?? 0),
    name: String(value.name ?? "").toLowerCase(),
  };
}

function isRateLimited(error: Required<ErrorLike>): boolean {
  return (
    error.status === 429 ||
    error.code.includes("rate") ||
    error.code.includes("too_many") ||
    error.message.includes("rate limit") ||
    error.message.includes("too many")
  );
}

function isNetworkError(error: Required<ErrorLike>): boolean {
  return (
    error.name.includes("typeerror") ||
    error.message.includes("failed to fetch") ||
    error.message.includes("network") ||
    error.message.includes("fetch failed")
  );
}
