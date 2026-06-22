"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { validateAvatarFile } from "./avatar";
import { uploadAvatar } from "./profile-actions";

/** Avatar with an upload control. Validates, uploads to Storage, refreshes. */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <InitialAvatar name={name} src={preview} size={72} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 size={20} className="animate-spin text-white" />
          </span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Camera size={15} />
          {busy ? t("uploading") : t("editPhoto")}
        </button>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
