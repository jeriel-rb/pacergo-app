"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  CITY_CANONICAL,
  ONBOARDING_EXPERIENCES,
  PRIMARY_ACTIVITIES,
  cityKey,
  normalizeCity,
  type OnboardingExperience,
  type PrimaryActivity,
  type ProfileSetupState,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/components/ui/toast";
import { saveProfileSetup, skipProfileSetup } from "@/lib/profile-setup";
import { cn } from "@/lib/utils";

/** Quick-fill cities (Taichung first — the validation round). Free text is
 *  still allowed; the value goes into the existing home_area field. */
const CITY_SUGGESTIONS = ["taichung", "taipei", "newTaipei", "taoyuan", "hsinchu", "tainan", "kaohsiung"] as const;

/** Skippable first-run Profile Setup, shown once on Home. Collects main
 *  activity, current level and city for new and existing users alike. The
 *  level is the fitness profile's training experience (same question, same
 *  labels), so the AI Training onboarding never asks it again. Closing the
 *  dialog counts as Skip, so it never nags. */
export function ProfileSetupDialog({ initial }: { initial: ProfileSetupState }) {
  const { t } = useTranslation(["home", "onboarding"]);
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(true);
  const [activity, setActivity] = React.useState<PrimaryActivity | null>(initial.primaryActivity);
  const [level, setLevel] = React.useState<OnboardingExperience | null>(initial.experience);
  const [city, setCity] = React.useState(normalizeCity(initial.city));
  const [busy, setBusy] = React.useState<"save" | "skip" | null>(null);

  const complete = activity !== null && level !== null && city.trim() !== "";

  async function onSave() {
    if (!activity || !level) return;
    setBusy("save");
    try {
      await saveProfileSetup({ primaryActivity: activity, experience: level, city });
      toast.show(t("profileSetup.saved"), "success");
      setOpen(false);
      router.refresh();
    } catch {
      toast.show(t("profileSetup.error"), "destructive");
      setBusy(null);
    }
  }

  async function onSkip() {
    setBusy("skip");
    // Skipping must never get in the way: close either way.
    await skipProfileSetup().catch(() => undefined);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && busy === null && void onSkip()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("profileSetup.title")}</DialogTitle>
          <DialogDescription>{t("profileSetup.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Group label={t("profileSetup.activity")}>
            {PRIMARY_ACTIVITIES.map((a) => (
              <Chip key={a} selected={activity === a} onClick={() => setActivity(a)}>
                {t(`profileSetup.activities.${a}`)}
              </Chip>
            ))}
          </Group>

          <Group label={t("profileSetup.level")}>
            {ONBOARDING_EXPERIENCES.map((l) => (
              <Chip key={l} selected={level === l} onClick={() => setLevel(l)}>
                {t(`trainingPreferences.experience.options.${l}.title`, { ns: "onboarding" })}
              </Chip>
            ))}
          </Group>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t("profileSetup.city")}</p>
            <div className="flex flex-wrap gap-2">
              {CITY_SUGGESTIONS.map((c) => {
                // Shown translated, saved as the canonical name.
                return (
                  <Chip key={c} selected={cityKey(city) === c} onClick={() => setCity(CITY_CANONICAL[c])} small>
                    {t(`profileSetup.cities.${c}`)}
                  </Chip>
                );
              })}
            </div>
            <Input
              value={city}
              maxLength={120}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("profileSetup.cityPlaceholder")}
              aria-label={t("profileSetup.city")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
          <Button className="flex-1" onClick={onSave} disabled={!complete || busy !== null}>
            {busy === "save" && <Loader2 size={16} className="animate-spin" />}
            {t("profileSetup.save")}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onSkip} disabled={busy !== null}>
            {t("profileSetup.skip")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  small,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-colors",
        small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
