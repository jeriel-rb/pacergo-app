"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiPlanHref } from "@/lib/ai-plan-path";
import { beginPlanGeneration, composeSavedPlan, saveTrainingPlan } from "@/lib/plans";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";

const DURATION_MS = 4500;
const CHECKLIST_KEYS = [
  "analyzing",
  "selecting",
  "calibrating",
  "designing",
  "finalizing",
] as const;

const RADIUS = 88;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Full-custom screen (no shell chrome, matches the reference — no back
 *  chevron, no progress bar) that animates a 0→100% ring while the
 *  checklist below ticks through in sequence, then hands off to the summary
 *  screen. The ring's pace is decorative (a minimum-duration UX flourish),
 *  but the plan behind it is real: `composeSavedPlan` runs in parallel, and navigation waits for both to finish. */
export function CreatingPlanView() {
  const { t } = useTranslation("onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const {
    answers,
    trainingPreferences,
    gymEquipment,
    setGeneratedPlan,
    setSavedPlanId,
    markStepComplete,
    persistProfile,
  } = useOnboarding();
  const [percent, setPercent] = React.useState(0);

  const work = React.useRef({
    answers,
    trainingPreferences,
    gymEquipment,
    persistProfile,
    setGeneratedPlan,
    setSavedPlanId,
    markStepComplete,
    router,
    pathname,
    t,
  });
  work.current = {
    answers,
    trainingPreferences,
    gymEquipment,
    persistProfile,
    setGeneratedPlan,
    setSavedPlanId,
    markStepComplete,
    router,
    pathname,
    t,
  };

  React.useEffect(() => {
    let cancelled = false;
    let animationDone = false;
    let generationDone = false;

    function proceedIfReady() {
      if (cancelled || !animationDone || !generationDone) return;
      const { router: go, pathname: path } = work.current;
      go.push(aiPlanHref(path, "/plan-ready"));
    }

    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const next = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
      setPercent(next);
      if (next < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          animationDone = true;
          proceedIfReady();
        }, 500);
      }
    }
    raf = requestAnimationFrame(tick);

    // The ring is a minimum wait. The plan is built in parallel, and the next
    // screen is the retry surface if the build fails. Profile save and the
    // resume marker are safety nets: a failure there must not block the plan.
    const current = work.current;
    (async () => {
      await current.persistProfile().catch(() => undefined);
      await beginPlanGeneration().catch(() => undefined);
      try {
        const snapshot = {
          answers: current.answers,
          trainingPreferences: current.trainingPreferences,
          gymEquipment: current.gymEquipment,
        };
        const plan = await composeSavedPlan(snapshot);
        if (cancelled) return;
        current.setGeneratedPlan(plan);
        const planId = await saveTrainingPlan({
          label: snapshot.answers.goal
            ? current.t(`goal.options.${snapshot.answers.goal}.title`)
            : current.t("gymEquipment.planReady.headline"),
          plan,
          onboardingSnapshot: snapshot,
        });
        if (cancelled) return;
        current.setSavedPlanId(planId);
        current.markStepComplete("gymEquipment");
      } catch {
        // plan-ready offers the retry. Leave the saved id unset.
      } finally {
        generationDone = true;
        proceedIfReady();
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const offset = CIRCUMFERENCE * (1 - percent / 100);
  const thresholdFor = (i: number) => ((i + 1) / CHECKLIST_KEYS.length) * 100;
  const currentIndex = CHECKLIST_KEYS.findIndex((_, i) => percent < thresholdFor(i));

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-8 px-4">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            strokeWidth={STROKE}
            fill="none"
            className="stroke-muted"
          />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="stroke-foreground transition-[stroke-dashoffset] duration-150 ease-linear"
          />
        </svg>
        <span
          className="absolute text-4xl font-extrabold tabular-nums"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {percent}%
        </span>
      </div>

      <p className="text-center text-lg font-semibold">
        {t("gymEquipment.creatingPlan.title")}
      </p>

      <div className="w-full space-y-2.5">
        {CHECKLIST_KEYS.map((key, i) => {
          const state =
            i < currentIndex || percent >= 100
              ? "done"
              : i === currentIndex
                ? "active"
                : "pending";
          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3.5",
                state === "pending" ? "bg-muted/50" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "pending" && "text-muted-foreground",
                )}
              >
                {t(`gymEquipment.creatingPlan.steps.${key}`)}
              </span>
              {state === "done" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {state === "active" && (
                <Loader2 size={18} className="shrink-0 animate-spin text-foreground" />
              )}
              {state === "pending" && (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-border"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
