"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Flame,
  Dumbbell,
  Activity,
  PersonStanding,
  Leaf,
  Loader2,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  TRAINING_GOALS,
  AGE_BANDS,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  WEIGHT_CLASSES,
  TRAINING_FREQUENCIES,
  TRAINING_LOCATIONS,
  DIET_MODES,
  type TrainingGoal,
  type AgeBand,
  type ExperienceLevel,
  type PlanGender,
  type WeightClass,
  type TrainingFrequency,
  type TrainingLocation,
  type DietMode,
} from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { GradientHeader } from "@/shared/components/atoms/gradient-header";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import { PlanMarkdown } from "./plan-markdown";
import { generateTrainingPlan } from "./actions";

const GOAL_META: Record<TrainingGoal, { icon: LucideIcon; tint: string }> = {
  fat_loss: { icon: Flame, tint: "bg-red-500/10 text-red-500" },
  muscle_gain: { icon: Dumbbell, tint: "bg-blue-500/10 text-blue-500" },
  endurance: { icon: Activity, tint: "bg-emerald-500/10 text-emerald-500" },
  flexibility: { icon: PersonStanding, tint: "bg-violet-500/10 text-violet-500" },
  functional: { icon: Timer, tint: "bg-orange-500/10 text-orange-500" },
};

/** Example presets shown at the bottom — each fills every field (goal
 *  through diet mode) so the generated plan actually matches the example's
 *  description, not just its goal/level. Gender is never included here —
 *  it stays whatever the user (or their profile) already has selected. */
interface PlanExample {
  key: string;
  goal: TrainingGoal;
  level: ExperienceLevel;
  ageBand: AgeBand;
  weightClass: WeightClass;
  frequency: TrainingFrequency;
  location: TrainingLocation;
  nutrition: boolean;
  dietMode: DietMode;
}

const EXAMPLES: PlanExample[] = [
  {
    key: "muscleBeginner",
    goal: "muscle_gain",
    level: "beginner",
    ageBand: "adult",
    weightClass: "medium",
    frequency: "mid",
    location: "home",
    nutrition: true,
    dietMode: "muscle_gain",
  },
  {
    key: "endurance",
    goal: "endurance",
    level: "intermediate",
    ageBand: "adult",
    weightClass: "medium",
    frequency: "mid",
    location: "full_gym",
    nutrition: true,
    dietMode: "none",
  },
  {
    key: "fatLoss",
    goal: "fat_loss",
    level: "intermediate",
    ageBand: "adult",
    weightClass: "medium",
    frequency: "high",
    location: "full_gym",
    nutrition: true,
    dietMode: "fat_loss",
  },
  {
    key: "flexibility",
    goal: "flexibility",
    level: "beginner",
    ageBand: "adult",
    weightClass: "medium",
    frequency: "low",
    location: "home",
    nutrition: false,
    dietMode: "none",
  },
  {
    key: "functional",
    goal: "functional",
    level: "intermediate",
    ageBand: "adult",
    weightClass: "medium",
    frequency: "high",
    location: "full_gym",
    nutrition: true,
    dietMode: "none",
  },
];

export function AiPlanView({
  initialGender,
}: {
  /** Auto-selected from the user's saved profile gender. */
  initialGender: PlanGender;
}) {
  const { t } = useTranslation("aiPlan");
  const locale = useLocale();

  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [gender, setGender] = useState<PlanGender>(initialGender);
  // The remaining dimensions default to the most common answer so three taps
  // (goal / age / level) are enough to generate — but each stays adjustable.
  const [weightClass, setWeightClass] = useState<WeightClass>("medium");
  const [frequency, setFrequency] = useState<TrainingFrequency>("mid");
  const [location, setLocation] = useState<TrainingLocation>("full_gym");
  const [nutrition, setNutrition] = useState(true);
  const [dietMode, setDietMode] = useState<DietMode>("none");

  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const ready = goal !== null && ageBand !== null && level !== null;

  async function onGenerate() {
    if (!ready) return;
    setGenerating(true);
    setError(false);
    setPlan(null);
    try {
      // Composed content — the small floor just lets the animation breathe.
      const [res] = await Promise.all([
        generateTrainingPlan({
          goal,
          gender,
          level,
          ageBand,
          weightClass,
          frequency,
          location,
          nutrition,
          dietMode,
          locale,
        }),
        new Promise((r) => setTimeout(r, 650)),
      ]);
      if ("markdown" in res) setPlan(res.markdown);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setGenerating(false);
    }
  }

  function applyExample(ex: PlanExample) {
    setGoal(ex.goal);
    setLevel(ex.level);
    setAgeBand(ex.ageBand);
    setWeightClass(ex.weightClass);
    setFrequency(ex.frequency);
    setLocation(ex.location);
    setNutrition(ex.nutrition);
    setDietMode(ex.dietMode);
    // Gender is intentionally left untouched — it's a personal attribute,
    // not part of the example, and defaults to the user's saved profile.
    setPlan(null);
    setError(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <GradientHeader className="rounded-[24px] p-6 shadow-lg shadow-primary/20 lg:p-8">
        {/* Same atmospheric treatment as the Home hero banner: soft glows +
            an oversized watermark icon (Sparkles here, matching this
            feature's icon everywhere else on the page). */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/10 blur-2xl"
        />
        <Sparkles
          aria-hidden
          className="pointer-events-none absolute -bottom-3 right-2 h-28 w-28 rotate-12 text-white/10 lg:h-40 lg:w-40"
        />

        <div className="relative min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight lg:text-[32px]">
              {t("title")}
            </h1>
            <BetaBadge className="border-white/30 bg-white/15 text-white/90" />
          </div>
          <p className="mt-1.5 max-w-md text-sm text-white/85 lg:text-base">
            {t("subtitle")}
          </p>
        </div>
      </GradientHeader>

      {/* Training goal */}
      <Card className="p-4 sm:p-5">
        <span className="text-sm font-semibold">{t("goalLabel")}</span>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {TRAINING_GOALS.map((g) => {
            const Meta = GOAL_META[g];
            const Icon = Meta.icon;
            const active = goal === g;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setGoal(g);
                  setPlan(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                    Meta.tint,
                  )}
                >
                  <Icon size={18} />
                </span>
                {t(`goal.${g}`)}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Age band + level + gender */}
      <Card className="space-y-5 p-4 sm:p-5">
        <Segmented
          label={t("ageLabel")}
          options={AGE_BANDS.map((a) => ({ value: a, label: t(`age.${a}`) }))}
          value={ageBand}
          onChange={(v) => {
            setAgeBand(v);
            setPlan(null);
          }}
        />
        <Segmented
          label={t("levelLabel")}
          options={EXPERIENCE_LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))}
          value={level}
          onChange={(v) => {
            setLevel(v);
            setPlan(null);
          }}
        />
        <Segmented
          label={t("genderLabel")}
          options={PLAN_GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
          value={gender}
          onChange={(v) => {
            setGender(v);
            setPlan(null);
          }}
        />
        <Segmented
          label={t("weightLabel")}
          options={WEIGHT_CLASSES.map((w) => ({ value: w, label: t(`weight.${w}`) }))}
          value={weightClass}
          onChange={(v) => {
            setWeightClass(v);
            setPlan(null);
          }}
        />
      </Card>

      {/* Training frequency + location */}
      <Card className="space-y-5 p-4 sm:p-5">
        <Segmented
          label={t("freqLabel")}
          options={TRAINING_FREQUENCIES.map((f) => ({
            value: f,
            label: t(`freq.${f}`),
          }))}
          value={frequency}
          onChange={(v) => {
            setFrequency(v);
            setPlan(null);
          }}
        />
        <Segmented
          label={t("locationLabel")}
          options={TRAINING_LOCATIONS.map((l) => ({
            value: l,
            label: t(`location.${l}`),
          }))}
          value={location}
          onChange={(v) => {
            setLocation(v);
            setPlan(null);
          }}
        />
      </Card>

      {/* Nutrition toggle + diet mode */}
      <Card className="space-y-5 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Leaf size={18} className="text-emerald-500" />
            {t("nutrition")}
          </span>
          <Switch
            checked={nutrition}
            onChange={(v) => {
              setNutrition(v);
              setPlan(null);
            }}
            aria-label={t("nutrition")}
          />
        </div>
        {nutrition && (
          <Segmented
            label={t("dietLabel")}
            options={DIET_MODES.map((d) => ({ value: d, label: t(`diet.${d}`) }))}
            value={dietMode}
            onChange={(v) => {
              setDietMode(v);
              setPlan(null);
            }}
          />
        )}
      </Card>

      <Button
        onClick={onGenerate}
        disabled={!ready || generating}
        className="h-12 w-full gap-2 text-base"
      >
        {generating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Sparkles size={18} />
        )}
        {generating ? t("generating") : t("generate")}
      </Button>

      {/* Result */}
      {generating ? (
        <PlanSkeleton />
      ) : plan ? (
        <Card className="p-5">
          <PlanMarkdown markdown={plan} />
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <Sparkles size={28} className="text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {error ? t("error") : t("empty.title")}
          </p>
          {!error && (
            <p className="text-xs text-muted-foreground/70">{t("empty.sub")}</p>
          )}
        </Card>
      )}

      {/* Examples */}
      <div className="space-y-3 pt-1">
        <span className="text-sm font-semibold">{t("examplesTitle")}</span>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.key}
              type="button"
              onClick={() => applyExample(ex)}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <p className="text-sm font-semibold">{t(`examples.${ex.key}.title`)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(`examples.${ex.key}.sub`)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <Card className="space-y-3 p-5">
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-24 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
    </Card>
  );
}
