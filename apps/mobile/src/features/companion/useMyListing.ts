import { useQuery } from '@tanstack/react-query';
import type { CompanionOffering } from '@pacergo/shared';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { AvailabilitySlot, Listing, VerificationMap } from './types';

export type MyListingBundle = {
  is_companion: boolean;
  listing: Listing | null;
  offerings: CompanionOffering[];
  availability: AvailabilitySlot[];
  /** Approved/pending certifications per activity slug. */
  verifications: VerificationMap;
  /** Approved/pending competition experience per activity slug (Tier A). */
  competitions: VerificationMap;
};

export function useMyListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['myListing', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<MyListingBundle> => {
      const { data, error } = await supabase.rpc('my_listing');
      if (error) throw error;
      const b = (data ?? {}) as Partial<MyListingBundle>;
      return {
        is_companion: b.is_companion ?? false,
        listing: b.listing ?? null,
        offerings: b.offerings ?? [],
        availability: b.availability ?? [],
        verifications: b.verifications ?? {},
        competitions: b.competitions ?? {},
      };
    },
  });
}
