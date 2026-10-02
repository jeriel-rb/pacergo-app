"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, Check } from "lucide-react";
import type { UserProfile } from "@pacergo/shared";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { updateProfileFields } from "./profile-actions";

/** Editable profile fields: name, bio, home area. (Gender and training level
 *  live in the Fitness Profile, so they're not asked twice.) */
export function ProfileForm({
  profile,
  disabled,
}: {
  profile: UserProfile;
  disabled?: boolean;
}) {
  const { t } = useTranslation("profile");
  const router = useRouter();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [homeArea, setHomeArea] = useState(profile.home_area ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProfileFields({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        home_area: homeArea.trim() || null,
      });
      setSaved(true);
      toast.show(t("toast.profileSaved"), "success");
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      toast.show(t("toast.profileSaveFailed"), "destructive");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label={t("fields.displayName")}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        maxLength={60}
        disabled={disabled}
      />

      <Textarea
        label={t("fields.bio")}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder={t("fields.bioPlaceholder")}
        maxLength={300}
        disabled={disabled}
      />

      <Input
        label={t("fields.homeArea")}
        value={homeArea}
        onChange={(e) => setHomeArea(e.target.value)}
        placeholder={t("fields.homeAreaPlaceholder")}
        maxLength={80}
        disabled={disabled}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving || disabled} className="gap-2">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saved && !saving && <Check size={16} />}
        {saved && !saving ? t("saved") : t("save")}
      </Button>
    </form>
  );
}
