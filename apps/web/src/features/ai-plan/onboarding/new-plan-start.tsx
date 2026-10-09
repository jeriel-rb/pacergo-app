"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { aiPlanHref } from "@/lib/ai-plan-path";

/** `/ai-plan/new` — My Plans → "New plan" for a user who already has one. Starts a
 *  blank onboarding (no answers carried over from the previous plan) and opens
 *  "Let's Get Started" with every section still to do. Existing plans stay under
 *  My Plans. */
export function NewPlanStart() {
  const { startFresh } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  // The provider hydrates from the saved profile in its own mount effect, which
  // runs after this component's. Wait one render so the reset lands last.
  React.useEffect(() => setReady(true), []);
  // `startFresh` changes identity with every store update, so run once only —
  // otherwise resetting the store would re-trigger this effect forever.
  const started = React.useRef(false);
  React.useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    startFresh();
    router.replace(aiPlanHref(pathname, "/setup"));
  }, [ready, startFresh, router, pathname]);

  return null;
}
