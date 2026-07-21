import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { Steps } from "@/components/site/steps";
import { AiCoach } from "@/components/site/ai-coach";
import { Tiers } from "@/components/site/tiers";
import { TrainingProgress } from "@/components/site/training-progress";
import { Safety } from "@/components/site/safety";
import { Cta } from "@/components/site/cta";
import { SiteFooter } from "@/components/site/site-footer";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Steps />
        <AiCoach />
        <Tiers />
        <TrainingProgress />
        <Safety />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}
