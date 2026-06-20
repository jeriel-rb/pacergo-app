"use client";

import { Search, CalendarCheck, Dumbbell, Ticket, Infinity, Sparkles, MapPin } from "lucide-react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { AudienceHero } from "@/components/site/audience-hero";
import { ValueCards } from "@/components/site/value-cards";
import { FlowSteps } from "@/components/site/flow-steps";
import { AudienceCta } from "@/components/site/audience-cta";

export function FindContent() {
  return (
    <>
      <SiteNav />
      <main>
        <AudienceHero ns="find" />
        <ValueCards
          ns="find"
          k="pains"
          columns={4}
          surface="white"
          icons={[Ticket, Infinity, Sparkles, MapPin]}
        />
        <FlowSteps ns="find" icons={[Search, CalendarCheck, Dumbbell]} surface="paper" />
        <ValueCards ns="find" k="kinds" columns={3} surface="white" />
        <AudienceCta ns="find" />
      </main>
      <SiteFooter />
    </>
  );
}
