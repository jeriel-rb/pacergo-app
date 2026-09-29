"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { validateAvatarFile } from "./avatar";
import { removeAvatar, uploadAvatar } from "./profile-actions";

/** Clickable avatar that opens a change/remove menu, uploads to Storage. */
export function AvatarUploader({
  name,
  photoUrl,
  disabled,
}: {
  name: string;
  photoUrl: string | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation("profile");
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    const invalid = validateAvatarFile(file);
    if (invalid) {
      setError(t(invalid === "type" ? "avatarHintType" : "avatarHintSize"));
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const url = await uploadAvatar(file);
      setPreview(url);
      toast.show(t("toast.avatarUpdated"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      toast.show(t("toast.avatarFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setMenuOpen(false);
    setError(null);
    setBusy(true);
    try {
      await removeAvatar();
      setPreview(null);
      toast.show(t("toast.avatarRemoved"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      toast.show(t("toast.avatarFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        disabled={disabled || busy}
        aria-label={t("photo.title")}
        className="group relative rounded-full disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background enabled:cursor-pointer"
      >
        <InitialAvatar name={name} src={preview} size={72} />
        {!busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100">
            <Camera size={20} />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 size={20} className="animate-spin text-white" />
          </span>
        )}
      </button>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("photo.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                setMenuOpen(false);
                inputRef.current?.click();
              }}
            >
              <Camera size={16} />
              {t("editPhoto")}
            </Button>
            {preview && (
              <Button
                variant="ghost"
                className="justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 size={16} />
                {t("photo.remove")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
