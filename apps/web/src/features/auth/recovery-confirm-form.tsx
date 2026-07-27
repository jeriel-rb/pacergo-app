"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import type { PasswordUpdateErrorCode } from "@/lib/password-reset";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

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

export function RecoveryConfirmForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: string;
}) {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const router = useRouter();
  const locale = getCurrentLocale(pathname);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PasswordUpdateErrorCode | null>(null);

  async function confirmRecovery() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getLocalizedPath("/auth/recovery", locale), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash, type }),
      });
      const result = await parseRecoveryResponse(response);

      if (!response.ok || !result.success) {
        setError(result.error ?? "password_update_failed");
        return;
      }

      router.replace(result.redirectTo ?? getLocalizedPath("/new-password", locale));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "password_update_network_error"
          : "password_update_unknown",
      );
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold">
          {t("newPassword.confirmTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("newPassword.confirmBody")}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`newPassword.inlineErrors.${error}`)}
        </p>
      )}

      <Button
        type="button"
        disabled={loading}
        className={cn("h-11 w-full rounded-xl", loading && "cursor-wait")}
        onClick={confirmRecovery}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading
          ? t("newPassword.confirming")
          : t("newPassword.confirmCta")}
      </Button>
    </Card>
  );
}

async function parseRecoveryResponse(response: Response): Promise<{
  success: boolean;
  redirectTo?: string;
  error?: PasswordUpdateErrorCode;
}> {
  try {
    const result = (await response.json()) as {
      success?: unknown;
      redirectTo?: unknown;
      error?: unknown;
    };
    const error =
      typeof result.error === "string" &&
      PASSWORD_UPDATE_ERRORS.includes(result.error as PasswordUpdateErrorCode)
        ? (result.error as PasswordUpdateErrorCode)
        : undefined;

    return {
      success: result.success === true,
      redirectTo:
        typeof result.redirectTo === "string" ? result.redirectTo : undefined,
      error,
    };
  } catch {
    return { success: false, error: "password_update_unknown" };
  }
}
