import { describe, expect, it } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import {
  buildAuthCallbackUrl,
  getTrustedAppOrigin,
  isRecoveryAuthRequest,
  isSupportedOtpType,
  mapAuthCallbackError,
  normalizeAppOrigin,
  sanitizeInternalRedirect,
} from "../auth-callback";

describe("auth callback redirect safety", () => {
  it("normalizes configured app origins", () => {
    expect(normalizeAppOrigin("app.pacergo.app")).toBe(
      "https://app.pacergo.app",
    );
    expect(normalizeAppOrigin("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeAppOrigin("http://app.pacergo.app/path")).toBe(
      "http://app.pacergo.app",
    );
    expect(normalizeAppOrigin("javascript:alert(1)")).toBeNull();
  });

  it("accepts a valid relative redirect", () => {
    expect(sanitizeInternalRedirect("/", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("/en/profile", "en")).toBe("/en/profile");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(sanitizeInternalRedirect("https://malicious.example", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("//malicious.example", "zh")).toBe("/");
  });

  it("rejects callback/result loops and malformed locale duplication", () => {
    expect(sanitizeInternalRedirect("/auth/callback?code=abc", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("/verify?status=success", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("/auth/recovery?code=abc", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("/new-password", "zh")).toBe("/");
    expect(sanitizeInternalRedirect("/en/en/profile", "en")).toBe("/en");
  });

  it("builds a localized callback URL with a sanitized next value", () => {
    expect(
      buildAuthCallbackUrl({
        origin: "https://app.pacergo.app",
        locale: "en",
        next: "https://malicious.example",
      }),
    ).toBe("https://app.pacergo.app/en/auth/callback?next=%2Fen");
  });

  it("prefers localhost while testing locally", () => {
    expect(getTrustedAppOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("uses the current app origin for auth email redirects", () => {
    expect(getTrustedAppOrigin("https://pacergo-preview.vercel.app")).toBe(
      "https://pacergo-preview.vercel.app",
    );
  });
});

describe("auth callback verification format", () => {
  it("accepts Supabase token-hash verification types used by auth emails", () => {
    expect(isSupportedOtpType("signup")).toBe(true);
    expect(isSupportedOtpType("email_change")).toBe(true);
    expect(isSupportedOtpType("not-real")).toBe(false);
  });

  it("detects password recovery callback markers", () => {
    expect(isRecoveryAuthRequest(new URLSearchParams("flow=recovery"))).toBe(true);
    expect(isRecoveryAuthRequest(new URLSearchParams("type=recovery"))).toBe(true);
    expect(isRecoveryAuthRequest(new URLSearchParams("type=signup"))).toBe(false);
  });
});

describe("auth callback error mapping", () => {
  it("maps provider errors to safe internal identifiers", () => {
    expect(mapAuthCallbackError(authError("otp_expired", "Token has expired"))).toBe(
      "verification_expired",
    );
    expect(mapAuthCallbackError(authError("invalid_grant", "Invalid token"))).toBe(
      "verification_invalid",
    );
    expect(mapAuthCallbackError(authError("unknown", "Email already confirmed"))).toBe(
      "verification_already_used",
    );
  });
});

function authError(code: string, message: string): AuthError {
  return { code, message, name: "AuthApiError", status: 400 } as AuthError;
}
