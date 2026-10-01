"use client";

import * as React from "react";
import {
  EQUIPMENT_PRESETS,
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  ONBOARDING_EXCLUDED_MUSCLES_MAX,
  ONBOARDING_MUSCLE_GROUPS,
  ONBOARDING_PRIORITIZED_MUSCLES_MAX,
  ONBOARDING_USE_CASE_MAX,
  TRAINING_PREFERENCES_DEFAULT,
  isPlanGender,
  profileStepCompletion,
  type GeneratedPlan,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingCardioPlacement,
  type OnboardingCardioType,
  type OnboardingDaysPerWeek,
  type OnboardingEquipment,
  type OnboardingExperience,
  type OnboardingGoal,
  type OnboardingGymType,
  type OnboardingMuscleGroup,
  type OnboardingObstacle,
  type OnboardingStepId,
  type OnboardingUnit,
  type OnboardingUseCase,
  type OnboardingVariety,
  type ActivityLevel,
  type OnboardingWorkoutSplit,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import type { SavedFitnessProfile } from "@/lib/fitness-profile-row";
import { saveOnboardingAnswers } from "@/lib/plans";

const STORAGE_KEY_PREFIX = "pacergo.onboarding.v1";
const LEGACY_STORAGE_KEY = STORAGE_KEY_PREFIX;

function storageKeyForUser(userId: string | null | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:anon`;
}

/** Clears every onboarding draft (legacy + per-user). Call on sign-out. */
export function clearOnboardingStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key === LEGACY_STORAGE_KEY || key.startsWith(`${STORAGE_KEY_PREFIX}:`))) {
        keys.push(key);
      }
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable — nothing to clear.
  }
}

interface OnboardingState {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  completedSteps: Record<OnboardingStepId, boolean>;
  /** Set once the "Creating your plan" screen finishes generating; consumed
   *  by the summary screen and persisted on "Save My Plan". */
  generatedPlan: GeneratedPlan | null;
  /** Id of `generatedPlan` once saved to the account (it's saved as soon as
   *  it's generated, and becomes the active plan). */
  savedPlanId: string | null;
  /** `updated_at` of the account profile this draft started from (or last
   *  saved). A draft whose base no longer matches the account's is stale —
   *  the profile changed elsewhere — and is replaced by the account copy. */
  baseUpdatedAt: string | null;
  /** Bumped when a section is completed; the provider then saves the answers
   *  to the account profile (after the render that holds the final values). */
  persistRequest: number;
}

const INITIAL_STATE: OnboardingState = {
  answers: ONBOARDING_ANSWERS_DEFAULT,
  trainingPreferences: TRAINING_PREFERENCES_DEFAULT,
  gymEquipment: GYM_EQUIPMENT_DEFAULT,
  completedSteps: { aboutYou: false, trainingPreferences: false, gymEquipment: false },
  generatedPlan: null,
  savedPlanId: null,
  baseUpdatedAt: null,
  persistRequest: 0,
};

/** Wizard state seeded from the saved account profile: every answer
 *  prefilled, and every section it already fully answers marked done, so
 *  nothing already known is asked again. */
function stateFromProfile(
  saved: SavedFitnessProfile | null,
  gender: OnboardingAnswers["gender"],
): OnboardingState {
  const knownGender = isPlanGender(gender) ? gender : null;
  if (!saved?.updatedAt) {
    return { ...INITIAL_STATE, answers: { ...INITIAL_STATE.answers, gender: knownGender } };
  }
  const answers = { ...saved.answers, gender: knownGender ?? saved.answers.gender };
  return {
    ...INITIAL_STATE,
    answers,
    trainingPreferences: saved.trainingPreferences,
    gymEquipment: saved.gymEquipment,
    completedSteps: profileStepCompletion(answers, saved.trainingPreferences, saved.gymEquipment),
    baseUpdatedAt: saved.updatedAt,
  };
}

type Action =
  | { type: "hydrate"; state: Partial<OnboardingState> }
  | { type: "patch"; patch: Partial<OnboardingAnswers> }
  | { type: "toggleUseCase"; value: OnboardingUseCase }
  | { type: "patchTraining"; patch: Partial<TrainingPreferencesAnswers> }
  | { type: "patchGymEquipment"; patch: Partial<GymEquipmentAnswers> }
  | { type: "toggleEquipment"; value: OnboardingEquipment }
  | { type: "toggleCardioType"; value: OnboardingCardioType }
  | { type: "toggleExcludedMuscle"; value: OnboardingMuscleGroup }
  | { type: "togglePrioritizedMuscle"; value: OnboardingMuscleGroup }
  | { type: "completeStep"; step: OnboardingStepId }
  | { type: "setGeneratedPlan"; plan: GeneratedPlan }
  | { type: "setSavedPlanId"; id: string }
  | { type: "replace"; state: OnboardingState }
  | { type: "setBaseUpdatedAt"; updatedAt: string }
  | { type: "resetForUpdate" }
  | { type: "reset" };

/** Map retired picker keys from older sessionStorage drafts. */
const LEGACY_MUSCLE_KEYS: Record<string, OnboardingMuscleGroup> = {
  quads: "quadriceps",
};

function migrateMuscleKeys(
  muscles: readonly string[] | undefined,
): OnboardingMuscleGroup[] {
  if (!muscles?.length) return [];
  const allowed = new Set<string>(ONBOARDING_MUSCLE_GROUPS);
  const next: OnboardingMuscleGroup[] = [];
  for (const raw of muscles) {
    const key = LEGACY_MUSCLE_KEYS[raw] ?? raw;
    if (!allowed.has(key) || next.includes(key as OnboardingMuscleGroup)) continue;
    next.push(key as OnboardingMuscleGroup);
  }
  return next;
}

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case "hydrate": {
      // Merge onto INITIAL_STATE (not a wholesale replace) so a session
      // stored before a field was added to the schema doesn't wipe it back
      // to `undefined` — each slice falls back to its own default.
      const training = {
        ...INITIAL_STATE.trainingPreferences,
        ...action.state.trainingPreferences,
      };
      return {
        answers: { ...INITIAL_STATE.answers, ...action.state.answers },
        trainingPreferences: {
          ...training,
          excludedMuscles: migrateMuscleKeys(training.excludedMuscles),
          prioritizedMuscles: migrateMuscleKeys(training.prioritizedMuscles),
        },
        gymEquipment: {
          ...INITIAL_STATE.gymEquipment,
          ...action.state.gymEquipment,
        },
        completedSteps: {
          ...INITIAL_STATE.completedSteps,
          ...action.state.completedSteps,
        },
        generatedPlan: action.state.generatedPlan ?? null,
        savedPlanId: action.state.savedPlanId ?? null,
        baseUpdatedAt: action.state.baseUpdatedAt ?? null,
        persistRequest: 0,
      };
    }
    case "replace":
      return action.state;
    case "setBaseUpdatedAt":
      return { ...state, baseUpdatedAt: action.updatedAt };
    case "patch":
      return { ...state, answers: { ...state.answers, ...action.patch } };
    case "toggleUseCase": {
      const has = state.answers.useCases.includes(action.value);
      const useCases = has
        ? state.answers.useCases.filter((v) => v !== action.value)
        : state.answers.useCases.length >= ONBOARDING_USE_CASE_MAX
          ? state.answers.useCases
          : [...state.answers.useCases, action.value];
      return { ...state, answers: { ...state.answers, useCases } };
    }
    case "patchTraining":
      return {
        ...state,
        trainingPreferences: { ...state.trainingPreferences, ...action.patch },
      };
    case "patchGymEquipment":
      return {
        ...state,
        gymEquipment: { ...state.gymEquipment, ...action.patch },
      };
    case "toggleEquipment": {
      const has = state.gymEquipment.equipment.includes(action.value);
      const equipment = has
        ? state.gymEquipment.equipment.filter((v) => v !== action.value)
        : [...state.gymEquipment.equipment, action.value];
      return { ...state, gymEquipment: { ...state.gymEquipment, equipment } };
    }
    case "toggleCardioType": {
      const has = state.gymEquipment.cardioTypes.includes(action.value);
      const cardioTypes = has
        ? state.gymEquipment.cardioTypes.filter((v) => v !== action.value)
        : [...state.gymEquipment.cardioTypes, action.value];
      return { ...state, gymEquipment: { ...state.gymEquipment, cardioTypes } };
    }
    case "toggleExcludedMuscle": {
      const { prioritizeMuscles, prioritizedMuscles } = state.trainingPreferences;
      // Already a focus muscle: the picker greys it out; ignore it here too.
      if (prioritizeMuscles === true && prioritizedMuscles.includes(action.value)) return state;
      const current = state.trainingPreferences.excludedMuscles;
      const has = current.includes(action.value);
      const excludedMuscles = has
        ? current.filter((v) => v !== action.value)
        : current.length >= ONBOARDING_EXCLUDED_MUSCLES_MAX
          ? current
          : [...current, action.value];
      return {
        ...state,
        trainingPreferences: { ...state.trainingPreferences, excludedMuscles },
      };
    }
    case "togglePrioritizedMuscle": {
      const { excludeMuscles, excludedMuscles } = state.trainingPreferences;
      // Already excluded: the picker greys it out; ignore it here too.
      if (excludeMuscles === true && excludedMuscles.includes(action.value)) return state;
      const current = state.trainingPreferences.prioritizedMuscles;
      const has = current.includes(action.value);
      const prioritizedMuscles = has
        ? current.filter((v) => v !== action.value)
        : current.length >= ONBOARDING_PRIORITIZED_MUSCLES_MAX
          ? current
          : [...current, action.value];
      return {
        ...state,
        trainingPreferences: { ...state.trainingPreferences, prioritizedMuscles },
      };
    }
    case "completeStep":
      return {
        ...state,
        completedSteps: { ...state.completedSteps, [action.step]: true },
        // Gym & Equipment completes on "Save My Plan", which saves explicitly.
        persistRequest:
          action.step === "gymEquipment" ? state.persistRequest : state.persistRequest + 1,
      };
    case "setGeneratedPlan":
      return { ...state, generatedPlan: action.plan, savedPlanId: null };
    case "setSavedPlanId":
      return { ...state, savedPlanId: action.id };
    case "resetForUpdate":
      // A-6 "Update Workout Plan": re-walk the wizard with existing answers
      // still prefilled, but every step unlocked again.
      return {
        ...state,
        completedSteps: { aboutYou: false, trainingPreferences: false, gymEquipment: false },
        generatedPlan: null,
        savedPlanId: null,
      };
    case "reset":
      return { ...INITIAL_STATE, baseUpdatedAt: state.baseUpdatedAt };
    default:
      return state;
  }
}

interface OnboardingContextValue {
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
  completedSteps: Record<OnboardingStepId, boolean>;
  generatedPlan: GeneratedPlan | null;
  /** The account already has a saved fitness profile the wizard started from. */
  hasSavedProfile: boolean;
  /** Whether the user has built/skipped the AI Nutrition plan (account-level). */
  nutritionStatus: SavedFitnessProfile["nutritionStatus"];
  /** Saves the current answers to the account's Shared Fitness Profile. */
  persistProfile: () => Promise<void>;
  setGoal: (goal: OnboardingGoal) => void;
  setObstacle: (obstacle: OnboardingObstacle) => void;
  toggleUseCase: (useCase: OnboardingUseCase) => void;
  setGender: (gender: OnboardingAnswers["gender"]) => void;
  setAge: (age: number) => void;
  setUnit: (unit: OnboardingUnit) => void;
  setHeightCm: (heightCm: number) => void;
  setWeightKg: (weightKg: number) => void;
  setActivityLevel: (activityLevel: ActivityLevel) => void;
  setExperience: (experience: OnboardingExperience) => void;
  setDaysPerWeek: (days: OnboardingDaysPerWeek) => void;
  setTrainingDays: (days: number[]) => void;
  setExcludeMuscles: (value: boolean) => void;
  toggleExcludedMuscle: (muscle: OnboardingMuscleGroup) => void;
  setPrioritizeMuscles: (value: boolean) => void;
  togglePrioritizedMuscle: (muscle: OnboardingMuscleGroup) => void;
  setWorkoutSplit: (split: OnboardingWorkoutSplit) => void;
  setVariety: (variety: OnboardingVariety) => void;
  setDurationMin: (minutes: number) => void;
  setGymType: (gymType: OnboardingGymType) => void;
  toggleEquipment: (equipment: OnboardingEquipment) => void;
  setAddCardio: (value: boolean) => void;
  setCardioPlacement: (placement: OnboardingCardioPlacement) => void;
  toggleCardioType: (cardioType: OnboardingCardioType) => void;
  markStepComplete: (step: OnboardingStepId) => void;
  setGeneratedPlan: (plan: GeneratedPlan) => void;
  savedPlanId: string | null;
  setSavedPlanId: (id: string) => void;
  resetForUpdate: () => void;
  reset: () => void;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  initialGender = null,
  userId = null,
  savedProfile = null,
}: {
  children: React.ReactNode;
  /** Optional gender to start from when there's no saved profile yet. The
   *  Fitness Profile is the only source of gender, so callers normally omit
   *  this. */
  initialGender?: OnboardingAnswers["gender"];
  /** Scopes the draft to this auth user so accounts on a shared browser
   *  cannot read each other's onboarding answers. */
  userId?: string | null;
  /** The account-level Shared Fitness Profile — the source of truth the
   *  wizard starts from and saves back to. */
  savedProfile?: SavedFitnessProfile | null;
}) {
  const [state, dispatch] = React.useReducer(reducer, null, () =>
    stateFromProfile(savedProfile, initialGender),
  );
  const storageKey = storageKeyForUser(userId);
  const savedUpdatedAt = savedProfile?.updatedAt ?? null;

  // Hydrate whenever the user or their saved profile changes. The session
  // draft (in-progress answers not yet saved) wins only while it's still
  // based on the account's current profile; if the profile was changed since
  // (Nutrition page, Customize Plan, another device) the account copy wins.
  const savedProfileRef = React.useRef(savedProfile);
  savedProfileRef.current = savedProfile;
  React.useEffect(() => {
    const fresh = stateFromProfile(savedProfileRef.current, initialGender);
    try {
      const raw =
        window.sessionStorage.getItem(storageKey) ??
        // One-time migration from the pre-scoped key when this user is signed in.
        (userId ? window.sessionStorage.getItem(LEGACY_STORAGE_KEY) : null);
      if (userId) window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      const draft = raw ? (JSON.parse(raw) as Partial<OnboardingState>) : null;
      if (draft && (draft.baseUpdatedAt ?? null) === savedUpdatedAt) {
        dispatch({ type: "hydrate", state: draft });
        if (isPlanGender(initialGender)) dispatch({ type: "patch", patch: { gender: initialGender } });
        return;
      }
    } catch {
      // Ignore malformed/blocked storage — fall back to the account profile.
    }
    dispatch({ type: "replace", state: fresh });
  }, [storageKey, userId, initialGender, savedUpdatedAt]);

  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode, quota) — state just won't persist.
    }
  }, [state, storageKey]);

  /** Save the current answers to the account profile (which also recalculates
   *  nutrition) and re-base the draft on the new `updated_at`. */
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const persistProfile = React.useCallback(async () => {
    if (!userId) throw new Error("Not signed in");
    const { answers, trainingPreferences, gymEquipment } = stateRef.current;
    const { updatedAt } = await saveOnboardingAnswers({
      userId,
      answers,
      trainingPreferences,
      gymEquipment,
    });
    dispatch({ type: "setBaseUpdatedAt", updatedAt });
  }, [userId]);

  // Finishing a section saves it right away, so the answers persist across
  // sessions and reach AI Nutrition without waiting for "Save My Plan".
  React.useEffect(() => {
    if (state.persistRequest === 0) return;
    persistProfile().catch(() => {
      // Non-fatal: the draft is still in session storage, and "Save My Plan"
      // saves the profile again.
    });
  }, [state.persistRequest, persistProfile]);

  const value = React.useMemo<OnboardingContextValue>(
    () => ({
      answers: state.answers,
      trainingPreferences: state.trainingPreferences,
      gymEquipment: state.gymEquipment,
      completedSteps: state.completedSteps,
      generatedPlan: state.generatedPlan,
      hasSavedProfile: state.baseUpdatedAt !== null,
      nutritionStatus: savedProfile?.nutritionStatus ?? null,
      persistProfile,
      setGoal: (goal) => dispatch({ type: "patch", patch: { goal } }),
      setObstacle: (obstacle) => dispatch({ type: "patch", patch: { obstacle } }),
      toggleUseCase: (value) => dispatch({ type: "toggleUseCase", value }),
      setGender: (gender) => dispatch({ type: "patch", patch: { gender } }),
      setAge: (age) => dispatch({ type: "patch", patch: { age } }),
      setUnit: (unit) => dispatch({ type: "patch", patch: { unit } }),
      setHeightCm: (heightCm) => dispatch({ type: "patch", patch: { heightCm } }),
      setWeightKg: (weightKg) => dispatch({ type: "patch", patch: { weightKg } }),
      setActivityLevel: (activityLevel) => dispatch({ type: "patch", patch: { activityLevel } }),
      setExperience: (experience) =>
        dispatch({ type: "patchTraining", patch: { experience } }),
      // A new frequency starts with no weekdays picked — the user chooses
      // exactly that many; re-picking the same one keeps their choice.
      setDaysPerWeek: (daysPerWeek) =>
        dispatch({
          type: "patchTraining",
          patch: {
            daysPerWeek,
            trainingDays:
              daysPerWeek === state.trainingPreferences.daysPerWeek
                ? state.trainingPreferences.trainingDays
                : [],
          },
        }),
      setTrainingDays: (trainingDays) =>
        dispatch({ type: "patchTraining", patch: { trainingDays } }),
      setExcludeMuscles: (excludeMuscles) =>
        dispatch({ type: "patchTraining", patch: { excludeMuscles } }),
      toggleExcludedMuscle: (value) => dispatch({ type: "toggleExcludedMuscle", value }),
      setPrioritizeMuscles: (prioritizeMuscles) =>
        dispatch({ type: "patchTraining", patch: { prioritizeMuscles } }),
      togglePrioritizedMuscle: (value) => dispatch({ type: "togglePrioritizedMuscle", value }),
      setWorkoutSplit: (workoutSplit) =>
        dispatch({ type: "patchTraining", patch: { workoutSplit } }),
      setVariety: (variety) => dispatch({ type: "patchTraining", patch: { variety } }),
      setDurationMin: (durationMin) =>
        dispatch({ type: "patchTraining", patch: { durationMin } }),
      // Picking a gym type also selects that gym's typical equipment kit.
      setGymType: (gymType) =>
        dispatch({
          type: "patchGymEquipment",
          patch: {
            gymType,
            equipment: [...EQUIPMENT_PRESETS[gymType]],
          },
        }),
      toggleEquipment: (value) => dispatch({ type: "toggleEquipment", value }),
      setAddCardio: (addCardio) =>
        dispatch({ type: "patchGymEquipment", patch: { addCardio } }),
      setCardioPlacement: (cardioPlacement) =>
        dispatch({ type: "patchGymEquipment", patch: { cardioPlacement } }),
      toggleCardioType: (value) => dispatch({ type: "toggleCardioType", value }),
      markStepComplete: (step) => dispatch({ type: "completeStep", step }),
      setGeneratedPlan: (plan) => dispatch({ type: "setGeneratedPlan", plan }),
      savedPlanId: state.savedPlanId,
      setSavedPlanId: (id) => dispatch({ type: "setSavedPlanId", id }),
      resetForUpdate: () => dispatch({ type: "resetForUpdate" }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [state, persistProfile, savedProfile?.nutritionStatus],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
