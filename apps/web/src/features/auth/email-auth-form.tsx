"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { buildAuthCallbackUrl, getTrustedAppOrigin } from "@/lib/auth-callback";
import {
  firstInvalidAuthField,
  isAmbiguousSignUpUser,
  isValidEmail,
  mapAuthError,
  mapResendVerificationError,
  normalizeEmail,
  validateAuthFields,
  type AuthErrorCode,
  type AuthFormField,
  type FieldErrors,
  type ResendVerificationErrorCode,
} from "@/lib/auth-errors";
import { cn } from "@/lib/utils";
import {
  rememberPendingVerificationEmail,
  resendVerificationEmail,
  signUpConsentMetadata,
} from "./auth-actions";
import { PasswordField } from "./password-field";
import { ConsentCheckboxRow } from "@/features/legal/consent-checkbox-row";

type ResendState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: ResendVerificationErrorCode };

/** Email + password auth. Sign-up sends a confirmation email; sign-in requires
 *  a confirmed account. */
export function EmailAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const isSignUp = mode === "sign-up";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // A10: sign-up requires accepting Terms/Privacy/Risk-Disclosure. Not
  // relevant to sign-in, so this never blocks that mode.
  const [consentChecked, setConsentChecked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendLocked, setResendLocked] = useState(false);
  const [resendState, setResendState] = useState<ResendState>({
    status: "idle",
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const resendLockTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resendLockTimer.current) window.clearTimeout(resendLockTimer.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResendState({ status: "idle" });

    const nextFieldErrors = validateAuthFields({
      mode,
      email,
      password,
      confirmPassword,
    });

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }

    // A10: sign-up is blocked until Terms/Privacy/Risk Disclosure are
    // accepted. Not applicable to sign-in.
    if (isSignUp && !consentChecked) {
      setFormError("auth_consent_required");
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const normalizedEmail = normalizeEmail(email);
    const home = getLocalizedPath("/", locale);
    const appOrigin = getTrustedAppOrigin(
      typeof window !== "undefined" ? window.location.origin : undefined,
    );

    try {
      if (!SUPABASE_CONFIGURED) {
        setFormError("auth_service_unavailable");
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: appOrigin
              ? buildAuthCallbackUrl({ origin: appOrigin, locale, next: home })
              : undefined,
            // A10: consent version labels, written to auth.users.raw_user_meta_data
            // and read back by handle_new_user() to write consent_records — see
            // signUpConsentMetadata()'s comment for why this isn't a separate
            // post-signup RPC call.
            data: signUpConsentMetadata(),
          },
        });
        if (error) throw error;

        if (data.session) {
          router.push(home);
          router.refresh();
          return;
        }

        if (isAmbiguousSignUpUser(data)) {
          setFormError("auth_account_exists_or_unverified");
          return;
        }

        rememberPendingVerificationEmail(normalizedEmail);
        router.push(getLocalizedPath("/verify-pending", locale));
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      router.push(home);
      router.refresh();
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = normalizeEmail(email);
    setResendState({ status: "idle" });

    if (!isValidEmail(normalizedEmail)) {
      const nextFieldErrors: FieldErrors = {
        email: email ? "field_email_invalid" : "field_email_required",
      };
      setFieldErrors(nextFieldErrors);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }

    setFieldErrors((current) => ({ ...current, email: undefined }));
    setResendLoading(true);

    try {
      await resendVerificationEmail(normalizedEmail, locale);
      rememberPendingVerificationEmail(normalizedEmail);
      setResendState({ status: "success" });
      setResendLocked(true);
      if (resendLockTimer.current) {
        window.clearTimeout(resendLockTimer.current);
      }
      resendLockTimer.current = window.setTimeout(() => {
        setResendLocked(false);
      }, 10000);
    } catch (error) {
      setResendState({
        status: "error",
        code: mapResendVerificationError(error),
      });
    } finally {
      setResendLoading(false);
    }
  }

  function setFieldValue(field: AuthFormField, value: string) {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    setResendState({ status: "idle" });
  }

  function focusFirstInvalidField(errors: FieldErrors) {
    const first = firstInvalidAuthField(errors);
    if (first === "email") emailRef.current?.focus();
    if (first === "password") passwordRef.current?.focus();
    if (first === "confirmPassword") confirmPasswordRef.current?.focus();
  }

  const showResend =
    formError === "auth_email_not_verified" ||
    formError === "auth_account_exists_or_unverified";
  const forgotHref = getLocalizedPath("/forgot-password", locale);
  const pendingHref = getLocalizedPath("/verify-pending", locale);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        ref={emailRef}
        id={`${mode}-email`}
        label={t("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setFieldValue("email", e.target.value)}
        placeholder={t("emailPlaceholder")}
        error={fieldErrors.email ? t(`fieldErrors.${fieldErrors.email}`) : null}
        className="text-base sm:text-sm"
      />

      <PasswordField
        ref={passwordRef}
        id={`${mode}-password`}
        label={t("password")}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        minLength={6}
        value={password}
        onChange={(e) => setFieldValue("password", e.target.value)}
        placeholder={t("passwordPlaceholder")}
        error={
          fieldErrors.password ? t(`fieldErrors.${fieldErrors.password}`) : null
        }
        toggleLabel={t("passwordToggle")}
        showLabel={t("showPassword")}
        hideLabel={t("hidePassword")}
      />

      {isSignUp && (
        <PasswordField
          ref={confirmPasswordRef}
          id="sign-up-confirm-password"
          label={t("confirmPassword")}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setFieldValue("confirmPassword", e.target.value)}
          placeholder={t("confirmPasswordPlaceholder")}
          error={
            fieldErrors.confirmPassword
              ? t(`fieldErrors.${fieldErrors.confirmPassword}`)
              : null
          }
          toggleLabel={t("passwordToggle")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
        />
      )}

      {isSignUp && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("passwordRequirement")}
        </p>
      )}

      {isSignUp && (
        <ConsentCheckboxRow
          id="sign-up-consent"
          checked={consentChecked}
          onChange={(checked) => {
            setConsentChecked(checked);
            setFormError(null);
          }}
          label="signUpAgreement"
          documents={[
            { slug: "terms_of_service", labelKey: "terms_of_service.linkLabel" },
            { slug: "privacy_policy", labelKey: "privacy_policy.linkLabel" },
            { slug: "risk_disclosure", labelKey: "risk_disclosure.linkLabel" },
          ]}
        />
      )}

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <p>{t(`errors.${formError}`)}</p>
          {showResend && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg bg-card text-foreground"
                disabled={resendLoading || resendLocked}
                onClick={handleResendVerification}
              >
                {resendLoading && <Loader2 size={15} className="animate-spin" />}
                {t("resend.cta")}
              </Button>
              <Link
                href={pendingHref}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                {t("resend.openPending")}
              </Link>
            </div>
          )}
        </div>
      )}

      {resendState.status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="flex gap-2 rounded-lg border border-border bg-accent/35 px-3 py-2.5 text-sm text-foreground"
        >
          <MailCheck size={17} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("resend.success")}</span>
        </div>
      )}

      {resendState.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`resend.errors.${resendState.code}`)}
        </p>
      )}

      {!isSignUp && (
        <div className="flex justify-end">
          <Link
            href={forgotHref}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t("forgotPassword")}
          </Link>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className={cn("h-11 w-full rounded-xl", loading && "cursor-wait")}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading
          ? isSignUp
            ? t("creatingAccount")
            : t("signingIn")
          : isSignUp
            ? t("signUpCta")
            : t("signInCta")}
      </Button>
    </form>
  );
}
