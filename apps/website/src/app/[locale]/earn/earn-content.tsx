"use client";

import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Dumbbell,
  FileCheck2,
  HandHeart,
  ListPlus,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { AudienceHero } from "@/components/site/audience-hero";
import { ValueCards } from "@/components/site/value-cards";
import { FlowSteps } from "@/components/site/flow-steps";
import { AudienceCta } from "@/components/site/audience-cta";
import { LifterIllustration, LifterGlyph } from "@/components/site/illustrations";

export function EarnContent() {
  return (
    <>
      <SiteNav />
      <main>
        <AudienceHero
          ns="earn"
          illustration={<LifterIllustration className="w-[270px] sm:w-[340px]" />}
        />
        <ValueCards
          ns="earn"
          k="role"
          columns={3}
          surface="white"
          icons={[LifterGlyph, HandHeart, Dumbbell]}
        />
        <ValueCards
          ns="earn"
          k="who"
          columns={4}
          surface="paper"
          icons={[Users, MessageCircle, Dumbbell, ShieldCheck]}
        />
        <ValueCards
          ns="earn"
          k="levels"
          columns={3}
          surface="white"
          icons={[UserCheck, FileCheck2, BadgeCheck]}
        />
        <FlowSteps
          ns="earn"
          id="partner-process"
          icons={[ListPlus, ClipboardList, BadgeCheck, CalendarClock]}
          surface="paper"
        />
        <ValueCards
          ns="earn"
          k="standards"
          columns={4}
          surface="white"
          icons={[ShieldCheck, SlidersHorizontal, MessageCircle, FileCheck2]}
        />
        <AudienceCta ns="earn" />
      </main>
      <SiteFooter />
    </>
  );
}
