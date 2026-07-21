"use client";

import {
  BadgeCheck,
  ClipboardList,
  Dumbbell,
  Flag,
  Handshake,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UserSearch,
} from "lucide-react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { AudienceHero } from "@/components/site/audience-hero";
import { ValueCards } from "@/components/site/value-cards";
import { AudienceCta } from "@/components/site/audience-cta";
import { CompanionsIllustration } from "@/components/site/illustrations";
import { FindFlow } from "./find-flow";

export function FindContent() {
  return (
    <>
      <SiteNav />
      <main>
        <AudienceHero
          ns="find"
          illustration={<CompanionsIllustration className="w-[300px] sm:w-[360px]" />}
        />
        <FindFlow />
        <ValueCards
          ns="find"
          k="discovery"
          columns={3}
          surface="white"
          icons={[Search, BadgeCheck, MapPin]}
        />
        <ValueCards
          ns="find"
          k="expect"
          columns={4}
          surface="paper"
          icons={[Target, Handshake, Dumbbell, ClipboardList]}
        />
        <ValueCards
          ns="find"
          k="trust"
          columns={4}
          surface="white"
          icons={[UserCheck, Flag, ShieldCheck, Sparkles]}
        />
        <AudienceCta ns="find" />
      </main>
      <SiteFooter />
    </>
  );
}
