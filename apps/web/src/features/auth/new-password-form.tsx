"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  firstInvalidAuthField,
  validatePasswordUpdateFields,
  type FieldErrors,
} from "@/lib/auth-errors";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import {
  safeForgotPasswordPath,
  safeSignInPath,
  type PasswordUpdateErrorCode,
} from "@/lib/password-reset";
import { buttonVariants, Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PasswordField } from "./password-field";

const PASSWORD_UPDATE_ERRORS: PasswordUpdateErrorCode[] = [
  "password_update_session_missing",
  "password_update_link_expired",
  "password_update_link_invalid",
  "password_update_link_used",
  "password_update_invalid_password",
  "password_update_same_password",
  "password_update_rate_limited",
  "password_update_network_error",
  "password_update_failed",
  "password_update_unknown",
];

export function NewPasswordForm() {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [updateError, setUpdateError] = useState<PasswordUpdateErrorCode | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setUpdateError(null);

    const nextFieldErrors = validatePasswordUpdateFields({
      password,
      confirmPassword,
    });

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch(getLocalizedPath("/auth/recovery/password", locale), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await parsePasswordUpdateResponse(response);

      if (!response.ok || !result.success) {
        setUpdateError(result.error ?? "password_update_failed");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (error) {
      setUpdateError(
        error instanceof TypeError
          ? "password_update_network_error"
          : "password_update_unknown",
      );
    } finally {
      setLoading(false);
    }
  }

  function focusFirstInvalidField(errors: FieldErrors) {
    const first = firstInvalidAuthField(errors);
    if (first === "password") passwordRef.current?.focus();
    if (first === "confirmPassword") confirmPasswordRef.current?.focus();
  }

  if (success) {
    return (
      <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <CheckCircle2 size={28} />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-primary">
            {t("brand")}
          </p>
          <h1 className="text-2xl font-bold">
            {t("newPassword.successTitle")}
          </h1>
          <p
            role="status"
            aria-live="polite"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {t("newPassword.successBody")}
          </p>
        </div>
        <Link
          href={safeSignInPath(locale)}
          className={cn(buttonVariants(), "h-11 w-full rounded-xl")}
        >
          {t("newPassword.returnToSignIn")}
        </Link>
      </Card>
    );
  }

  if (updateError === "password_update_session_missing") {
    return <PasswordResetStatusCard error={updateError} />;
  }

  return (
    <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <KeyRound size={28} />
      </span>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-primary">
          {t("brand")}
        </p>
        <h1 className="text-2xl font-bold">{t("newPassword.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("newPassword.body")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
        <PasswordField
          ref={passwordRef}
          id="new-password"
          label={t("newPassword.password")}
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
            setUpdateError(null);
          }}
          placeholder={t("passwordPlaceholder")}
          error={
            fieldErrors.password ? t(`fieldErrors.${fieldErrors.password}`) : null
          }
          toggleLabel={t("passwordToggle")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
        />

        <PasswordField
          ref={confirmPasswordRef}
          id="confirm-new-password"
          label={t("newPassword.confirmPassword")}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
            setUpdateError(null);
          }}
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

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("passwordRequirement")}
        </p>

        {updateError && (
          <p role="alert" className="text-sm text-destructive">
            {t(`newPassword.inlineErrors.${updateError}`)}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className={cn("h-11 w-full rounded-xl", loading && "cursor-wait")}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? t("newPassword.updating") : t("newPassword.submit")}
        </Button>
      </form>
    </Card>
  );
}

export function PasswordResetStatusCard({
  error,
}: {
  error: PasswordUpdateErrorCode;
}) {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);

  return (
    <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <KeyRound size={28} />
      </span>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-primary">
          {t("brand")}
        </p>
        <h1 className="text-2xl font-bold">
          {t(`newPassword.errors.${error}.title`)}
        </h1>
        <p
          role="alert"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {t(`newPassword.errors.${error}.body`)}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={safeForgotPasswordPath(locale)}
          className={cn(buttonVariants(), "h-11 rounded-xl")}
        >
          {t("newPassword.requestNewLink")}
        </Link>
        <Link
          href={safeSignInPath(locale)}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl")}
        >
          {t("newPassword.returnToSignIn")}
        </Link>
      </div>
    </Card>
  );
}

async function parsePasswordUpdateResponse(response: Response): Promise<{
  success: boolean;
  error?: PasswordUpdateErrorCode;
}> {
  try {
    const result = (await response.json()) as {
      success?: unknown;
      error?: unknown;
    };
    const error =
      typeof result.error === "string" &&
      PASSWORD_UPDATE_ERRORS.includes(result.error as PasswordUpdateErrorCode)
        ? (result.error as PasswordUpdateErrorCode)
        : undefined;

    return { success: result.success === true, error };
  } catch {
    return { success: false, error: "password_update_unknown" };
  }
}
