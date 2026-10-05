"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Ban,
  Crosshair,
  Hourglass,
  Shuffle,
  Target,
  Timer,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_DAYS_PER_WEEK,
  ONBOARDING_DAYS_RECOMMENDED,
  ONBOARDING_DURATION_DEFAULT,
  ONBOARDING_DURATION_MAX,
  ONBOARDING_DURATION_MIN,
  ONBOARDING_DURATION_STEP,
  ONBOARDING_EXPERIENCES,
  ONBOARDING_EXCLUDED_MUSCLES_MAX,
  ONBOARDING_GOALS,
  ONBOARDING_PRIORITIZED_MUSCLES_MAX,
  REST_TIMER_MAX_SEC,
  REST_TIMER_MIN_SEC,
  REST_TIMER_RECOMMENDED_SEC,
  REST_TIMER_STEP_SEC,
  ONBOARDING_VARIETIES,
  TRAINING_PREFERENCES_DEFAULT,
  generateTrainingPlan,
  recommendSplit,
  resolveTrainingDays,
  trainingDaysComplete,
  trainingDaysCount,
  upgradeLegacyEquipment,
  withGymType,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingMuscleGroup,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { CardioPicker } from "@/features/ai-plan/onboarding/cardio-picker";
import { EquipmentPicker } from "@/features/ai-plan/onboarding/equipment-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { SaveButton } from "@/shared/components/atoms/save-button";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";
import { Switch } from "@/shared/components/ui/switch";
import { RangeSlider } from "@/shared/components/ui/range-slider";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { MuscleGrid } from "@/features/ai-plan/onboarding/muscle-grid";
import { fetchAllExercises } from "@/lib/exercises";
import { useDurationFormat } from "@/lib/format-duration";
import {
  fetchFitnessProfile,
  getCurrentUserId,
  saveOnboardingAnswers,
  updateTrainingPlan,
  type PlanOnboardingSnapshot,
} from "@/lib/plans";
import { TrainingDaysPicker } from "@/features/ai-plan/onboarding/training-days-picker";

type FieldKey =
  | "goal"
  | "frequency"
  | "split"
  | "experience"
  | "variety"
  | "duration"
  | "cardio"
  | "gymType"
  | "prioritizedMuscles"
  | "excludedMuscles"
  | "restTimer";

/** Fields needing more than a single tap (a slider, or a toggle plus a
 *  list) keep their editor dialog open until "Done" — every other field
 *  auto-closes the instant an option is picked. */
const MULTI_STEP_FIELDS: readonly FieldKey[] = [
  "frequency",
  "duration",
  "cardio",
  "gymType",
  "prioritizedMuscles",
  "excludedMuscles",
  "restTimer",
];

const SECTIONS: { titleKey: string; keys: FieldKey[] }[] = [
  { titleKey: "update.sections.goalRoutine", keys: ["goal", "frequency", "split"] },
  { titleKey: "update.sections.trainingStyle", keys: ["experience", "variety"] },
  { titleKey: "update.sections.muscles", keys: ["prioritizedMuscles", "excludedMuscles"] },
  { titleKey: "update.sections.workoutStructure", keys: ["duration", "cardio"] },
  { titleKey: "update.sections.equipment", keys: ["gymType"] },
  { titleKey: "update.sections.tools", keys: ["restTimer"] },
];

const FIELD_ICONS: Record<FieldKey, LucideIcon> = {
  goal: Target,
  frequency: CalendarDays,
  split: Workflow,
  experience: BarChart3,
  variety: Shuffle,
  duration: Timer,
  cardio: HeartPulse,
  gymType: Dumbbell,
  prioritizedMuscles: Crosshair,
  excludedMuscles: Ban,
  restTimer: Hourglass,
};

/** "Update Preferences" on a saved plan: a real page (not a modal) listing
 *  every editable field, each opening in its own dialog. Re-runs the
 *  (deterministic) composer on save instead of restarting the onboarding
 *  wizard. Fully local draft state — nothing here touches the wizard's own
 *  context, so browsing away without saving just discards the edits. */
export function CustomizePlanView({
  planId,
  currentLabel,
  onboardingSnapshot,
}: {
  planId: string;
  currentLabel: string;
  onboardingSnapshot: PlanOnboardingSnapshot;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const format = useDurationFormat();
  const router = useRouter();
  const toast = useToast();
  const pathname = usePathname();
  // Explicit, locale-preserving targets — `pathname` already carries
  // whatever locale prefix (or lack of one, for zh) is currently active, so
  // this survives a plain locale-rewritten default route the way
  // `router.back()` didn't (that's what caused #locale-reset-on-save).
  const myPlansHref = pathname.replace(/\/plan\/[^/]+\/update$/, "/my-plans");
  const planOverviewHref = pathname.replace(/\/update$/, "");
  const [answers, setAnswers] = React.useState<OnboardingAnswers>(() => ({
    ...ONBOARDING_ANSWERS_DEFAULT,
    ...onboardingSnapshot.answers,
  }));
  const [tp, setTp] = React.useState<TrainingPreferencesAnswers>(() => {
    const saved = { ...TRAINING_PREFERENCES_DEFAULT, ...onboardingSnapshot.trainingPreferences };
    // Plans saved before weekday picking show the days they actually train on.
    return saved.daysPerWeek && !trainingDaysComplete(saved.daysPerWeek, saved.trainingDays)
      ? { ...saved, trainingDays: resolveTrainingDays(saved.daysPerWeek, saved.trainingDays) }
      : saved;
  });
  const daysIncomplete = !trainingDaysComplete(tp.daysPerWeek, tp.trainingDays);
  const [ge, setGe] = React.useState<GymEquipmentAnswers>(() =>
    upgradeLegacyEquipment({ ...GYM_EQUIPMENT_DEFAULT, ...onboardingSnapshot.gymEquipment }),
  );
  // One AI-recommended structure, re-derived from the edited settings (no
  // template picker) — saved with the plan on "Update".
  const recommended = recommendSplit({ answers, trainingPreferences: tp, gymEquipment: ge }).split;
  // What this screen opened with — to tell which fields the user changed.
  const opened = React.useRef({ tp, ge, goal: answers.goal });
  // "Update" stays disabled until the user actually changes the goal or settings.
  const { dirty } = useFormDirty({ goal: answers.goal, tp, ge });
  const [openField, setOpenField] = React.useState<FieldKey | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  const muscleSummary = (muscles: readonly OnboardingMuscleGroup[]) =>
    muscles.length === 0
      ? t("update.none")
      : muscles.map((m) => t(`trainingPreferences.muscles.${m}`, { ns: "onboarding" })).join(t("update.listSeparator"));

  const rowValue: Record<FieldKey, string> = {
    goal: answers.goal ? t(`goal.options.${answers.goal}.title`, { ns: "onboarding" }) : "—",
    frequency: !tp.daysPerWeek
      ? "—"
      : daysIncomplete
        ? t("trainingPreferences.trainingDays.hint", {
            ns: "onboarding",
            selected: tp.trainingDays.length,
            count: trainingDaysCount(tp.daysPerWeek),
          })
        : [
            t(`trainingPreferences.daysPerWeek.options.${tp.daysPerWeek}`, { ns: "onboarding" }),
            tp.trainingDays
              .map((d) => t(`trainingPreferences.trainingDays.days.${d}`, { ns: "onboarding" }))
              .join(t("update.listSeparator")),
          ].join(" · "),
    split: `${t("split.recommended.badge", { ns: "onboarding" })} · ${t(`split.names.${recommended}`, { ns: "onboarding" })}`,
    experience: tp.experience
      ? t(`trainingPreferences.experience.options.${tp.experience}.title`, { ns: "onboarding" })
      : "—",
    variety: tp.variety
      ? t(`trainingPreferences.variety.options.${tp.variety}.title`, { ns: "onboarding" })
      : "—",
    duration: `${tp.durationMin ?? ONBOARDING_DURATION_DEFAULT} ${t("trainingPreferences.duration.unit", { ns: "onboarding" })}`,
    cardio: ge.addCardio
      ? t("update.cardioSummary", { count: ge.cardioTypes.length })
      : t("update.cardioOff"),
    gymType: ge.gymType
      ? t("update.equipmentSummary", {
          gym: t(`gymEquipment.whereDoYouExercise.options.${ge.gymType}.title`, { ns: "onboarding" }),
          count: ge.equipment.length,
        })
      : "—",
    prioritizedMuscles: muscleSummary(tp.prioritizeMuscles === true ? tp.prioritizedMuscles : []),
    excludedMuscles: muscleSummary(tp.excludeMuscles === true ? tp.excludedMuscles : []),
    restTimer: tp.restTimerEnabled
      ? `${format.seconds(tp.restTimerMinSec, "short")}–${format.seconds(tp.restTimerMaxSec, "short")}`
      : t("update.cardioOff"),
  };

  async function handleUpdate() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(false);
    try {
      const trainingPreferences = { ...tp, workoutSplit: recommended };
      const exercises = await fetchAllExercises();
      const plan = generateTrainingPlan({ answers, trainingPreferences, gymEquipment: ge, exercises });
      const label = answers.goal ? t(`goal.options.${answers.goal}.title`, { ns: "onboarding" }) : currentLabel;
      const snapshot: PlanOnboardingSnapshot = { answers, trainingPreferences, gymEquipment: ge };
      await updateTrainingPlan({ id: planId, label, plan, onboardingSnapshot: snapshot });
      await syncSharedProfile(trainingPreferences);
      toast.show(t("toast.planUpdated"), "success");
      router.push(planOverviewHref);
      router.refresh();
    } catch {
      setError(true);
      setSaving(false);
      toast.show(t("toast.planUpdateFailed"), "destructive");
    }
  }

  /** What the user changes here is their current preference, so it also goes
   *  to the account's Shared Fitness Profile — otherwise this plan and the
   *  profile (which AI Nutrition and the next plan read) would disagree.
   *  Only fields changed on this screen are written, on top of the profile as
   *  it is now: this plan's copies of everything else may be older than the
   *  profile (e.g. training days edited on the Fitness Profile page since).
   *  Non-fatal: the plan itself is already saved. */
  async function syncSharedProfile(trainingPreferences: TrainingPreferencesAnswers) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const current = await fetchFitnessProfile();
      const was = opened.current;
      const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

      let next = {
        answers: answers,
        trainingPreferences,
        gymEquipment: ge,
      };
      if (current.updatedAt) {
        const mergedTp: Record<string, unknown> = { ...current.trainingPreferences };
        for (const [k, v] of Object.entries(trainingPreferences)) {
          // The split is derived (recommendSplit), not a profile answer.
          if (k !== "workoutSplit" && differs(v, was.tp[k as keyof TrainingPreferencesAnswers])) mergedTp[k] = v;
        }
        const mergedGe: Record<string, unknown> = { ...current.gymEquipment };
        for (const [k, v] of Object.entries(ge)) {
          if (differs(v, was.ge[k as keyof GymEquipmentAnswers])) mergedGe[k] = v;
        }
        next = {
          answers:
            differs(answers.goal, was.goal) ? { ...current.answers, goal: answers.goal } : current.answers,
          trainingPreferences: mergedTp as unknown as TrainingPreferencesAnswers,
          gymEquipment: mergedGe as unknown as GymEquipmentAnswers,
        };
        if (!differs(next, { answers: current.answers, trainingPreferences: current.trainingPreferences, gymEquipment: current.gymEquipment })) return;
      }
      await saveOnboardingAnswers({ userId, ...next });
    } catch {
      // Leave the profile as it was; the next profile save reconciles it.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(myPlansHref)}
          aria-label={t("back")}
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent md:hidden"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{t("update.dialogTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("update.dialogSubtitle")}</p>
        </div>
      </div>

      <p className="-mt-2 text-xs text-muted-foreground">
        {t("update.profileNote")}{" "}
        <Link
          href={pathname.replace(/\/plan\/[^/]+\/update$/, "/fitness-profile")}
          className="font-semibold text-primary hover:underline"
        >
          {t("fitnessProfile.title")}
        </Link>
      </p>

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.titleKey} className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {t(section.titleKey)}
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {section.keys.map((key) => {
                const Icon = FIELD_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpenField(key)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{t(`update.fields.${key}`)}</span>
                      <span className="block text-xs text-muted-foreground">{rowValue[key]}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{t("update.saveError")}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(myPlansHref)}
          className="hidden flex-1 shadow-lg md:inline-flex"
        >
          {t("back")}
        </Button>
        <SaveButton
          size="lg"
          className="flex-1"
          onClick={handleUpdate}
          dirty={dirty}
          saving={saving}
          disabled={daysIncomplete}
          label={t("update.save")}
          savingLabel={t("update.saving")}
        />
      </div>

      <FieldEditorDialog
        field={openField}
        onOpenChange={(open) => !open && setOpenField(null)}
        answers={answers}
        setAnswers={setAnswers}
        tp={tp}
        setTp={setTp}
        ge={ge}
        setGe={setGe}
      />
    </div>
  );
}


function FieldEditorDialog({
  field,
  onOpenChange,
  answers,
  setAnswers,
  tp,
  setTp,
  ge,
  setGe,
}: {
  field: FieldKey | null;
  onOpenChange: (open: boolean) => void;
  answers: OnboardingAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<OnboardingAnswers>>;
  tp: TrainingPreferencesAnswers;
  setTp: React.Dispatch<React.SetStateAction<TrainingPreferencesAnswers>>;
  ge: GymEquipmentAnswers;
  setGe: React.Dispatch<React.SetStateAction<GymEquipmentAnswers>>;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const close = () => onOpenChange(false);

  return (
    <Dialog open={field !== null} onOpenChange={onOpenChange}>
      {/* Equipment is a fixed-height dialog: its search + chips stay pinned
          and only the list scrolls (see EquipmentPicker `scrollable`). */}
      <DialogContent
        className={cn("flex max-h-[85dvh] flex-col gap-0 p-0", field === "gymType" && "h-[85dvh]")}
      >
        {field && (
          <>
            <div className="p-5 pb-2">
              <DialogTitle>{t(`update.fields.${field}`)}</DialogTitle>
            </div>

            <div
              className={cn(
                "flex-1 px-5",
                field === "gymType" ? "min-h-0 pb-3" : "space-y-2 overflow-y-auto pb-5",
              )}
            >
              {field === "goal" &&
                ONBOARDING_GOALS.map((g) => (
                  <OptionCard
                    key={g}
                    title={t(`goal.options.${g}.title`, { ns: "onboarding" })}
                    description={t(`goal.options.${g}.description`, { ns: "onboarding" })}
                    selected={answers.goal === g}
                    onSelect={() => {
                      setAnswers((prev) => ({ ...prev, goal: g }));
                      close();
                    }}
                  />
                ))}

              {field === "frequency" &&
                ONBOARDING_DAYS_PER_WEEK.map((d) => (
                  <OptionCard
                    key={d}
                    badge={
                      ONBOARDING_DAYS_RECOMMENDED.includes(d)
                        ? t("trainingPreferences.daysPerWeek.recommendedBadge", { ns: "onboarding" })
                        : undefined
                    }
                    title={t(`trainingPreferences.daysPerWeek.options.${d}`, { ns: "onboarding" })}
                    selected={tp.daysPerWeek === d}
                    onSelect={() =>
                      setTp((prev) => ({
                        ...prev,
                        daysPerWeek: d,
                        trainingDays: d === prev.daysPerWeek ? prev.trainingDays : [],
                      }))
                    }
                  />
                ))}
              {field === "frequency" && tp.daysPerWeek && (
                <div className="pt-3">
                  <TrainingDaysPicker
                    daysPerWeek={tp.daysPerWeek}
                    value={tp.trainingDays}
                    onChange={(trainingDays) => setTp((prev) => ({ ...prev, trainingDays }))}
                  />
                </div>
              )}

              {field === "split" && (
                <div className="space-y-2 rounded-2xl border-2 border-primary bg-primary/5 p-4">
                  <p className="text-xs font-bold text-primary">
                    {t("split.recommended.badge", { ns: "onboarding" })}
                  </p>
                  <p className="text-lg font-bold">
                    {t(`split.names.${recommendSplit({ answers, trainingPreferences: tp, gymEquipment: ge }).split}`, { ns: "onboarding" })}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("update.splitAuto")}</p>
                </div>
              )}

              {field === "experience" &&
                ONBOARDING_EXPERIENCES.map((e) => (
                  <OptionCard
                    key={e}
                    title={t(`trainingPreferences.experience.options.${e}.title`, { ns: "onboarding" })}
                    description={t(`trainingPreferences.experience.options.${e}.description`, { ns: "onboarding" })}
                    selected={tp.experience === e}
                    onSelect={() => {
                      setTp((prev) => ({ ...prev, experience: e }));
                      close();
                    }}
                  />
                ))}

              {field === "variety" &&
                ONBOARDING_VARIETIES.map((v) => (
                  <OptionCard
                    key={v}
                    title={t(`trainingPreferences.variety.options.${v}.title`, { ns: "onboarding" })}
                    description={t(`trainingPreferences.variety.options.${v}.description`, { ns: "onboarding" })}
                    selected={tp.variety === v}
                    onSelect={() => {
                      setTp((prev) => ({ ...prev, variety: v }));
                      close();
                    }}
                  />
                ))}

              {field === "duration" && (
                <DurationEditor
                  value={tp.durationMin ?? ONBOARDING_DURATION_DEFAULT}
                  onChange={(v) => setTp((prev) => ({ ...prev, durationMin: v }))}
                />
              )}

              {field === "gymType" && (
                <EquipmentPicker
                  scrollable
                  gymType={ge.gymType}
                  selected={ge.equipment}
                  onSelectGymType={(g) => setGe((prev) => withGymType(prev, g))}
                  onToggle={(id) =>
                    setGe((prev) => ({
                      ...prev,
                      equipment: prev.equipment.includes(id)
                        ? prev.equipment.filter((e) => e !== id)
                        : [...prev.equipment, id],
                    }))
                  }
                />
              )}

              {field === "cardio" && <CardioEditor ge={ge} setGe={setGe} />}

              {field === "prioritizedMuscles" && (
                <MuscleGrid
                  selected={tp.prioritizeMuscles === true ? tp.prioritizedMuscles : []}
                  onToggle={(m) => setTp((prev) => toggleMuscle(prev, "prioritized", m))}
                  max={ONBOARDING_PRIORITIZED_MUSCLES_MAX}
                  blocked={tp.excludeMuscles === true ? tp.excludedMuscles : []}
                  blockedBy="excluded"
                />
              )}

              {field === "excludedMuscles" && (
                <MuscleGrid
                  selected={tp.excludeMuscles === true ? tp.excludedMuscles : []}
                  onToggle={(m) => setTp((prev) => toggleMuscle(prev, "excluded", m))}
                  max={ONBOARDING_EXCLUDED_MUSCLES_MAX}
                  blocked={tp.prioritizeMuscles === true ? tp.prioritizedMuscles : []}
                  blockedBy="prioritized"
                />
              )}

              {field === "restTimer" && <RestTimerEditor tp={tp} setTp={setTp} />}
            </div>

            {MULTI_STEP_FIELDS.includes(field) && (
              <div className="px-5 pb-5">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={close}
                  disabled={field === "frequency" && !trainingDaysComplete(tp.daysPerWeek, tp.trainingDays)}
                >
                  {t("update.doneEditing")}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DurationEditor({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation(["plan", "onboarding"]);
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-4xl font-extrabold tabular-nums">
        {value} {t("trainingPreferences.duration.unit", { ns: "onboarding" })}
      </p>
      <input
        type="range"
        min={ONBOARDING_DURATION_MIN}
        max={ONBOARDING_DURATION_MAX}
        step={ONBOARDING_DURATION_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={t("update.fields.duration")}
      />
      <div className="flex w-full justify-between text-sm text-muted-foreground">
        <span>{t("trainingPreferences.duration.less", { ns: "onboarding" })}</span>
        <span>{t("trainingPreferences.duration.more", { ns: "onboarding" })}</span>
      </div>
    </div>
  );
}

function CardioEditor({
  ge,
  setGe,
}: {
  ge: GymEquipmentAnswers;
  setGe: React.Dispatch<React.SetStateAction<GymEquipmentAnswers>>;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <OptionCard
          multi
          title={t("gymEquipment.addCardio.yes", { ns: "onboarding" })}
          selected={ge.addCardio === true}
          onSelect={() => setGe((prev) => ({ ...prev, addCardio: true }))}
        />
        <OptionCard
          multi
          title={t("gymEquipment.addCardio.notNow", { ns: "onboarding" })}
          selected={ge.addCardio !== true}
          onSelect={() => setGe((prev) => ({ ...prev, addCardio: false }))}
        />
      </div>

      {ge.addCardio && (
        <CardioPicker
          placement={ge.cardioPlacement}
          onPlacementChange={(cardioPlacement) => setGe((prev) => ({ ...prev, cardioPlacement }))}
          selected={ge.cardioTypes}
          onToggle={(c) =>
            setGe((prev) => ({
              ...prev,
              cardioTypes: prev.cardioTypes.includes(c)
                ? prev.cardioTypes.filter((x) => x !== c)
                : [...prev.cardioTypes, c],
            }))
          }
        />
      )}
    </div>
  );
}

/** Add or remove a muscle from the focused or excluded list. A muscle can't be
 *  both: the picker greys out one that's in the other list, and this ignores it
 *  too. The yes/no flags the generator reads follow whether the list has anything
 *  in it. */
function toggleMuscle(
  prev: TrainingPreferencesAnswers,
  list: "prioritized" | "excluded",
  muscle: OnboardingMuscleGroup,
): TrainingPreferencesAnswers {
  const mine = list === "prioritized" ? prev.prioritizedMuscles : prev.excludedMuscles;
  const other = list === "prioritized" ? prev.excludedMuscles : prev.prioritizedMuscles;
  if (other.includes(muscle) && !mine.includes(muscle)) return prev;
  const nextMine = mine.includes(muscle) ? mine.filter((x) => x !== muscle) : [...mine, muscle];
  const nextOther = other.filter((x) => x !== muscle);
  return list === "prioritized"
    ? {
        ...prev,
        prioritizedMuscles: nextMine,
        prioritizeMuscles: nextMine.length > 0,
        excludedMuscles: nextOther,
        excludeMuscles: nextOther.length > 0,
      }
    : {
        ...prev,
        excludedMuscles: nextMine,
        excludeMuscles: nextMine.length > 0,
        prioritizedMuscles: nextOther,
        prioritizeMuscles: nextOther.length > 0,
      };
}

function RestTimerEditor({
  tp,
  setTp,
}: {
  tp: TrainingPreferencesAnswers;
  setTp: React.Dispatch<React.SetStateAction<TrainingPreferencesAnswers>>;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const format = useDurationFormat();
  return (
    <div className="space-y-4">
      <SettingRow label={t("update.restTimerEnabled")}>
        <Switch
          checked={tp.restTimerEnabled}
          onChange={(checked) => setTp((prev) => ({ ...prev, restTimerEnabled: checked }))}
          aria-label={t("update.restTimerEnabled")}
        />
      </SettingRow>

      {tp.restTimerEnabled && (
        <>
          <div className="space-y-3 rounded-2xl bg-muted px-4 py-4">
            <p className="text-base font-semibold">{t("update.restTimerDuration")}</p>
            <RangeSlider
              min={REST_TIMER_MIN_SEC}
              max={REST_TIMER_MAX_SEC}
              step={REST_TIMER_STEP_SEC}
              value={[tp.restTimerMinSec, tp.restTimerMaxSec]}
              onChange={([restTimerMinSec, restTimerMaxSec]) =>
                setTp((prev) => ({ ...prev, restTimerMinSec, restTimerMaxSec }))
              }
              formatValue={(sec) => format.seconds(sec, "short")}
              minAriaLabel={t("update.restTimerMin")}
              maxAriaLabel={t("update.restTimerMax")}
            />
          </div>
          <p className="px-1 text-sm leading-relaxed text-muted-foreground">
            {t("update.restTimerHint", {
              min: REST_TIMER_RECOMMENDED_SEC.min,
              max: REST_TIMER_RECOMMENDED_SEC.max,
            })}
          </p>
          <SettingRow label={t("update.restTimerSound")}>
            <Switch
              checked={tp.restTimerSound}
              onChange={(checked) => setTp((prev) => ({ ...prev, restTimerSound: checked }))}
              aria-label={t("update.restTimerSound")}
            />
          </SettingRow>
        </>
      )}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3.5">
      <span className="text-base font-semibold">{label}</span>
      {children}
    </div>
  );
}
