import { describe, expect, it } from "vitest";
import {
  firstInvalidAuthField,
  isAmbiguousSignUpUser,
  mapAuthError,
  mapResendVerificationError,
  validateAuthFields,
} from "../auth-errors";

describe("auth form validation", () => {
  it("validates required sign-up fields before submitting", () => {
    const errors = validateAuthFields({
      mode: "sign-up",
      email: "",
      password: "",
      confirmPassword: "",
    });

    expect(errors).toEqual({
      email: "field_email_required",
      password: "field_password_required",
      confirmPassword: "field_confirm_password_required",
    });
    expect(firstInvalidAuthField(errors)).toBe("email");
  });

  it("validates email format and password confirmation", () => {
    expect(
      validateAuthFields({
        mode: "sign-up",
        email: "not-an-email",
        password: "secret1",
        confirmPassword: "secret2",
      }),
    ).toEqual({
      email: "field_email_invalid",
      confirmPassword: "field_password_mismatch",
    });
  });
});

describe("auth provider error mapping", () => {
  it("maps common provider failures to internal UI codes", () => {
    expect(mapAuthError(authError("invalid_credentials", "raw provider text"))).toBe(
      "auth_invalid_credentials",
    );
    expect(mapAuthError(authError("email_not_confirmed", "Email not confirmed"))).toBe(
      "auth_email_not_verified",
    );
    expect(mapAuthError(authError("too_many_requests", "Too many requests", 429))).toBe(
      "auth_rate_limited",
    );
    expect(mapAuthError(new TypeError("Failed to fetch"))).toBe(
      "auth_network_error",
    );
  });

  it("maps resend failures without exposing provider text", () => {
    expect(
      mapResendVerificationError(
        authError("over_email_send_rate_limit", "Too many requests", 429),
      ),
    ).toBe("resend_rate_limited");
    expect(mapResendVerificationError(authError("bad_email", "Invalid email"))).toBe(
      "resend_invalid_email",
    );
  });

  it("detects Supabase's ambiguous existing-account sign-up response", () => {
    expect(
      isAmbiguousSignUpUser({
        user: { identities: [] },
        session: null,
      }),
    ).toBe(true);
    expect(
      isAmbiguousSignUpUser({
        user: { identities: [{}] },
        session: null,
      }),
    ).toBe(false);
  });
});

function authError(code: string, message: string, status = 400) {
  return { code, message, status, name: "AuthApiError" };
}
