import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { buildNearbyParams, type NearbyFilters } from './buildNearbyParams';
import type { Coords, NearbyCompanion } from './types';

export function useNearbyCompanions(center: Coords, filters: NearbyFilters) {
  const params = buildNearbyParams(center, filters);
  return useQuery({
    queryKey: ['nearby', params],
    queryFn: async (): Promise<NearbyCompanion[]> => {
      const { data, error } = await supabase.rpc('nearby_companions', params);
      if (error) throw error;
      return (data ?? []) as NearbyCompanion[];
    },
  });
}
