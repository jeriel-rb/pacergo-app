import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Tier } from './types';

export type CompanionDetail = {
  companion_id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  home_area: string | null;
  rating_avg: number;
  rating_count: number;
};

export type Offering = {
  id: string;
  activity_id: string;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
  description: string | null;
};

export function useCompanion(id: string) {
  return useQuery({
    queryKey: ['companion', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{ detail: CompanionDetail | null; offerings: Offering[] }> => {
      const { data: detailRows, error: e1 } = await supabase.rpc('get_companion', { p_id: id });
      if (e1) throw e1;
      const detail = ((detailRows as CompanionDetail[] | null)?.[0] ?? null);

      const { data: listing, error: e2 } = await supabase
        .from('companion_listings')
        .select('id')
        .eq('user_id', id)
        .maybeSingle();
      if (e2) throw e2;

      let offerings: Offering[] = [];
      if (listing?.id) {
        const { data: offs, error: e3 } = await supabase
          .from('listing_offerings')
          .select('id, activity_id, tier, price_ntd, is_free, session_minutes, description')
          .eq('listing_id', listing.id);
        if (e3) throw e3;
        offerings = (offs ?? []) as Offering[];
      }
      return { detail, offerings };
    },
  });
}
