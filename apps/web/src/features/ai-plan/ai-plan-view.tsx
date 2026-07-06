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

/** Example presets shown at the bottom — each fills goal + level and scrolls up. */
const EXAMPLES: { key: string; goal: TrainingGoal; level: ExperienceLevel }[] = [
  { key: "muscleBeginner", goal: "muscle_gain", level: "beginner" },
  { key: "endurance", goal: "endurance", level: "intermediate" },
  { key: "fatLoss", goal: "fat_loss", level: "intermediate" },
  { key: "flexibility", goal: "flexibility", level: "beginner" },
  { key: "functional", goal: "functional", level: "intermediate" },
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

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setGoal(ex.goal);
    setLevel(ex.level);
    if (!ageBand) setAgeBand("adult");
    setPlan(null);
    setError(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <GradientHeader className="rounded-[24px] p-6 text-center shadow-lg shadow-primary/20">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Sparkles size={24} />
        </span>
        <h1 className="mt-3 text-2xl font-bold">{t("title")}</h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-white/85">
          {t("subtitle")}
        </p>
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
      <Card className="space-y-4 p-4 sm:p-5">
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
      <Card className="space-y-4 p-4 sm:p-5">
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
      <Card className="space-y-4 p-4 sm:p-5">
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
    <div className="space-y-1.5">
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
