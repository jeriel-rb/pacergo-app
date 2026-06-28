"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, Check } from "lucide-react";
import {
  EXPERIENCE_LEVELS,
  GENDERS,
  type ExperienceLevel,
  type Gender,
  type UserProfile,
} from "@pacergo/shared";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { updateProfileFields } from "./profile-actions";
import { cn } from "@/lib/utils";

/** Editable profile fields: name, bio, experience, home area. */
export function ProfileForm({
  profile,
  disabled,
}: {
  profile: UserProfile;
  disabled?: boolean;
}) {
  const { t } = useTranslation("profile");
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [homeArea, setHomeArea] = useState(profile.home_area ?? "");
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    profile.experience_level,
  );
  const [gender, setGender] = useState<Gender | null>(profile.gender ?? null);
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
        experience_level: experience,
        gender,
      });
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
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

      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("fields.experience")}</span>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map((level) => {
            const active = experience === level;
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() =>
                  setExperience((current) =>
                    current === level ? null : level,
                  )
                }
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card hover:bg-accent",
                )}
              >
                {t(`experience.${level}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("fields.gender")}</span>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => {
            const active = gender === g;
            return (
              <button
                key={g}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() =>
                  setGender((current) => (current === g ? null : g))
                }
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card hover:bg-accent",
                )}
              >
                {t(`gender.${g}`)}
              </button>
            );
          })}
        </div>
      </div>

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
