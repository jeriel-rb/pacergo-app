"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@pacergo/shared";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { SaveButton } from "@/shared/components/atoms/save-button";
import { useToast } from "@/shared/components/ui/toast";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";
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
  const [error, setError] = useState<string | null>(null);
  const { dirty, markClean } = useFormDirty({ displayName, bio, homeArea });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;
    setError(null);
    setSaving(true);
    try {
      await updateProfileFields({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        home_area: homeArea.trim() || null,
      });
      markClean();
      toast.show(t("toast.profileSaved"), "success");
      router.refresh();
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

      <SaveButton type="submit" dirty={dirty} saving={saving} disabled={disabled} label={t("save")} />
    </form>
  );
}
