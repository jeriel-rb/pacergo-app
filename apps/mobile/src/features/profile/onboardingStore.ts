import { create } from 'zustand';

type OnboardingState = {
  displayName: string;
  birthdate: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  homeArea: string;
  activityIds: string[];
  setField: (k: 'displayName' | 'birthdate' | 'experienceLevel' | 'homeArea', v: string) => void;
  toggleActivity: (id: string) => void;
  reset: () => void;
};

const initial = {
  displayName: '',
  birthdate: '',
  experienceLevel: 'beginner' as const,
  homeArea: '',
  activityIds: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as Partial<OnboardingState>),
  toggleActivity: (id) =>
    set((s) => ({
      activityIds: s.activityIds.includes(id)
        ? s.activityIds.filter((x) => x !== id)
        : [...s.activityIds, id],
    })),
  reset: () => set({ ...initial }),
}));
