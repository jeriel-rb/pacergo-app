"use client";

import { GymEquipmentShell } from "@/features/ai-plan/onboarding/gym-equipment-shell";

export default function GymEquipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GymEquipmentShell>{children}</GymEquipmentShell>;
}
