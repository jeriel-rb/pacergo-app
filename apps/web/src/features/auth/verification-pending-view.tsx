"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import {
  isValidEmail,
  mapResendVerificationError,
  normalizeEmail,
  type ResendVerificationErrorCode,
} from "@/lib/auth-errors";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  readPendingVerificationEmail,
  rememberPendingVerificationEmail,
  resendVerificationEmail,
} from "./auth-actions";

type ResendState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: ResendVerificationErrorCode };

export function VerificationPendingView() {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const [email, setEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendState, setResendState] = useState<ResendState>({
    status: "idle",
  });

  useEffect(() => {
    const storedEmail = readPendingVerificationEmail();
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      setEditingEmail(true);
    }
  }, []);

  async function handleResend() {
    const normalizedEmail = normalizeEmail(email);
    setEmailError(null);
    setResendState({ status: "idle" });

    if (!isValidEmail(normalizedEmail)) {
      setEmailError(
        t(
          email
            ? "fieldErrors.field_email_invalid"
            : "fieldErrors.field_email_required",
        ),
      );
      return;
    }

    setResendLoading(true);
    try {
      await resendVerificationEmail(normalizedEmail, locale);
      rememberPendingVerificationEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setEditingEmail(false);
      setResendState({ status: "success" });
    } catch (error) {
      setResendState({
        status: "error",
        code: mapResendVerificationError(error),
      });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <MailCheck size={28} />
      </span>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-primary">
          {t("brand")}
        </p>
        <h1 className="text-2xl font-bold">{t("pending.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {email && !editingEmail
            ? t("pending.bodyWithEmail", { email })
            : t("pending.body")}
        </p>
      </div>

      <div className="space-y-3 text-left">
        {(editingEmail || !email) && (
          <Input
            label={t("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
              setResendState({ status: "idle" });
            }}
            placeholder={t("emailPlaceholder")}
            error={emailError}
            className="text-base sm:text-sm"
          />
        )}

        {email && !editingEmail && (
          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-center text-sm font-medium text-foreground">
            {email}
          </div>
        )}

        <Button
          type="button"
          className="h-11 w-full rounded-xl"
          disabled={resendLoading}
          onClick={handleResend}
        >
          {resendLoading && <Loader2 size={16} className="animate-spin" />}
          {t("pending.resendCta")}
        </Button>

        {email && !editingEmail && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-xl"
            onClick={() => {
              setEditingEmail(true);
              setResendState({ status: "idle" });
            }}
          >
            {t("pending.changeEmail")}
          </Button>
        )}
      </div>

      {resendState.status === "success" && (
        <p role="status" aria-live="polite" className="text-sm text-foreground">
          {t("resend.success")}
        </p>
      )}

      {resendState.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`resend.errors.${resendState.code}`)}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("pending.spamHint")}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={getLocalizedPath("/sign-in", locale)}
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          {t("signInLink")}
        </Link>
        <Link
          href={getLocalizedPath("/sign-up", locale)}
          className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl")}
        >
          {t("pending.createDifferent")}
        </Link>
      </div>
    </Card>
  );
}
