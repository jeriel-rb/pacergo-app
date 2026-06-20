import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { Steps } from "@/components/site/steps";
import { Tiers } from "@/components/site/tiers";
import { Safety } from "@/components/site/safety";
import { Cta } from "@/components/site/cta";
import { SiteFooter } from "@/components/site/site-footer";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <Steps />
        <Tiers />
        <Safety />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}
