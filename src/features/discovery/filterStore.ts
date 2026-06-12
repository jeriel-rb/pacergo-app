import { create } from 'zustand';
import type { Tier } from './types';

export type DiscoveryView = 'feed' | 'map';

type FilterState = {
  activitySlug: string | null;
  tier: Tier | null;
  maxPrice: number | null;
  radiusM: number;
  view: DiscoveryView;
  setActivity: (slug: string | null) => void;
  setTier: (tier: Tier | null) => void;
  setMaxPrice: (price: number | null) => void;
  setRadius: (m: number) => void;
  setView: (v: DiscoveryView) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  activitySlug: null,
  tier: null,
  maxPrice: null,
  radiusM: 20000,
  view: 'feed',
  setActivity: (activitySlug) => set({ activitySlug }),
  setTier: (tier) => set({ tier }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setRadius: (radiusM) => set({ radiusM }),
  setView: (view) => set({ view }),
}));
