"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
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
import { buildAuthCallbackUrl, getTrustedAppOrigin } from "@/lib/auth-callback";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { changeEmail } from "./profile-actions";

export function ChangeEmailDialog({
  open,
  currentEmail,
  onOpenChange,
}: {
  open: boolean;
  currentEmail: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const origin = getTrustedAppOrigin(
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      const redirectTo = origin
        ? buildAuthCallbackUrl({
            origin,
            locale,
            next: getLocalizedPath("/profile", locale),
          })
        : undefined;
      await changeEmail(email.trim(), redirectTo);
      setLoading(false);
      reset();
      onOpenChange(false);
      toast.show(t("changeEmailDialog.sent"), "success");
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
            <DialogTitle>{t("changeEmailDialog.title")}</DialogTitle>
            <DialogDescription>{t("changeEmailDialog.desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label htmlFor="new-email" className="text-sm font-medium">
              {t("changeEmailDialog.newEmail")}
            </label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={currentEmail}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {t("changeEmailDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
