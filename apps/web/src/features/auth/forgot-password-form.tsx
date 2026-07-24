"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import {
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth-errors";
import {
  mapPasswordResetRequestError,
  type PasswordResetRequestErrorCode,
} from "@/lib/password-reset";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { requestPasswordResetEmail } from "./auth-actions";

export function ForgotPasswordForm() {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const signInHref = getLocalizedPath("/sign-in", locale);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [requestError, setRequestError] =
    useState<PasswordResetRequestErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setRequestError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmailError(
        t(
          normalizedEmail
            ? "fieldErrors.field_email_invalid"
            : "fieldErrors.field_email_required",
        ),
      );
      emailRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetEmail(normalizedEmail, locale);
      setEmail(normalizedEmail);
      setSent(true);
    } catch (error) {
      const code = mapPasswordResetRequestError(error);
      if (code === "password_reset_request_failed") {
        setEmail(normalizedEmail);
        setSent(true);
        return;
      }
      setRequestError(code);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <MailCheck size={28} />
        </span>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-primary">
            {t("brand")}
          </p>
          <h1 className="text-2xl font-bold">{t("forgot.successTitle")}</h1>
          <p
            role="status"
            aria-live="polite"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {t("forgot.successBody")}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("forgot.spamHint")}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={signInHref}
            className={cn(buttonVariants(), "h-11 rounded-xl")}
          >
            {t("forgot.backToSignIn")}
          </Link>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => {
              setSent(false);
              setRequestError(null);
            }}
          >
            {t("forgot.requestAnother")}
          </Button>
        </div>
      </Card>
    );
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
        <h1 className="text-2xl font-bold">{t("forgot.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("forgot.body")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
        <Input
          ref={emailRef}
          label={t("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
            setRequestError(null);
          }}
          placeholder={t("emailPlaceholder")}
          error={emailError}
          className="text-base sm:text-sm"
        />

        {requestError && (
          <p role="alert" className="text-sm text-destructive">
            {t(`forgot.errors.${requestError}`)}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className={cn("h-11 w-full rounded-xl", loading && "cursor-wait")}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? t("forgot.sending") : t("forgot.submit")}
        </Button>
      </form>

      <Link
        href={signInHref}
        className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
      >
        {t("forgot.backToSignIn")}
      </Link>
    </Card>
  );
}
