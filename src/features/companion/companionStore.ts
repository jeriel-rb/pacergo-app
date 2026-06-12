import { create } from 'zustand';
import type { OfferingDraft } from './types';

type CompanionState = {
  headline: string;
  servedArea: string;
  offerings: OfferingDraft[];
  setField: (k: 'headline' | 'servedArea', v: string) => void;
  addOffering: (o: OfferingDraft) => void;
  removeOffering: (index: number) => void;
  reset: () => void;
};

const initial = { headline: '', servedArea: '', offerings: [] as OfferingDraft[] };

export const useCompanionStore = create<CompanionState>((set) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as Partial<CompanionState>),
  addOffering: (o) => set((s) => ({ offerings: [...s.offerings, o] })),
  removeOffering: (index) => set((s) => ({ offerings: s.offerings.filter((_, i) => i !== index) })),
  reset: () => set({ ...initial }),
}));
