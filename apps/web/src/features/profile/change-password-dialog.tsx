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
import { changePassword } from "./profile-actions";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dirty } = useFormDirty({ password, confirm });

  function reset() {
    setPassword("");
    setConfirm("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || loading) return;
    if (password !== confirm) {
      setError(t("changePasswordDialog.mismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await changePassword(password);
      setLoading(false);
      reset();
      onOpenChange(false);
      toast.show(t("changePasswordDialog.done"), "success");
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : t("genericError");
      setError(message);
      toast.show(message, "destructive");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("changePasswordDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("changePasswordDialog.desc")}
            </DialogDescription>
          </DialogHeader>

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <SaveButton
              type="submit"
              dirty={dirty}
              saving={loading}
              label={t("changePasswordDialog.submit")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
