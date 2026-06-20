"use client";

import { Dumbbell, HandHeart, ListPlus, Tag, Wallet, Clock, Compass, ShieldCheck } from "lucide-react";
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
          k="who"
          columns={3}
          surface="white"
          icons={[LifterGlyph, Dumbbell, HandHeart]}
        />
        <FlowSteps ns="earn" icons={[ListPlus, Tag, Wallet]} surface="paper" />
        <ValueCards
          ns="earn"
          k="benefits"
          columns={4}
          surface="white"
          icons={[Tag, Clock, Compass, ShieldCheck]}
        />
        <AudienceCta ns="earn" />
      </main>
      <SiteFooter />
    </>
  );
}
