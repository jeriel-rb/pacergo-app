"use client";

import { usePathname } from "next/navigation";
import type { TrainerProfile } from "@pacergo/shared";
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

export function TrainerDetailView({ trainer }: { trainer: TrainerProfile }) {
  const pathname = usePathname();
  const backHref = getLocalizedPath("/trainers", getCurrentLocale(pathname));

  return (
    <div className="space-y-4">
      <TrainerDetailHeader trainer={trainer} backHref={backHref} />
      <ServiceTags trainer={trainer} />
      <BioSection trainer={trainer} />
      <GymMemberships trainer={trainer} />
      <AvailabilityList trainer={trainer} />
      <ReviewsSection trainer={trainer} />
      {trainer.manager && <PlatformManagerCard manager={trainer.manager} />}
      <BookingCTA price={trainer.price_ntd} isFree={trainer.is_free} />
    </div>
  );
}
