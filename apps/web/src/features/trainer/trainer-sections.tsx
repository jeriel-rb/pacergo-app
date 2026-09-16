"use client";

import {
  Medal,
  UserRound,
  Building2,
  CalendarDays,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerProfile } from "@pacergo/shared";
import { SectionCard } from "@/shared/components/atoms/section-card";
import { ActivityChip } from "@/shared/components/atoms/activity";
import { useLocale } from "@/shared/hooks/use-locale";

const fmtTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
};

export function ServiceTags({ trainer }: { trainer: TrainerProfile }) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();
  return (
    <SectionCard
      icon={<Medal size={18} className="text-primary" />}
      title={t("services")}
    >
      <div className="flex flex-wrap gap-2">
        {trainer.activities.map((slug) => (
          <ActivityChip key={slug} slug={slug} locale={locale} />
        ))}
      </div>
    </SectionCard>
  );
}

export function BioSection({ trainer }: { trainer: TrainerProfile }) {
  const { t } = useTranslation("trainer");
  return (
    <SectionCard
      icon={<UserRound size={18} className="text-primary" />}
      title={t("bio")}
    >
      <p className="text-sm leading-relaxed text-foreground/80">{trainer.bio}</p>
      {trainer.certifications.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("certs")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {trainer.certifications.join(", ")}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

export function GymMemberships({ trainer }: { trainer: TrainerProfile }) {
  const { t } = useTranslation("trainer");
  if (trainer.gym_memberships.length === 0) return null;
  return (
    <SectionCard
      icon={<Building2 size={18} className="text-primary" />}
      title={t("gyms")}
    >
      <ul className="space-y-2">
        {trainer.gym_memberships.map((gym, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-medium">{gym.name}</span>
            {gym.branch && (
              <span className="text-muted-foreground">{gym.branch}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("gymsNote")}</p>
    </SectionCard>
  );
}

export function AvailabilityList({ trainer }: { trainer: TrainerProfile }) {
  const { t } = useTranslation("trainer");
  const weekdays = t("weekdaysShort", { returnObjects: true }) as string[];
  if (trainer.availability.length === 0) return null;
  return (
    <SectionCard
      icon={<CalendarDays size={18} className="text-primary" />}
      title={t("availability")}
    >
      <div className="flex flex-wrap gap-2">
        {trainer.availability.map((slot, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
          >
            <span className="font-medium">{weekdays[slot.weekday]}</span>
            <span className="text-muted-foreground">
              {fmtTime(slot.start_minute)}–{fmtTime(slot.end_minute)}
            </span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("availabilityTz")}</p>
    </SectionCard>
  );
}

export function ReviewsSection({ trainer }: { trainer: TrainerProfile }) {
  const { t } = useTranslation("trainer");
  return (
    <SectionCard
      icon={<Star size={18} className="text-primary" />}
      title={`${t("reviews")} (${trainer.reviews.length})`}
    >
      {trainer.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
      ) : (
        <ul className="space-y-4">
          {trainer.reviews.map((review) => (
            <li key={review.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{review.author_name}</span>
                <span className="text-xs text-muted-foreground">
                  {review.rating.toFixed(1)} ★
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-foreground/80">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
