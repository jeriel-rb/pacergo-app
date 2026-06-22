"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Mail,
  KeyRound,
  LogOut,
  Trash2,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import type { UserProfile } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/atoms/confirm-dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { ChangePasswordDialog } from "./change-password-dialog";
import { ChangeEmailDialog } from "./change-email-dialog";
import { deleteAccount } from "./profile-actions";

export function AccountSection({
  profile,
  disabled,
}: {
  profile: UserProfile;
  disabled?: boolean;
}) {
  const { t } = useTranslation("profile");
  const router = useRouter();
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);

  const [dialog, setDialog] = useState<null | "password" | "email">(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push(getLocalizedPath("/sign-in", locale));
    router.refresh();
  }

  async function onDelete() {
    await deleteAccount();
    router.push(getLocalizedPath("/sign-in", locale));
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("account.title")}</h2>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {t("account.sub")}
        </p>
      </div>

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-success/10 px-3.5 py-3 text-sm text-success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={t("cancel")}
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-border">
        <AccountRow
          icon={Mail}
          label={t("account.email")}
          value={profile.email}
          actionLabel={t("account.changeEmail")}
          onClick={() => setDialog("email")}
          disabled={disabled}
        />
        <AccountRow
          icon={KeyRound}
          label={t("account.changePassword")}
          actionLabel={t("account.changePassword")}
          onClick={() => setDialog("password")}
          disabled={disabled}
        />
        <AccountRow
          icon={LogOut}
          label={t("account.signOut")}
          onClick={signOut}
          disabled={disabled}
        />
      </ul>

      {/* Danger zone */}
      <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-destructive">
          {t("account.dangerZone")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("account.deleteDesc")}
        </p>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={disabled}
          className="mt-3 gap-2 rounded-xl"
        >
          <Trash2 size={16} />
          {t("account.deleteAccount")}
        </Button>
      </div>

      <ChangePasswordDialog
        open={dialog === "password"}
        onOpenChange={(open) => setDialog(open ? "password" : null)}
        onSuccess={setNotice}
      />
      <ChangeEmailDialog
        open={dialog === "email"}
        currentEmail={profile.email}
        onOpenChange={(open) => setDialog(open ? "email" : null)}
        onSuccess={setNotice}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        title={t("deleteDialog.title")}
        description={t("deleteDialog.desc")}
        confirmKeyword="DELETE"
        confirmKeywordPlaceholder={t("deleteDialog.placeholder")}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={t("cancel")}
        onConfirm={onDelete}
      />
    </Card>
  );
}

function AccountRow({
  icon: Icon,
  label,
  value,
  actionLabel,
  onClick,
  disabled,
}: {
  icon: typeof Mail;
  label: string;
  value?: string;
  actionLabel?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={actionLabel ?? label}
        className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <Icon size={18} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          {value && (
            <span className="block truncate text-xs text-muted-foreground">
              {value}
            </span>
          )}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}
