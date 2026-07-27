import { describe, expect, it } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import {
  buildPasswordRecoveryCallbackUrl,
  mapPasswordRecoveryCallbackError,
  mapPasswordResetRequestError,
  mapPasswordUpdateError,
  sanitizePasswordResetRedirect,
} from "../password-reset";

describe("password reset callback URLs", () => {
  it("builds a localized recovery callback URL", () => {
    expect(
      buildPasswordRecoveryCallbackUrl({
        origin: "https://app.pacergo.app",
        locale: "en",
      }),
    ).toBe("https://app.pacergo.app/en/auth/recovery/confirm?flow=recovery");
  });

  it("builds a localhost recovery callback URL", () => {
    expect(
      buildPasswordRecoveryCallbackUrl({
        origin: "http://localhost:3000",
        locale: "en",
      }),
    ).toBe("http://localhost:3000/en/auth/recovery/confirm?flow=recovery");
  });

  it("keeps password reset redirects fixed to sign-in", () => {
    expect(sanitizePasswordResetRedirect("/sign-in", "zh")).toBe("/sign-in");
    expect(sanitizePasswordResetRedirect("https://evil.example", "zh")).toBe(
      "/sign-in",
    );
    expect(sanitizePasswordResetRedirect("/new-password", "zh")).toBe(
      "/sign-in",
    );
  });
});

describe("password reset error mapping", () => {
  it("maps request errors without exposing account existence", () => {
    expect(mapPasswordResetRequestError(new TypeError("Failed to fetch"))).toBe(
      "password_reset_network_error",
    );
    expect(
      mapPasswordResetRequestError(
        authError("over_email_send_rate_limit", "Too many requests", 429),
      ),
    ).toBe("password_reset_rate_limited");
    expect(
      mapPasswordResetRequestError(authError("user_not_found", "User not found")),
    ).toBe("password_reset_request_failed");
  });

  it("maps recovery callback failures", () => {
    expect(
      mapPasswordRecoveryCallbackError(authError("otp_expired", "Expired")),
    ).toBe("password_update_link_expired");
    expect(
      mapPasswordRecoveryCallbackError(authError("invalid_grant", "Invalid")),
    ).toBe("password_update_link_invalid");
  });

  it("maps password update failures", () => {
    expect(mapPasswordUpdateError(authError("weak_password", "Password"))).toBe(
      "password_update_invalid_password",
    );
    expect(mapPasswordUpdateError(authError("too_many", "Too many", 429))).toBe(
      "password_update_rate_limited",
    );
  });
});

function authError(code: string, message: string, status = 400): AuthError {
  return { code, message, name: "AuthApiError", status } as AuthError;
}
