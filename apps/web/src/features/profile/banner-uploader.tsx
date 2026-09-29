"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/toast";
import { validateBannerFile } from "./banner";
import { removeBanner, uploadBanner } from "./profile-actions";

/** Wide cover photo with hover edit/remove controls. Falls back to the brand
 *  gradient when no banner is set. Mirrors the avatar upload flow. */
export function BannerUploader({
  bannerUrl,
  disabled,
  className,
}: {
  bannerUrl: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("profile");
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(bannerUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    const invalid = validateBannerFile(file);
    if (invalid) {
      setError(t(invalid === "type" ? "bannerHintType" : "bannerHintSize"));
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const url = await uploadBanner(file);
      setPreview(url);
      toast.show(t("toast.bannerUpdated"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      toast.show(t("toast.bannerFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    try {
      await removeBanner();
      setPreview(null);
      toast.show(t("toast.bannerRemoved"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      toast.show(t("toast.bannerFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="h-28 w-full bg-cover bg-center sm:h-36"
        style={
          preview
            ? { backgroundImage: `url(${preview})` }
            : {
                backgroundImage:
                  "linear-gradient(135deg, var(--hero-from), var(--hero-to))",
              }
        }
      />

      {!disabled && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label={t("banner.edit")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Camera size={16} />
            )}
          </button>
          {preview && !busy && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t("banner.remove")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="absolute inset-x-0 bottom-1 px-3 text-center text-xs text-white drop-shadow">
          {error}
        </p>
      )}

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
