import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type ListingPatch = {
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
};

/** Create/update the listing via RPC (also flags the user as a companion). */
export function useSaveListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ListingPatch): Promise<string> => {
      const { data, error } = await supabase.rpc('upsert_my_listing', {
        p_headline: patch.headline,
        p_bio_long: patch.bio_long,
        p_served_area: patch.served_area,
        p_status: patch.status,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myListing', uid] });
      qc.invalidateQueries({ queryKey: ['profile', uid] });
    },
  });
}
