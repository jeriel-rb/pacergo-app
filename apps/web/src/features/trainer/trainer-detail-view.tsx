"use client";

import { usePathname } from "next/navigation";
import type { CompanionOffering, TrainerProfile } from "@pacergo/shared";
import { TrainerDetailHeader } from "./trainer-detail-header";
import {
  ServiceTags,
  BioSection,
  GymMemberships,
  AvailabilityList,
  ReviewsSection,
} from "./trainer-sections";
import { PlatformManagerCard } from "./platform-manager-card";
import { BookingCTA } from "./booking-cta";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

export function TrainerDetailView({
  trainer,
  offerings,
  currentUserId,
  canMessage = false,
}: {
  trainer: TrainerProfile;
  offerings: CompanionOffering[];
  currentUserId: string | null;
  /** True when the viewer already has a booking with this trainer. */
  canMessage?: boolean;
}) {
  const pathname = usePathname();
  const backHref = getLocalizedPath("/trainers", getCurrentLocale(pathname));
  const showMessage = canMessage && currentUserId !== trainer.id;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <TrainerDetailHeader
        trainer={trainer}
        backHref={backHref}
        canMessage={showMessage}
      />
      <ServiceTags trainer={trainer} />
      <BioSection trainer={trainer} />
      <GymMemberships trainer={trainer} />
      <AvailabilityList trainer={trainer} />
      <ReviewsSection trainer={trainer} />
      {trainer.manager && <PlatformManagerCard manager={trainer.manager} />}
      <BookingCTA
        companionId={trainer.id}
        companionName={trainer.display_name}
        offerings={offerings}
        price={trainer.price_ntd}
        isFree={trainer.is_free}
        isSelf={currentUserId === trainer.id}
      />
    </div>
  );
}
