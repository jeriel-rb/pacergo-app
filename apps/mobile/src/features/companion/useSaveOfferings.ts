import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { OfferingDraft } from './types';

export function useSaveOfferings() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      offerings,
    }: {
      listingId: string;
      offerings: OfferingDraft[];
    }) => {
      const { error: del } = await supabase
        .from('listing_offerings')
        .delete()
        .eq('listing_id', listingId);
      if (del) throw del;
      if (offerings.length > 0) {
        const { error } = await supabase
          .from('listing_offerings')
          .insert(offerings.map((o) => ({ ...o, listing_id: listingId })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myListing', uid] }),
  });
}
