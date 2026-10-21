"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/toast";
import { SaveButton } from "@/shared/components/atoms/save-button";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";
import { changePassword, sendPasswordChangeCode } from "./profile-actions";

/** "password" = choose the new password; "code" = confirm it with the emailed
 *  code (Supabase asks for one when the session is older than 24 hours). */
type Step = "password" | "code";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dirty } = useFormDirty({ password, confirm });

  function reset() {
    setStep("password");
    setPassword("");
    setConfirm("");
    setCode("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function fail(err: unknown) {
    setLoading(false);
    const message = err instanceof Error ? err.message : t("genericError");
    setError(message);
    toast.show(message, "destructive");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (step === "password") {
      if (!dirty) return;
      if (password !== confirm) {
        setError(t("changePasswordDialog.mismatch"));
        return;
      }
    } else if (!code.trim()) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await changePassword(password, step === "code" ? code.trim() : undefined);
      if (result === "updated") {
        setLoading(false);
        reset();
        onOpenChange(false);
        toast.show(t("changePasswordDialog.done"), "success");
      } else if (result === "code_required") {
        await sendPasswordChangeCode();
        setLoading(false);
        setCode("");
        setStep("code");
      } else {
        setLoading(false);
        setError(t("changePasswordDialog.codeInvalid"));
      }
    } catch (err) {
      fail(err);
    }
  }

  async function onResendCode() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendPasswordChangeCode();
      setLoading(false);
      toast.show(t("changePasswordDialog.codeResent"), "success");
    } catch (err) {
      fail(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("changePasswordDialog.title")}</DialogTitle>
            <DialogDescription>
              {step === "password"
                ? t("changePasswordDialog.desc")
                : t("changePasswordDialog.codeDesc")}
            </DialogDescription>
          </DialogHeader>

          {step === "password" ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-sm font-medium">
                  {t("changePasswordDialog.newPassword")}
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  {t("changePasswordDialog.confirmPassword")}
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="password-change-code" className="text-sm font-medium">
                {t("changePasswordDialog.code")}
              </label>
              <Input
                id="password-change-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                disabled={loading}
                onClick={onResendCode}
              >
                {t("changePasswordDialog.resendCode")}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <SaveButton
              type="submit"
              dirty={step === "password" ? dirty : code.trim().length > 0}
              saving={loading}
              label={t("changePasswordDialog.submit")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
