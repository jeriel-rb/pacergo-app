"use client";

import { useTranslation } from "react-i18next";
import type { UserProfile } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { AvatarUploader } from "./avatar-uploader";
import { BannerUploader } from "./banner-uploader";
import { ProfileForm } from "./profile-form";
import { AccountSection } from "./account-section";
import { MeLinks } from "./me-links";

/** Profile page body: identity + editable fields + the account/security section. */
export function ProfileView({
  profile,
  editable,
}: {
  profile: UserProfile | null;
  editable: boolean;
}) {
  const { t } = useTranslation("profile");

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-muted-foreground">
        {t("notSignedIn")}
      </div>
    );
  }

  const disabled = !editable;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {disabled && (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          {t("mockNotice")}
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <BannerUploader bannerUrl={profile.banner_url ?? null} disabled={disabled} />
        <div className="space-y-6 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="relative z-10 -mt-10 w-fit rounded-full ring-4 ring-card">
            <AvatarUploader
              name={profile.display_name}
              photoUrl={profile.photo_url}
              disabled={disabled}
            />
          </div>
          <ProfileForm profile={profile} disabled={disabled} />
        </div>
      </Card>

      <MeLinks isCompanion={profile.is_companion ?? false} />

      <AccountSection profile={profile} disabled={disabled} />
    </div>
  );
}
