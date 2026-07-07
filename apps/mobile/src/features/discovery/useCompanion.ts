import { useQuery } from '@tanstack/react-query';
import type { CompanionOffering, ExperienceLevel } from '@pacergo/shared';
import { supabase } from '@/lib/supabase/client';

export type CompanionDetail = {
  companion_id: string;
  display_name: string | null;
  photo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  experience_level: ExperienceLevel | null;
  home_area: string | null;
  rating_avg: number;
  rating_count: number;
};

export type Offering = CompanionOffering;

export function useCompanion(id: string) {
  return useQuery({
    queryKey: ['companion', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{ detail: CompanionDetail | null; offerings: Offering[] }> => {
      const [detailRes, offeringsRes] = await Promise.all([
        supabase.rpc('get_companion', { p_id: id }),
        supabase.rpc('companion_offerings', { p_companion_id: id }),
      ]);
      if (detailRes.error) throw detailRes.error;
      if (offeringsRes.error) throw offeringsRes.error;
      const detail = ((detailRes.data as CompanionDetail[] | null)?.[0] ?? null);
      const offerings = (offeringsRes.data ?? []) as Offering[];
      return { detail, offerings };
    },
  });
}
