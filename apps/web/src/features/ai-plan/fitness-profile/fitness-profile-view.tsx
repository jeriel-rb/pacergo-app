"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Loader2,
  Ruler,
  Target,
  Timer,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  ONBOARDING_DAYS_PER_WEEK,
  ONBOARDING_DURATION_DEFAULT,
  ONBOARDING_EXPERIENCES,
  trainingDaysComplete,
  withGymType,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/components/ui/toast";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { EquipmentPicker } from "@/features/ai-plan/onboarding/equipment-picker";
import { TrainingDaysPicker } from "@/features/ai-plan/onboarding/training-days-picker";
import { DurationEditor } from "@/features/ai-plan/plan/customize-plan-view";
import {
  BodyFieldEditor,
  WHEEL_FIELDS,
  withBodyDefaults,
  type BodyField,
} from "@/features/ai-plan/nutrition/body-field-editor";
import { refreshActivePlanFromProfile, saveOnboardingAnswers } from "@/lib/plans";
import type { SavedFitnessProfile } from "@/lib/fitness-profile-row";
import { cn } from "@/lib/utils";

type FieldKey = BodyField | "experience" | "frequency" | "duration" | "equipment";

const SECTIONS: { titleKey: string; keys: FieldKey[] }[] = [
  { titleKey: "fitnessProfile.sections.about", keys: ["gender", "age", "body", "goal", "activityLevel"] },
  { titleKey: "fitnessProfile.sections.training", keys: ["experience", "frequency", "duration"] },
  { titleKey: "fitnessProfile.sections.equipment", keys: ["equipment"] },
];

const FIELD_ICONS: Record<FieldKey, LucideIcon> = {
  gender: UserRound,
  age: User,
  body: Ruler,
  goal: Target,
  activityLevel: Activity,
  experience: BarChart3,
  frequency: CalendarDays,
  duration: Timer,
  equipment: Dumbbell,
};

/** Fields that need more than one tap keep their dialog open until "Done". */
const MULTI_STEP: readonly FieldKey[] = [...WHEEL_FIELDS, "frequency", "duration", "equipment"];

/** The one place to edit the Shared Fitness Profile — body stats, activity,
 *  goal, experience, training days, session length and equipment. AI Training
 *  and AI Nutrition both read this same record, so a change here reaches both:
 *  the nutrition result is recalculated on save, and new training plans start
 *  from it. Saved plans are plan-specific and aren't rewritten (they're updated
 *  from "Update Preferences" on My Plans). */
export function FitnessProfileView({
  userId,
  saved,
  answers: initialAnswers,
}: {
  userId: string;
  saved: SavedFitnessProfile;
  /** Saved answers merged with the account profile's gender. */
  answers: OnboardingAnswers;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const initial = React.useRef({
    answers: initialAnswers,
    tp: saved.trainingPreferences,
    ge: saved.gymEquipment,
  });
  const [answers, setAnswers] = React.useState<OnboardingAnswers>(initialAnswers);
  const [tp, setTp] = React.useState<TrainingPreferencesAnswers>(saved.trainingPreferences);
  const [ge, setGe] = React.useState<GymEquipmentAnswers>(saved.gymEquipment);
  const [openField, setOpenField] = React.useState<FieldKey | null>(null);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    JSON.stringify([answers, tp, ge]) !==
    JSON.stringify([initial.current.answers, initial.current.tp, initial.current.ge]);
  const daysIncomplete = !trainingDaysComplete(tp.daysPerWeek, tp.trainingDays);
  const nutritionHref = pathname.replace(/\/fitness-profile$/, "/nutrition");

  async function onSave() {
    setSaving(true);
    try {
      await saveOnboardingAnswers({ userId, answers, trainingPreferences: tp, gymEquipment: ge });
      initial.current = { answers, tp, ge };
      // Plan-relevant changes also bring the active plan up to date. Saving
      // the profile already succeeded, so a failure here is reported, not fatal.
      let planUpdated = false;
      let planFailed = false;
      try {
        planUpdated = await refreshActivePlanFromProfile({
          answers,
          trainingPreferences: tp,
          gymEquipment: ge,
        });
      } catch {
        planFailed = true;
      }
      toast.show(
        planFailed
          ? t("fitnessProfile.savedPlanFailed")
          : planUpdated
            ? t("fitnessProfile.savedPlanUpdated")
            : t("fitnessProfile.saved"),
        planFailed ? "destructive" : "success",
      );
      router.refresh();
    } catch {
      toast.show(t("fitnessProfile.saveError"), "destructive");
    } finally {
      setSaving(false);
    }
  }

  const rowValue: Record<FieldKey, string> = {
    gender: answers.gender && answers.gender !== "other" ? t(`gender.options.${answers.gender}`, { ns: "onboarding" }) : "—",
    age: answers.age ? `${answers.age} ${t("age.suffix", { ns: "onboarding" })}` : "—",
    body:
      answers.heightCm && answers.weightKg
        ? answers.unit === "metric"
          ? `${answers.heightCm} cm · ${answers.weightKg} kg`
          : (() => {
              const totalIn = Math.round(answers.heightCm / 2.54);
              return `${Math.floor(totalIn / 12)}'${totalIn % 12}" · ${Math.round(answers.weightKg * 2.20462)} lb`;
            })()
        : "—",
    goal: answers.goal ? t(`goal.options.${answers.goal}.title`, { ns: "onboarding" }) : "—",
    activityLevel: answers.activityLevel
      ? t(`activityLevel.options.${answers.activityLevel}.title`, { ns: "onboarding" })
      : "—",
    experience: tp.experience
      ? t(`trainingPreferences.experience.options.${tp.experience}.title`, { ns: "onboarding" })
      : "—",
    frequency: !tp.daysPerWeek
      ? "—"
      : daysIncomplete
        ? t("trainingPreferences.trainingDays.hint", {
            ns: "onboarding",
            selected: tp.trainingDays.length,
            count: Number(tp.daysPerWeek === "every_day" ? 7 : tp.daysPerWeek),
          })
        : [
            t(`trainingPreferences.daysPerWeek.options.${tp.daysPerWeek}`, { ns: "onboarding" }),
            tp.trainingDays
              .map((d) => t(`trainingPreferences.trainingDays.days.${d}`, { ns: "onboarding" }))
              .join(t("update.listSeparator")),
          ]
            .filter(Boolean)
            .join(" · "),
    duration: `${tp.durationMin ?? ONBOARDING_DURATION_DEFAULT} ${t("trainingPreferences.duration.unit", { ns: "onboarding" })}`,
    equipment: ge.gymType
      ? t("update.equipmentSummary", {
          gym: t(`gymEquipment.whereDoYouExercise.options.${ge.gymType}.title`, { ns: "onboarding" }),
          count: ge.equipment.length,
        })
      : "—",
  };

  const close = () => setOpenField(null);
  const isBodyField = (f: FieldKey): f is BodyField =>
    f === "gender" || f === "age" || f === "body" || f === "goal" || f === "activityLevel";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("fitnessProfile.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("fitnessProfile.subtitle")}</p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.titleKey} className="space-y-2">
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
                    <span className="block text-sm font-semibold">{t(`fitnessProfile.fields.${key}`)}</span>
                    <span className="block text-xs text-muted-foreground">{rowValue[key]}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">{t("fitnessProfile.note")}</p>

      <Button size="lg" className="w-full" onClick={onSave} disabled={saving || !dirty || daysIncomplete}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? t("fitnessProfile.saving") : t("fitnessProfile.save")}
      </Button>

      {!dirty && saved.nutritionStatus === "built" && (
        <Link href={nutritionHref} className="text-center text-sm font-semibold text-primary hover:underline">
          {t("fitnessProfile.viewNutrition")}
        </Link>
      )}

      <Dialog open={openField !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent
          className={cn("flex max-h-[85dvh] flex-col gap-0 p-0", openField === "equipment" && "h-[85dvh]")}
        >
          {openField && (
            <>
              <div className="p-5 pb-2">
                <DialogTitle>{t(`fitnessProfile.fields.${openField}`)}</DialogTitle>
              </div>
              <div
                className={cn(
                  "flex-1 px-5",
                  openField === "equipment" ? "min-h-0 pb-3" : "space-y-2 overflow-y-auto pb-5",
                )}
              >
                {isBodyField(openField) && (
                  <BodyFieldEditor
                    field={openField}
                    answers={answers}
                    onChange={(patch) => setAnswers((prev) => ({ ...prev, ...patch }))}
                    onPicked={close}
                  />
                )}

                {openField === "experience" &&
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

                {openField === "frequency" && (
                  <>
                    {ONBOARDING_DAYS_PER_WEEK.map((d) => (
                      <OptionCard
                        key={d}
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
                    {tp.daysPerWeek && (
                      <div className="pt-3">
                        <TrainingDaysPicker
                          daysPerWeek={tp.daysPerWeek}
                          value={tp.trainingDays}
                          onChange={(trainingDays) => setTp((prev) => ({ ...prev, trainingDays }))}
                        />
                      </div>
                    )}
                  </>
                )}

                {openField === "duration" && (
                  <DurationEditor
                    value={tp.durationMin ?? ONBOARDING_DURATION_DEFAULT}
                    onChange={(durationMin) => setTp((prev) => ({ ...prev, durationMin }))}
                  />
                )}

                {openField === "equipment" && (
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
              </div>
              {MULTI_STEP.includes(openField) && (
                <div className="px-5 pb-5">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={openField === "frequency" && daysIncomplete}
                    onClick={() => {
                      // A wheel left untouched still means "this value".
                      if (isBodyField(openField)) setAnswers((prev) => withBodyDefaults(prev, openField));
                      close();
                    }}
                  >
                    {t("nutrition.done")}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
