import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Listing } from './types';
import type { Offering } from '@/features/discovery/useCompanion';

export function useMyListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['myListing', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<{ listing: Listing | null; offerings: Offering[] }> => {
      const { data: listing, error } = await supabase
        .from('companion_listings')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      let offerings: Offering[] = [];
      if (listing?.id) {
        const { data: offs, error: e2 } = await supabase
          .from('listing_offerings')
          .select('id, activity_id, tier, price_ntd, is_free, session_minutes, description')
          .eq('listing_id', listing.id);
        if (e2) throw e2;
        offerings = (offs ?? []) as Offering[];
      }
      return { listing: (listing ?? null) as Listing | null, offerings };
    },
  });
}
