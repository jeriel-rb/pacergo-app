export const MIN_PASSWORD_LENGTH = 6;

export type AuthMode = "sign-in" | "sign-up";

export type AuthFormField = "email" | "password" | "confirmPassword";

export type AuthFormFieldErrorCode =
  | "field_email_required"
  | "field_email_invalid"
  | "field_password_required"
  | "field_password_too_short"
  | "field_confirm_password_required"
  | "field_password_mismatch";

export type AuthErrorCode =
  | "auth_invalid_credentials"
  | "auth_email_not_verified"
  | "auth_rate_limited"
  | "auth_account_exists_or_unverified"
  | "auth_network_error"
  | "auth_unknown";

export type ResendVerificationErrorCode =
  | "resend_invalid_email"
  | "resend_rate_limited"
  | "resend_failed";

export type FieldErrors = Partial<Record<AuthFormField, AuthFormFieldErrorCode>>;

type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function validateAuthFields({
  mode,
  email,
  password,
  confirmPassword,
}: {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!normalizeEmail(email)) {
    errors.email = "field_email_required";
  } else if (!isValidEmail(email)) {
    errors.email = "field_email_invalid";
  }

  if (!password) {
    errors.password = "field_password_required";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "field_password_too_short";
  }

  if (mode === "sign-up") {
    if (!confirmPassword) {
      errors.confirmPassword = "field_confirm_password_required";
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = "field_password_mismatch";
    }
  }

  return errors;
}

export function firstInvalidAuthField(errors: FieldErrors): AuthFormField | null {
  if (errors.email) return "email";
  if (errors.password) return "password";
  if (errors.confirmPassword) return "confirmPassword";
  return null;
}

export function mapAuthError(error: unknown): AuthErrorCode {
  const details = normalizeErrorLike(error);
  const code = details.code;
  const message = details.message;

  if (isNetworkError(details)) return "auth_network_error";
  if (isRateLimited(details)) return "auth_rate_limited";
  if (
    code.includes("email_not_confirmed") ||
    code.includes("email_not_verified") ||
    message.includes("email not confirmed") ||
    message.includes("email not verified") ||
    message.includes("confirm your email")
  ) {
    return "auth_email_not_verified";
  }
  if (
    code.includes("invalid_credentials") ||
    code.includes("invalid_login") ||
    code.includes("invalid_grant") ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "auth_invalid_credentials";
  }
  if (
    code.includes("user_already_exists") ||
    code.includes("email_exists") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already")
  ) {
    return "auth_account_exists_or_unverified";
  }

  return "auth_unknown";
}

export function mapResendVerificationError(
  error: unknown,
): ResendVerificationErrorCode {
  const details = normalizeErrorLike(error);

  if (isRateLimited(details)) return "resend_rate_limited";
  if (
    details.code.includes("email") ||
    details.message.includes("invalid email")
  ) {
    return "resend_invalid_email";
  }
  return "resend_failed";
}

export function isAmbiguousSignUpUser(data: {
  user?: { identities?: unknown[] | null } | null;
  session?: unknown | null;
}): boolean {
  return Boolean(
    data.user &&
      !data.session &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0,
  );
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
